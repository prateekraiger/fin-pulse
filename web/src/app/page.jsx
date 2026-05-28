"use client";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function gate() {
      try {
        const res = await fetch("/api/profile", {
          headers: { "x-user-id": "demo-user" },
        });
        if (cancelled) return;
        const data = await res.json();
        navigate(data.profile ? "/dashboard" : "/onboarding", { replace: true });
      } catch {
        if (!cancelled) {
          navigate("/onboarding", { replace: true });
        }
      }
    }
    gate();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        Loading\u2026
      </div>
    </div>
  );
}
