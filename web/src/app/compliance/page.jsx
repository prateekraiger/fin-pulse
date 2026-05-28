"use client";
import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Calendar,
  AlertTriangle,
  FileText,
  ExternalLink,
  Info,
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const TASKS = [
  {
    id: "form_26as",
    title: "Download Form 26AS",
    desc: "Verify TDS credits from all income sources via the IT portal",
    due: "Before ITR filing",
    link: "https://www.incometax.gov.in/iec/foportal/",
    type: "itr_filing",
  },
  {
    id: "tds_recon",
    title: "Reconcile TDS entries",
    desc: "Match Form 26AS data with your income records logged here",
    due: "Before ITR filing",
    type: "tds_reconciliation",
  },
  {
    id: "gst_check",
    title: "Assess GST registration need",
    desc: "Confirm if aggregate turnover has crossed ₹20L (₹10L for special states)",
    due: "Ongoing",
    type: "gst_filing",
  },
  {
    id: "at_q1",
    title: "Advance Tax — Q1 (15%)",
    desc: "Pay 15% of estimated annual tax liability",
    due: "15 Jun 2024",
    dueDate: "2024-06-15",
    type: "advance_tax",
  },
  {
    id: "at_q2",
    title: "Advance Tax — Q2 (45%)",
    desc: "Cumulative 45% of estimated annual tax liability",
    due: "15 Sep 2024",
    dueDate: "2024-09-15",
    type: "advance_tax",
  },
  {
    id: "at_q3",
    title: "Advance Tax — Q3 (75%)",
    desc: "Cumulative 75% of estimated annual tax liability",
    due: "15 Dec 2024",
    dueDate: "2024-12-15",
    type: "advance_tax",
  },
  {
    id: "at_q4",
    title: "Advance Tax — Q4 (100%)",
    desc: "Final payment — 100% of estimated annual tax",
    due: "15 Mar 2025",
    dueDate: "2025-03-15",
    type: "advance_tax",
  },
  {
    id: "itr_filing",
    title: "File Income Tax Return",
    desc: "File ITR-3 (actual expenses) or ITR-4 (Section 44ADA)",
    due: "31 Jul 2025",
    dueDate: "2025-07-31",
    link: "https://www.incometax.gov.in/iec/foportal/",
    type: "itr_filing",
  },
];

const ITR_ROUTES = [
  {
    form: "ITR-4 (Sugam)",
    method: "Section 44ADA — Presumptive",
    desc: "For eligible professionals with gross receipts ≤ ₹75L (digital receipts) or ≤ ₹50L (cash)",
    docs: [
      "Gross receipts summary",
      "Proof of majority digital receipts (for ₹75L limit)",
      "Form 26AS TDS credits",
      "Bank statements",
    ],
  },
  {
    form: "ITR-3",
    method: "Actual Expense Method",
    desc: "For professionals maintaining books of accounts with detailed P&L",
    docs: [
      "Complete P&L statement",
      "Balance sheet",
      "Detailed expense receipts & invoices",
      "Form 26AS reconciliation",
      "Bank statements for all accounts",
    ],
  },
];

export default function CompliancePage() {
  const [done, setDone] = useState(new Set());

  function toggle(id) {
    setDone((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const today = new Date();
  function isOverdue(dueDate) {
    if (!dueDate) return false;
    return new Date(dueDate) < today;
  }

  const progress = Math.round((done.size / TASKS.length) * 100);

  return (
    <AppShell currentPath="/compliance">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Compliance</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              FY 2024-2025 checklist and ITR guidance
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-1">
              {done.size} of {TASKS.length} tasks done
            </p>
            <Progress value={progress} className="w-40 h-2" />
          </div>
        </div>

        {/* Checklist */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Compliance Checklist</CardTitle>
            <CardDescription>
              Track key milestones for a clean year-end filing
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-50">
              {TASKS.map((task) => {
                const isDone = done.has(task.id);
                const overdue = !isDone && isOverdue(task.dueDate);
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-start gap-4 px-6 py-4 hover:bg-zinc-50/60 transition-colors",
                      isDone && "bg-zinc-50/40",
                    )}
                  >
                    <button
                      onClick={() => toggle(task.id)}
                      className="mt-0.5 shrink-0 text-zinc-300 hover:text-zinc-900 transition-colors"
                    >
                      {isDone ? (
                        <CheckCircle2 size={20} className="text-emerald-500" />
                      ) : (
                        <Circle size={20} />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            isDone
                              ? "text-zinc-400 line-through"
                              : "text-zinc-900",
                          )}
                        >
                          {task.title}
                        </span>
                        {overdue && <Badge variant="danger">Overdue</Badge>}
                        {task.type === "advance_tax" && !overdue && !isDone && (
                          <Badge variant="info">Tax</Badge>
                        )}
                      </div>
                      <p
                        className={cn(
                          "text-xs",
                          isDone ? "text-zinc-400" : "text-zinc-500",
                        )}
                      >
                        {task.desc}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <Calendar size={11} />
                          {task.due}
                        </span>
                        {task.link && (
                          <a
                            href={task.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-zinc-900 font-medium hover:underline"
                          >
                            <ExternalLink size={11} />
                            IT Portal
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ITR Route Guidance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Which ITR form should you file?</CardTitle>
            <CardDescription>Based on your taxation method</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ITR_ROUTES.map((route, i) => (
              <div key={i} className="border border-zinc-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="default">{route.form}</Badge>
                    </div>
                    <p className="font-semibold text-zinc-900 text-sm">
                      {route.method}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{route.desc}</p>
                  </div>
                </div>
                <Separator className="my-3" />
                <p className="text-xs font-medium text-zinc-500 mb-2">
                  Required documents
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {route.docs.map((doc, j) => (
                    <div
                      key={j}
                      className="flex items-center gap-2 text-xs text-zinc-700"
                    >
                      <div className="w-1 h-1 rounded-full bg-zinc-400 shrink-0" />
                      {doc}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Form 26AS */}
        <Card className="bg-zinc-900 border-zinc-900 text-white">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                <Info size={18} className="text-zinc-300" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white mb-2">About Form 26AS</p>
                <div className="space-y-2 text-sm text-zinc-400">
                  <p>
                    Form 26AS is your annual tax credit statement — it shows all
                    TDS deducted on your payments by clients, platforms, and
                    others.
                  </p>
                  <p>
                    Any mismatch between your income records and Form 26AS can
                    delay ITR processing or trigger a notice. Reconcile before
                    filing.
                  </p>
                </div>
                <a
                  href="https://www.incometax.gov.in/iec/foportal/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 bg-white text-zinc-900 text-sm font-medium rounded-lg px-4 py-2 hover:bg-zinc-100 transition-colors"
                >
                  <ExternalLink size={14} /> Open e-Filing Portal
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
