"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Receipt, Search, RefreshCw } from "lucide-react";
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
import { expensesApi } from "@/lib/api";
import { formatCurrency, formatDate, getCurrentFY } from "@/lib/utils";

const CATS = [
  { value: "saas_tools", label: "SaaS Tools" },
  { value: "internet_phone", label: "Internet & Phone" },
  { value: "contractor_payments", label: "Contractor Payments" },
  { value: "travel", label: "Travel" },
  { value: "education", label: "Education" },
  { value: "hardware", label: "Hardware" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "professional_fees", label: "Professional Fees" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

const BLANK = {
  category: "saas_tools",
  description: "",
  amount: "",
  expense_date: new Date().toISOString().split("T")[0],
  is_recurring: false,
  recurring_frequency: "",
  business_percentage: 100,
  notes: "",
};

export default function ExpensesPage() {
  const [fy, setFy] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("fy") || getCurrentFY();
    return getCurrentFY();
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", fy],
    queryFn: () => expensesApi.list(fy),
    enabled: !!fy,
  });
  const expenses = data?.expenses || [];

  const filtered = expenses.filter((e) => {
    const matchCat = activeCategory === "all" || e.category === activeCategory;
    const matchSearch = e.description
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalExpenses = expenses.reduce(
    (s, e) =>
      s + (parseFloat(e.amount || 0) * parseFloat(e.business_percentage)) / 100,
    0,
  );

  const byCat = CATS.reduce((acc, c) => {
    const items = expenses.filter((e) => e.category === c.value);
    if (items.length > 0)
      acc[c.value] = {
        label: c.label,
        total: items.reduce(
          (s, e) =>
            s +
            (parseFloat(e.amount) * parseFloat(e.business_percentage)) / 100,
          0,
        ),
        count: items.length,
      };
    return acc;
  }, {});

  const addMutation = useMutation({
    mutationFn: (body) => expensesApi.create({ ...body, fy }),
    onSuccess: () => {
      qc.invalidateQueries(["expenses", fy]);
      qc.invalidateQueries(["dashboard", fy]);
      toast.success("Expense added");
      setOpen(false);
      setForm(BLANK);
    },
    onError: (err) => toast.error(err.message || "Failed to add"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => expensesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(["expenses", fy]);
      qc.invalidateQueries(["dashboard", fy]);
      toast.success("Expense deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  });

  const deductiblePreview =
    form.amount && form.business_percentage
      ? (parseFloat(form.amount) * parseFloat(form.business_percentage)) / 100
      : 0;

  function submit(e) {
    e.preventDefault();
    if (!form.description || !form.amount) {
      toast.error("Please fill in description and amount");
      return;
    }
    if (parseFloat(form.amount) <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    addMutation.mutate(form);
  }

  return (
    <AppShell currentPath="/expenses">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Expenses</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Track deductible business expenses for FY {fy?.replace("-", "–")}
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus size={15} /> Add Expense
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-5 flex items-center gap-4">
              <div className="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
                <Receipt size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Total Business Expenses</p>
                <p className="text-lg font-bold text-zinc-900 mt-0.5">
                  {formatCurrency(totalExpenses)}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {expenses.length} entries
                </p>
              </div>
            </CardContent>
          </Card>
          {Object.entries(byCat)
            .slice(0, 2)
            .map(([key, cat]) => (
              <Card key={key}>
                <CardContent className="pt-5 pb-5">
                  <p className="text-xs text-zinc-500 mb-1">{cat.label}</p>
                  <p className="text-lg font-bold text-zinc-900">
                    {formatCurrency(cat.total)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {cat.count} items
                  </p>
                </CardContent>
              </Card>
            ))}
        </div>

        {Object.keys(byCat).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>By Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`text-left rounded-lg border p-3 transition-colors ${activeCategory === "all" ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 hover:border-zinc-400"}`}
                >
                  <p
                    className={`text-xs font-medium ${activeCategory === "all" ? "text-zinc-300" : "text-zinc-500"}`}
                  >
                    All
                  </p>
                  <p
                    className={`text-sm font-bold mt-1 ${activeCategory === "all" ? "text-white" : "text-zinc-900"}`}
                  >
                    {formatCurrency(totalExpenses)}
                  </p>
                </button>
                {Object.entries(byCat).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() =>
                      setActiveCategory(activeCategory === key ? "all" : key)
                    }
                    className={`text-left rounded-lg border p-3 transition-colors ${activeCategory === key ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 hover:border-zinc-400"}`}
                  >
                    <p
                      className={`text-xs font-medium truncate ${activeCategory === key ? "text-zinc-300" : "text-zinc-500"}`}
                    >
                      {cat.label}
                    </p>
                    <p
                      className={`text-sm font-bold mt-1 ${activeCategory === key ? "text-white" : "text-zinc-900"}`}
                    >
                      {formatCurrency(cat.total)}
                    </p>
                    <p
                      className={`text-xs ${activeCategory === key ? "text-zinc-400" : "text-zinc-400"}`}
                    >
                      {cat.count} items
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                  placeholder="Search description…"
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
                {search || activeCategory !== "all"
                  ? "No results for this filter"
                  : "No expenses logged yet — add your first one"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Business %</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => {
                    const biz =
                      (parseFloat(e.amount) *
                        parseFloat(e.business_percentage)) /
                      100;
                    const catLabel =
                      CATS.find((c) => c.value === e.category)?.label ||
                      e.category;
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <p className="font-medium text-zinc-900">
                            {e.description}
                          </p>
                          {e.is_recurring && (
                            <Badge variant="secondary" className="mt-1">
                              <RefreshCw size={10} /> {e.recurring_frequency}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{catLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-zinc-500">
                          {formatDate(e.expense_date)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-sm ${e.business_percentage < 100 ? "text-amber-600 font-medium" : "text-zinc-600"}`}
                          >
                            {e.business_percentage}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-semibold text-zinc-900">
                            {formatCurrency(biz)}
                          </p>
                          {e.business_percentage < 100 && (
                            <p className="text-xs text-zinc-400">
                              of {formatCurrency(e.amount)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => {
                              if (confirm("Delete this expense?"))
                                deleteMutation.mutate(e.id);
                            }}
                            className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogClose onClose={() => setOpen(false)} />
          </DialogHeader>
          <form onSubmit={submit}>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                  >
                    {CATS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Description *</Label>
                  <Input
                    required
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="e.g. Adobe Creative Cloud"
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
                      setForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Expense Date *</Label>
                  <Input
                    required
                    type="date"
                    value={form.expense_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expense_date: e.target.value }))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>
                    Business Use %{" "}
                    <span className="text-zinc-400">(deductible portion)</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={form.business_percentage}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        business_percentage: e.target.value,
                      }))
                    }
                  />
                  {form.amount && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Deductible: {formatCurrency(deductiblePreview)}
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-lg p-3 cursor-pointer hover:border-zinc-300">
                    <input
                      type="checkbox"
                      checked={form.is_recurring}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          is_recurring: e.target.checked,
                        }))
                      }
                      className="rounded border-zinc-300"
                    />
                    <p className="text-sm font-medium text-zinc-900">
                      This is a recurring expense
                    </p>
                  </label>
                </div>
                {form.is_recurring && (
                  <div className="col-span-2">
                    <Label>Frequency</Label>
                    <Select
                      value={form.recurring_frequency}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          recurring_frequency: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select frequency</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </Select>
                  </div>
                )}
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
                {addMutation.isPending ? "Adding…" : "Add Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
