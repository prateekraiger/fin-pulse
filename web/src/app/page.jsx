"use client";
import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    async function gate() {
      try {
        const res = await fetch("/api/profile", {
          headers: { "x-user-id": "demo-user" },
        });
        const data = await res.json();
        window.location.href = data.profile ? "/dashboard" : "/onboarding";
      } catch {
        window.location.href = "/onboarding";
      }
    }
    gate();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        Loading…
      </div>
    </div>
  );
}
