"use client";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Zap, ArrowRight, CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn, getFYOptions } from "@/lib/utils";

const STATES = [
  { name: "Andhra Pradesh", category: "normal" },
  { name: "Arunachal Pradesh", category: "special" },
  { name: "Assam", category: "special" },
  { name: "Bihar", category: "normal" },
  { name: "Chhattisgarh", category: "normal" },
  { name: "Delhi", category: "normal" },
  { name: "Goa", category: "normal" },
  { name: "Gujarat", category: "normal" },
  { name: "Haryana", category: "normal" },
  { name: "Himachal Pradesh", category: "special" },
  { name: "Jammu & Kashmir", category: "special" },
  { name: "Jharkhand", category: "normal" },
  { name: "Karnataka", category: "normal" },
  { name: "Kerala", category: "normal" },
  { name: "Madhya Pradesh", category: "normal" },
  { name: "Maharashtra", category: "normal" },
  { name: "Manipur", category: "special" },
  { name: "Meghalaya", category: "special" },
  { name: "Mizoram", category: "special" },
  { name: "Nagaland", category: "special" },
  { name: "Odisha", category: "normal" },
  { name: "Punjab", category: "normal" },
  { name: "Rajasthan", category: "normal" },
  { name: "Sikkim", category: "special" },
  { name: "Tamil Nadu", category: "normal" },
  { name: "Telangana", category: "normal" },
  { name: "Tripura", category: "special" },
  { name: "Uttar Pradesh", category: "normal" },
  { name: "Uttarakhand", category: "special" },
  { name: "West Bengal", category: "normal" },
];

const PROFILES = [
  {
    type: "freelancer",
    title: "Freelancer",
    desc: "Independent contractor — web dev, design, writing, marketing",
    icon: "💻",
  },
  {
    type: "creator",
    title: "Creator",
    desc: "YouTuber, influencer, blogger — brand deals & affiliate income",
    icon: "🎥",
  },
  {
    type: "consultant",
    title: "Consultant",
    desc: "Professional advisor — strategy, finance, legal, HR",
    icon: "📊",
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const fyOptions = getFYOptions();
  const [form, setForm] = useState({
    profile_type: "",
    state: "",
    state_category: "",
    service_type: "",
    digital_receipts_majority: false,
    current_fy: getFYOptions()[0]?.value || "2025-2026",
  });
  const selectedState = STATES.find((s) => s.name === form.state);

  function pickState(name) {
    const s = STATES.find((x) => x.name === name);
    setForm((f) => ({
      ...f,
      state: name,
      state_category: s ? s.category : "",
    }));
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "demo-user",
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Profile set up!");
      if (typeof window !== "undefined") {
        localStorage.setItem("fy", form.current_fy);
      }
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <div className="hidden md:flex flex-col justify-between w-80 bg-zinc-900 text-white p-8 shrink-0">
        <div>
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-zinc-900" />
            </div>
            <span className="font-bold text-lg">FinPulse</span>
          </div>
          <div className="space-y-6">
            {[
              "Track income from all sources",
              "Monitor GST threshold in real-time",
              "Estimate advance tax automatically",
              "Export CA-ready reports in minutes",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2
                  size={16}
                  className="text-emerald-400 mt-0.5 shrink-0"
                />
                <span className="text-sm text-zinc-300">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Built for Indian freelancers, creators & consultants to track income, expenses & taxes.
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                    step >= s
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-200 text-zinc-500",
                  )}
                >
                  {step > s ? <CheckCircle2 size={14} /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={cn(
                      "h-px w-8 transition-colors",
                      step > s ? "bg-zinc-900" : "bg-zinc-200",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          {step === 1 && (
            <div>
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">
                  What best describes you?
                </h1>
                <p className="text-sm text-zinc-500">
                  We'll customize your workspace based on your work type.
                </p>
              </div>
              <div className="space-y-3">
                {PROFILES.map((p) => (
                  <button
                    key={p.type}
                    onClick={() => {
                      setForm((f) => ({ ...f, profile_type: p.type }));
                      setStep(2);
                    }}
                    className="w-full text-left border border-zinc-200 bg-white hover:border-zinc-900 hover:shadow-sm rounded-xl p-5 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{p.icon}</span>
                        <div>
                          <div className="font-semibold text-zinc-900 text-sm">
                            {p.title}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {p.desc}
                          </div>
                        </div>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-zinc-300 group-hover:text-zinc-900 transition-colors shrink-0"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">
                  Which state are you in?
                </h1>
                <p className="text-sm text-zinc-500">
                  GST threshold differs — ₹20L for most states, ₹10L for special
                  category states.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>State / UT</Label>
                  <Select
                    value={form.state}
                    onChange={(e) => pickState(e.target.value)}
                    className="h-11"
                  >
                    <option value="">Select your state</option>
                    {STATES.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                        {s.category === "special" ? " ★" : ""}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-zinc-400 mt-1.5">
                    ★ = Special category state (₹10L threshold)
                  </p>
                </div>
                {selectedState && (
                  <div className="flex items-start gap-3 bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                    <MapPin
                      size={16}
                      className="text-zinc-500 mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {form.state}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        GST threshold:{" "}
                        <span className="font-semibold">
                          ₹{selectedState.category === "special" ? "10" : "20"}{" "}
                          lakh
                        </span>
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!form.state}
                    onClick={() => setStep(3)}
                  >
                    Continue <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">
                  Final details
                </h1>
                <p className="text-sm text-zinc-500">
                  This helps us set up tax estimates correctly.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Service type (optional)</Label>
                  <Input
                    value={form.service_type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        service_type: e.target.value,
                      }))
                    }
                    placeholder="e.g. Web development, Video editing"
                  />
                </div>
                <div>
                  <Label>Financial Year</Label>
                  <Select
                    value={form.current_fy}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        current_fy: e.target.value,
                      }))
                    }
                    className="h-9"
                  >
                    {fyOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <label className="flex items-start gap-3 bg-zinc-50 border border-zinc-200 rounded-xl p-4 cursor-pointer hover:border-zinc-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.digital_receipts_majority}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        digital_receipts_majority: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded border-zinc-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      Most of my receipts are digital
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Enables Section 44ADA with higher limit of ₹75L (vs ₹50L
                      for cash receipts)
                    </p>
                  </div>
                </label>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={submit}
                    disabled={submitting}
                  >
                    {submitting ? "Setting up…" : "Get started"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
