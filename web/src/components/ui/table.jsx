import { cn } from "@/lib/utils";

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-auto">
      <table
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return (
    <thead className={cn("border-b border-zinc-100", className)} {...props} />
  );
}

export function TableBody({ className, ...props }) {
  return (
    <tbody className={cn("divide-y divide-zinc-50", className)} {...props} />
  );
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn("hover:bg-zinc-50/50 transition-colors", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return (
    <td
      className={cn("px-4 py-3.5 text-sm text-zinc-700", className)}
      {...props}
    />
  );
}
