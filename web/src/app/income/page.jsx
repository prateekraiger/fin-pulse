"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, TrendingUp, ArrowUpRight, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
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
import { incomeApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

const SOURCE_LABELS = {
  freelance: "Freelance Project",
  retainer: "Retainer",
  affiliate: "Affiliate",
  referral: "Referral",
  brand_deal: "Brand Deal",
  digital_products: "Digital Products",
};
const STATUS_BADGE = {
  received: "success",
  pending: "warning",
  overdue: "danger",
};
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD"];
const RATES = {
  INR: 1,
  USD: 83.12,
  EUR: 90.45,
  GBP: 105.23,
  AUD: 54.2,
  CAD: 61.5,
  SGD: 61.9,
};
const BLANK = {
  source_type: "freelance",
  client_name: "",
  description: "",
  amount: "",
  currency: "INR",
  exchange_rate: "1",
  payment_status: "received",
  settlement_date: new Date().toISOString().split("T")[0],
};

export default function IncomePage() {
  const [fy, setFy] = useState("2024-2025");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window !== "undefined")
      setFy(localStorage.getItem("fy") || "2024-2025");
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["income", fy],
    queryFn: () => incomeApi.list(fy),
    enabled: !!fy,
  });
  const entries = data?.entries || [];
  const filtered = entries.filter(
    (e) =>
      e.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (e.description || "").toLowerCase().includes(search.toLowerCase()),
  );

  const totalIncome = entries.reduce(
    (s, e) => s + parseFloat(e.inr_amount || 0),
    0,
  );
  const received = entries
    .filter((e) => e.payment_status === "received")
    .reduce((s, e) => s + parseFloat(e.inr_amount || 0), 0);
  const pending = entries
    .filter((e) => e.payment_status !== "received")
    .reduce((s, e) => s + parseFloat(e.inr_amount || 0), 0);

  const addMutation = useMutation({
    mutationFn: (body) => incomeApi.create({ ...body, fy }),
    onSuccess: () => {
      qc.invalidateQueries(["income", fy]);
      qc.invalidateQueries(["dashboard", fy]);
      toast.success("Income entry added");
      setOpen(false);
      setForm(BLANK);
    },
    onError: (err) => toast.error(err.message || "Failed to add entry"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => incomeApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(["income", fy]);
      qc.invalidateQueries(["dashboard", fy]);
      toast.success("Entry deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  });

  const inrPreview =
    form.amount && form.exchange_rate
      ? parseFloat(form.amount) * parseFloat(form.exchange_rate)
      : 0;

  function submit(e) {
    e.preventDefault();
    if (!form.client_name || !form.amount) return;
    addMutation.mutate(form);
  }

  return (
    <AppShell currentPath="/income">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Income</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Track all your earnings for FY {fy?.replace("-", "–")}
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus size={15} /> Add Income
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Income", value: formatCurrency(totalIncome) },
            { label: "Received", value: formatCurrency(received) },
            { label: "Pending / Overdue", value: formatCurrency(pending) },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-5 pb-5 flex items-center gap-4">
                <div className="w-9 h-9 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
                  <TrendingUp size={16} className="text-zinc-600" />
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
                Entries ({filtered.length})
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search client…"
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
                  : "No income entries yet — add your first one"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client / Source</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount (INR)</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <p className="font-medium text-zinc-900">
                          {e.client_name}
                        </p>
                        {e.description && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {e.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {SOURCE_LABELS[e.source_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {formatDate(e.settlement_date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            STATUS_BADGE[e.payment_status] || "secondary"
                          }
                        >
                          {e.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-semibold text-zinc-900">
                          {formatCurrency(e.inr_amount)}
                        </p>
                        {e.currency !== "INR" && (
                          <p className="text-xs text-zinc-400">
                            {e.currency} {parseFloat(e.amount).toFixed(2)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => {
                            if (confirm("Delete this entry?"))
                              deleteMutation.mutate(e.id);
                          }}
                          className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
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
            <DialogTitle>Add Income Entry</DialogTitle>
            <DialogClose onClose={() => setOpen(false)} />
          </DialogHeader>
          <form onSubmit={submit}>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Source Type</Label>
                  <Select
                    value={form.source_type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, source_type: e.target.value }))
                    }
                  >
                    {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Client / Source Name *</Label>
                  <Input
                    required
                    value={form.client_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, client_name: e.target.value }))
                    }
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Website redesign project"
                  />
                </div>
                <div>
                  <Label>Amount *</Label>
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select
                    value={form.currency}
                    onChange={(e) => {
                      const currency = e.target.value;
                      setForm((f) => ({
                        ...f,
                        currency,
                        exchange_rate: String(RATES[currency] || 1),
                      }));
                    }}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
                {form.currency !== "INR" && (
                  <>
                    <div>
                      <Label>Exchange Rate (1 {form.currency} = ? INR)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={form.exchange_rate}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            exchange_rate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-end pb-0.5">
                      <div className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2 text-sm text-zinc-700">
                        ≈ {formatCurrency(inrPreview)} INR
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <Label>Settlement Date *</Label>
                  <Input
                    required
                    type="date"
                    value={form.settlement_date}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        settlement_date: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Select
                    value={form.payment_status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        payment_status: e.target.value,
                      }))
                    }
                  >
                    <option value="received">Received</option>
                    <option value="pending">Pending</option>
                    <option value="overdue">Overdue</option>
                  </Select>
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
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Adding…" : "Add Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
