"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Receipt,
  Wallet,
  AlertTriangle,
  Calendar,
  FileText,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { dashboardApi, gstApi, taxApi } from "@/lib/api";
import { formatCurrency, getCurrentFY } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, sub, loading, dark }) {
  return (
    <Card className={dark ? "bg-zinc-900 border-zinc-900" : ""}>
      <CardContent className="pt-5 pb-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className={dark ? "bg-zinc-800 h-4 w-24" : "h-4 w-24"} />
            <Skeleton className={dark ? "bg-zinc-800 h-8 w-36" : "h-8 w-36"} />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-zinc-800" : "bg-zinc-100"}`}
              >
                <Icon
                  size={15}
                  className={dark ? "text-zinc-300" : "text-zinc-600"}
                />
              </div>
              <span
                className={`text-xs font-medium ${dark ? "text-zinc-400" : "text-zinc-500"}`}
              >
                {label}
              </span>
            </div>
            <p
              className={`text-2xl font-bold tracking-tight ${dark ? "text-white" : "text-zinc-900"}`}
            >
              {value}
            </p>
            {sub && (
              <p
                className={`text-xs mt-1 ${dark ? "text-zinc-500" : "text-zinc-400"}`}
              >
                {sub}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const GST_COLORS = {
  safe: { bar: "bg-emerald-500", badge: "success", label: "Safe" },
  warning: { bar: "bg-amber-500", badge: "warning", label: "Warning — 70%" },
  critical: { bar: "bg-orange-500", badge: "warning", label: "Critical — 85%" },
  exceeded: { bar: "bg-red-500", badge: "danger", label: "Threshold Exceeded" },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [fy, setFy] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("fy") || getCurrentFY();
    return getCurrentFY();
  });

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard", fy],
    queryFn: () => dashboardApi.get(fy),
    enabled: !!fy,
  });
  const { data: gst, isLoading: gstLoading } = useQuery({
    queryKey: ["gst", fy],
    queryFn: () => gstApi.status(fy),
    enabled: !!fy,
  });
  const { data: tax, isLoading: taxLoading } = useQuery({
    queryKey: ["tax", fy],
    queryFn: () => taxApi.estimate(fy),
    enabled: !!fy,
  });

  const gstStatus = gst?.alert_status || "safe";
  const gstColor = GST_COLORS[gstStatus] || GST_COLORS.safe;
  const gstPct = gst?.percentage || 0;
  const monthlyReserve = (tax?.net_tax_actual || 0) / 12;
  const fyYear = fy ? parseInt(fy.split("-")[0]) : 2024;
  const advanceTaxDates = [
    { label: "1st (15%)", date: "Jun 15", dueStr: `${fyYear}-06-15` },
    { label: "2nd (45%)", date: "Sep 15", dueStr: `${fyYear}-09-15` },
    { label: "3rd (75%)", date: "Dec 15", dueStr: `${fyYear}-12-15` },
    { label: "4th (100%)", date: "Mar 15", dueStr: `${fyYear + 1}-03-15` },
  ];
  const today = new Date();
  const nextDue = advanceTaxDates.find((d) => new Date(d.dueStr) >= today);

  return (
    <AppShell currentPath="/dashboard">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Overview</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              FY {fy?.replace("-", "–")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/income")}
            >
              <TrendingUp size={14} /> Add Income
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/invoices")}
            >
              <FileText size={14} /> New Invoice
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Gross Income"
            value={formatCurrency(dash?.total_income)}
            sub={`${dash?.income_count || 0} entries`}
            loading={dashLoading}
            dark
          />
          <StatCard
            icon={Receipt}
            label="Business Expenses"
            value={formatCurrency(dash?.total_expenses)}
            sub={`${dash?.expense_count || 0} logged`}
            loading={dashLoading}
          />
          <StatCard
            icon={Wallet}
            label="Net Income"
            value={formatCurrency(dash?.net_income)}
            sub="After deductions"
            loading={dashLoading}
          />
          <StatCard
            icon={Calendar}
            label="Monthly Tax Reserve"
            value={formatCurrency(monthlyReserve)}
            sub="Recommended set-aside"
            loading={taxLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>GST Threshold Monitor</CardTitle>
                {!gstLoading && (
                  <Badge variant={gstColor.badge}>{gstColor.label}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {gstLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-2.5 w-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-2xl font-bold text-zinc-900">
                      {formatCurrency(gst?.turnover)}
                    </span>
                    <span className="text-sm text-zinc-500">
                      of {formatCurrency(gst?.threshold)}
                    </span>
                  </div>
                  <Progress
                    value={gstPct}
                    indicatorClassName={gstColor.bar}
                    className="h-2.5 mb-2"
                  />
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>{gstPct.toFixed(1)}% used</span>
                    <span>
                      {formatCurrency(
                        (gst?.threshold || 0) - (gst?.turnover || 0),
                      )}{" "}
                      remaining
                    </span>
                  </div>
                  {gstStatus !== "safe" && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                      {gstStatus === "exceeded"
                        ? "You've crossed the GST threshold. Register for GST immediately to avoid penalties."
                        : "You're approaching the GST threshold. Consider registering soon."}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Tax Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              {taxLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    {
                      label: "Gross Receipts",
                      value: formatCurrency(tax?.gross_receipts),
                    },
                    {
                      label: "Business Expenses",
                      value: `– ${formatCurrency(tax?.total_expenses)}`,
                      muted: true,
                    },
                    {
                      label: "Taxable Income (Actual)",
                      value: formatCurrency(tax?.actual_income),
                    },
                    {
                      label: "TDS Already Deducted",
                      value: `– ${formatCurrency(tax?.tds_deducted)}`,
                      muted: true,
                    },
                    {
                      label: "Estimated Tax Due",
                      value: formatCurrency(tax?.net_tax_actual),
                      bold: true,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span
                        className={
                          row.muted ? "text-zinc-400" : "text-zinc-600"
                        }
                      >
                        {row.label}
                      </span>
                      <span
                        className={
                          row.bold
                            ? "font-bold text-zinc-900"
                            : row.muted
                              ? "text-zinc-400"
                              : "font-medium text-zinc-900"
                        }
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                  {tax?.eligible_44ada && (
                    <div className="pt-3 border-t border-zinc-100">
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <CheckCircle2
                          size={13}
                          className="text-emerald-600 shrink-0"
                        />
                        <span className="text-xs text-emerald-800">
                          Section 44ADA eligible — potential tax saving
                          available
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="pt-1">
                    <a
                      href="/tax"
                      className="text-xs font-medium text-zinc-900 hover:underline flex items-center gap-1"
                    >
                      View full tax planner <ArrowRight size={12} />
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {dashLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Total</span>
                    <span className="font-semibold text-zinc-900">
                      {dash?.invoice_stats?.total || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-zinc-500">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      Unpaid
                    </span>
                    <span className="font-semibold text-amber-600">
                      {dash?.invoice_stats?.unpaid || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-zinc-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Paid
                    </span>
                    <span className="font-semibold text-emerald-600">
                      {dash?.invoice_stats?.paid || 0}
                    </span>
                  </div>
                  <a
                    href="/invoices"
                    className="flex items-center gap-1 text-xs font-medium text-zinc-900 hover:underline pt-2"
                  >
                    Manage invoices <ArrowRight size={12} />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle>Advance Tax Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {advanceTaxDates.map((item, i) => {
                  const isPast = new Date(item.dueStr) < today;
                  const isNext = nextDue?.label === item.label;
                  return (
                    <div
                      key={i}
                      className={`rounded-lg p-3 text-sm border ${isNext ? "bg-zinc-900 text-white border-zinc-900" : isPast ? "bg-zinc-50 text-zinc-400 border-zinc-100" : "bg-white text-zinc-700 border-zinc-200"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {isPast ? (
                          <CheckCircle2
                            size={12}
                            className="text-emerald-500"
                          />
                        ) : isNext ? (
                          <Clock size={12} />
                        ) : (
                          <Calendar size={12} />
                        )}
                        <span className="text-xs font-semibold">
                          {item.date}
                        </span>
                      </div>
                      <p className="text-[10px] leading-tight opacity-70">
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>
              <a
                href="/tax"
                className="flex items-center gap-1 text-xs font-medium text-zinc-900 hover:underline"
              >
                View instalment amounts <ArrowRight size={12} />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
