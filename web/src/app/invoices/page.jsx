"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { invoicesApi } from "@/lib/api";
import { formatCurrency, formatDate, getCurrentFY } from "@/lib/utils";

const STATUS_BADGE = {
  unpaid: "warning",
  paid: "success",
  overdue: "danger",
  cancelled: "secondary",
};

function genInvoiceNumber(count) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `INV-${yy}${mm}-${String(count + 1).padStart(3, "0")}`;
}

const BLANK = {
  invoice_number: "",
  client_name: "",
  description: "",
  amount: "",
  gst_applied: false,
  invoice_date: new Date().toISOString().split("T")[0],
  due_date: "",
  notes: "",
};

export default function InvoicesPage() {
  const [fy, setFy] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("fy") || getCurrentFY();
    return getCurrentFY();
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", fy],
    queryFn: () => invoicesApi.list(fy),
    enabled: !!fy,
  });
  const invoices = data?.invoices || [];
  const filtered = invoices.filter(
    (i) =>
      i.client_name.toLowerCase().includes(search.toLowerCase()) ||
      i.invoice_number.toLowerCase().includes(search.toLowerCase()),
  );

  const totalBilled = invoices.reduce(
    (s, i) => s + parseFloat(i.total_amount || 0),
    0,
  );
  const totalPaid = invoices
    .filter((i) => i.payment_status === "paid")
    .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const totalUnpaid = invoices
    .filter((i) => i.payment_status === "unpaid")
    .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);

  const createMutation = useMutation({
    mutationFn: (body) => invoicesApi.create({ ...body, fy }),
    onSuccess: () => {
      qc.invalidateQueries(["invoices", fy]);
      qc.invalidateQueries(["dashboard", fy]);
      toast.success("Invoice created");
      setOpen(false);
      setForm(BLANK);
    },
    onError: (err) => toast.error(err.message || "Failed to create"),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id) => invoicesApi.update({ id, payment_status: "paid" }),
    onSuccess: () => {
      qc.invalidateQueries(["invoices", fy]);
      qc.invalidateQueries(["dashboard", fy]);
      toast.success("Invoice marked as paid");
    },
    onError: (err) => toast.error(err.message || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => invoicesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(["invoices", fy]);
      qc.invalidateQueries(["dashboard", fy]);
      toast.success("Invoice deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  });

  function openNew() {
    setForm({ ...BLANK, invoice_number: genInvoiceNumber(invoices.length) });
    setOpen(true);
  }
  const gstAmount = form.gst_applied ? parseFloat(form.amount || 0) * 0.18 : 0;
  const total = parseFloat(form.amount || 0) + gstAmount;
  function submit(e) {
    e.preventDefault();
    if (!form.client_name || !form.amount) {
      toast.error("Please fill in client name and amount");
      return;
    }
    if (parseFloat(form.amount) <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    createMutation.mutate(form);
  }

  return (
    <AppShell currentPath="/invoices">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Invoices</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Create, track and manage your invoices
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus size={15} /> New Invoice
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Total Billed",
              value: formatCurrency(totalBilled),
              icon: FileText,
            },
            {
              label: "Collected",
              value: formatCurrency(totalPaid),
              icon: CheckCircle2,
            },
            {
              label: "Outstanding",
              value: formatCurrency(totalUnpaid),
              icon: Clock,
            },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="pt-5 pb-5 flex items-center gap-4">
                <div className="w-9 h-9 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-zinc-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className="text-lg font-bold text-zinc-900 mt-0.5">
                    {value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <CardTitle className="flex-1">
                All Invoices ({filtered.length})
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search client or number…"
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={4} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-zinc-400">
                {search
                  ? "No results found"
                  : "No invoices yet — create your first one"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs text-zinc-600">
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-zinc-900">
                          {inv.client_name}
                        </p>
                        {inv.description && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {inv.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {formatDate(inv.invoice_date)}
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {formatDate(inv.due_date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            STATUS_BADGE[inv.payment_status] || "secondary"
                          }
                        >
                          {inv.payment_status}
                        </Badge>
                        {inv.gst_applied && (
                          <Badge variant="info" className="ml-1.5">
                            GST
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-semibold text-zinc-900">
                          {formatCurrency(inv.total_amount)}
                        </p>
                        {inv.gst_applied && (
                          <p className="text-xs text-zinc-400">
                            + {formatCurrency(inv.gst_amount)} GST
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {inv.payment_status === "unpaid" && (
                            <button
                              onClick={() => markPaidMutation.mutate(inv.id)}
                              disabled={markPaidMutation.isPending}
                              className="p-1.5 text-zinc-400 hover:text-emerald-600 transition-colors"
                              title="Mark as paid"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm("Delete this invoice?"))
                                deleteMutation.mutate(inv.id);
                            }}
                            className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
            <DialogClose onClose={() => setOpen(false)} />
          </DialogHeader>
          <form onSubmit={submit}>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Invoice Number</Label>
                  <Input
                    value={form.invoice_number}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        invoice_number: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Invoice Date *</Label>
                  <Input
                    required
                    type="date"
                    value={form.invoice_date}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        invoice_date: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>Client Name *</Label>
                  <Input
                    required
                    value={form.client_name}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        client_name: e.target.value,
                      }))
                    }
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Services rendered…"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Amount (₹) *</Label>
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        amount: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        due_date: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-lg p-3 cursor-pointer hover:border-zinc-300">
                    <input
                      type="checkbox"
                      checked={form.gst_applied}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          gst_applied: e.target.checked,
                        }))
                      }
                      className="rounded border-zinc-300"
                    />
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        Apply GST (18%)
                      </p>
                      {form.gst_applied && form.amount && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          + {formatCurrency(gstAmount)} GST → Total:{" "}
                          {formatCurrency(total)}
                        </p>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
