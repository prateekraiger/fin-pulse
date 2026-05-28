import { cn } from "@/lib/utils";

const variants = {
  default:
    "bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:ring-zinc-900",
  destructive:
    "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500",
  outline:
    "border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 focus-visible:ring-zinc-900",
  ghost: "hover:bg-zinc-100 text-zinc-700 focus-visible:ring-zinc-900",
  link: "text-zinc-900 underline-offset-4 hover:underline focus-visible:ring-zinc-900",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600",
};

const sizes = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-6 text-sm",
  icon: "h-9 w-9",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
