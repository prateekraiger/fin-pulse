import { useState } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Receipt,
  Calculator,
  CheckSquare,
  Settings,
  Menu,
  X,
  ChevronDown,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFYOptions } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Income", href: "/income", icon: TrendingUp },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Tax Planner", href: "/tax", icon: Calculator },
  { label: "Compliance", href: "/compliance", icon: CheckSquare },
];

function NavLink({ item, pathname }) {
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <a
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-zinc-900 text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
      )}
    >
      <Icon size={16} className="shrink-0" />
      {item.label}
    </a>
  );
}

export function AppShell({ children, currentPath = "/" }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fy, setFy] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fy") || "2024-2025";
    }
    return "2024-2025";
  });

  const fyOptions = getFYOptions();

  const handleFyChange = (newFy) => {
    setFy(newFy);
    if (typeof window !== "undefined") {
      localStorage.setItem("fy", newFy);
      window.location.reload();
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-zinc-100">
        <a href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
            <Zap size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-900 leading-tight">
              FreelanceTax
            </div>
            <div className="text-[10px] text-zinc-400 leading-tight">
              India Edition
            </div>
          </div>
        </a>
      </div>

      {/* FY Selector */}
      <div className="px-4 py-3 border-b border-zinc-100">
        <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">
          Financial Year
        </div>
        <div className="relative">
          <select
            value={fy}
            onChange={(e) => handleFyChange(e.target.value)}
            className="w-full text-xs font-semibold text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2 pr-7 appearance-none focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
          >
            {fyOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider px-3 pb-2">
          Main
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} pathname={currentPath} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-zinc-200 rounded-full flex items-center justify-center text-xs font-semibold text-zinc-700">
            D
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-zinc-900 truncate">
              Demo User
            </div>
            <div className="text-[10px] text-zinc-400 truncate">
              demo@freelancetax.in
            </div>
          </div>
          <a href="/onboarding" title="Settings">
            <Settings
              size={14}
              className="text-zinc-400 hover:text-zinc-700 transition-colors"
            />
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-zinc-200 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-56 bg-white border-r border-zinc-200 flex flex-col z-50">
            <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-100">
              <span className="text-sm font-bold text-zinc-900">Menu</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-zinc-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 text-zinc-600 hover:text-zinc-900"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-zinc-900">FreelanceTax</span>
        </div>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export function useFY() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("fy") || "2024-2025";
  }
  return "2024-2025";
}
