"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { taxApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function TaxPage() {
  const [fy, setFy] = useState("2024-2025");
  useEffect(() => {
    if (typeof window !== "undefined")
      setFy(localStorage.getItem("fy") || "2024-2025");
  }, []);

  const {
    data: tax,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tax", fy],
    queryFn: () => taxApi.estimate(fy),
    enabled: !!fy,
  });

  const usePresumptive = tax?.recommended_route === "presumptive";
  const selectedNetTax = usePresumptive
    ? tax?.net_tax_presumptive || 0
    : tax?.net_tax_actual || 0;
  const selectedTax = usePresumptive
    ? tax?.tax_on_presumptive || 0
    : tax?.tax_on_actual || 0;

  const today = new Date();
  const fyYear = fy ? parseInt(fy.split("-")[0]) : 2024;
  const instalments = [
    { num: 1, pct: 15, due: `${fyYear}-06-15`, label: "Q1 — Jun 15" },
    { num: 2, pct: 45, due: `${fyYear}-09-15`, label: "Q2 — Sep 15" },
    { num: 3, pct: 75, due: `${fyYear}-12-15`, label: "Q3 — Dec 15" },
    { num: 4, pct: 100, due: `${fyYear + 1}-03-15`, label: "Q4 — Mar 15" },
  ];

  return (
    <AppShell currentPath="/tax">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Tax Planner</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Estimated tax liability for FY {fy?.replace("-", "–")}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6 space-y-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-zinc-400">
              Failed to load tax data. Make sure you have added income entries
              first.
            </CardContent>
          </Card>
        ) : (
          <>
            {tax?.eligible_44ada && (
              <div className="flex items-start gap-4 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <CheckCircle2
                  size={20}
                  className="text-emerald-600 shrink-0 mt-0.5"
                />
                <div>
                  <p className="font-semibold text-emerald-900 text-sm">
                    You're eligible for Section 44ADA (Presumptive Taxation)
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    50% of gross receipts (
                    {formatCurrency(tax?.presumptive_income)}) is treated as
                    income.{" "}
                    {usePresumptive
                      ? `This saves you ${formatCurrency(Math.abs((tax?.tax_on_actual || 0) - (tax?.tax_on_presumptive || 0)))} vs. actual expense method.`
                      : "Actual method is more beneficial this year."}
                  </p>
                </div>
              </div>
            )}

            {/* Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "Actual Expense Method",
                  recommended: !usePresumptive,
                  rows: [
                    {
                      label: "Gross Receipts",
                      value: formatCurrency(tax?.gross_receipts),
                    },
                    {
                      label: "Actual Expenses",
                      value: `– ${formatCurrency(tax?.total_expenses)}`,
                    },
                    {
                      label: "Taxable Income",
                      value: formatCurrency(tax?.actual_income),
                      bold: true,
                    },
                    {
                      label: "Tax Payable",
                      value: formatCurrency(tax?.tax_on_actual),
                      bold: true,
                    },
                  ],
                },
                {
                  title: "Presumptive Method (§44ADA)",
                  recommended: usePresumptive,
                  disabled: !tax?.eligible_44ada,
                  rows: [
                    {
                      label: "Gross Receipts",
                      value: formatCurrency(tax?.gross_receipts),
                    },
                    {
                      label: "Presumed Profit (50%)",
                      value: formatCurrency(tax?.presumptive_income),
                    },
                    {
                      label: "Taxable Income",
                      value: formatCurrency(tax?.presumptive_income),
                      bold: true,
                    },
                    {
                      label: "Tax Payable",
                      value: formatCurrency(tax?.tax_on_presumptive),
                      bold: true,
                    },
                  ],
                },
              ].map(({ title, recommended, disabled, rows }) => (
                <Card
                  key={title}
                  className={
                    recommended
                      ? "ring-2 ring-zinc-900"
                      : disabled
                        ? "opacity-50"
                        : ""
                  }
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{title}</CardTitle>
                      {recommended && <Badge>Recommended</Badge>}
                      {disabled && !recommended && (
                        <Badge variant="secondary">Not Eligible</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {rows.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-zinc-500">{row.label}</span>
                        <span
                          className={
                            row.bold
                              ? "font-bold text-zinc-900"
                              : "font-medium text-zinc-700"
                          }
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Net Tax Summary */}
            <Card className="bg-zinc-900 border-zinc-900">
              <CardContent className="pt-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-white">
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">
                      Gross Tax ({usePresumptive ? "Presumptive" : "Actual"})
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(selectedTax)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">
                      TDS Already Deducted
                    </p>
                    <p className="text-2xl font-bold text-emerald-400">
                      – {formatCurrency(tax?.tds_deducted)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">
                      Advance Tax to Pay
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(selectedNetTax)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      ≈ {formatCurrency(selectedNetTax / 12)}/month reserve
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advance Tax Schedule */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Advance Tax Instalments</CardTitle>
                <CardDescription>
                  Based on{" "}
                  {usePresumptive ? "presumptive (§44ADA)" : "actual expense"}{" "}
                  method
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {instalments.map((inst) => {
                  const amount = (selectedNetTax * inst.pct) / 100;
                  const isPast = new Date(inst.due) < today;
                  const isNext =
                    !isPast &&
                    instalments.find((i) => new Date(i.due) >= today)?.num ===
                      inst.num;
                  return (
                    <div
                      key={inst.num}
                      className={`flex items-center justify-between rounded-lg border p-4 ${isNext ? "bg-zinc-900 border-zinc-900 text-white" : isPast ? "bg-zinc-50 border-zinc-100" : "bg-white border-zinc-200"}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${isNext ? "bg-zinc-800 text-white" : isPast ? "bg-zinc-200 text-zinc-400" : "bg-zinc-100 text-zinc-700"}`}
                        >
                          {inst.pct}%
                        </div>
                        <div>
                          <p
                            className={`text-sm font-semibold ${isNext ? "text-white" : isPast ? "text-zinc-400" : "text-zinc-900"}`}
                          >
                            {inst.label}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {isPast && (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                Past due
                              </Badge>
                            )}
                            {isNext && (
                              <Badge className="bg-white text-zinc-900 text-[10px]">
                                Next due
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <p
                        className={`text-lg font-bold ${isNext ? "text-white" : isPast ? "text-zinc-400" : "text-zinc-900"}`}
                      >
                        {formatCurrency(amount)}
                      </p>
                    </div>
                  );
                })}
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle
                    size={14}
                    className="text-amber-600 shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-amber-800">
                    Interest under Sections 234B/234C applies for shortfall or
                    delay. Ensure instalments are paid on time.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* TDS Summary */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>TDS Credits</CardTitle>
                  <a
                    href="/compliance"
                    className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
                  >
                    Reconcile in Compliance <ArrowRight size={12} />
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">
                      Total TDS deducted this FY
                    </p>
                    <p className="text-2xl font-bold text-zinc-900">
                      {formatCurrency(tax?.tds_deducted)}
                    </p>
                  </div>
                  {tax?.tds_deducted > 0 && (
                    <Badge variant="success">Verified</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
