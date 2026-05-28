import { cn } from "@/lib/utils";

export function Separator({ className, orientation = "horizontal", ...props }) {
  return (
    <div
      role="separator"
      className={cn(
        "bg-zinc-200 shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}
