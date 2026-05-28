import { cn } from "@/lib/utils";

const variants = {
  default: "bg-zinc-900 text-white",
  secondary: "bg-zinc-100 text-zinc-900",
  outline: "border border-zinc-200 text-zinc-700",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
};

export function Badge({
  className,
  variant = "secondary",
  children,
  ...props
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
