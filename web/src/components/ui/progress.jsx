import { cn } from "@/lib/utils";

export function Progress({
  value = 0,
  className,
  indicatorClassName,
  ...props
}) {
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-zinc-100",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          indicatorClassName || "bg-zinc-900",
        )}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}
