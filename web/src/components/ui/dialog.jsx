import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({ open, onClose, children }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

export function DialogContent({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-zinc-200 shadow-xl w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn("px-6 py-5 border-b border-zinc-100", className)}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }) {
  return (
    <h2
      className={cn("text-base font-semibold text-zinc-900", className)}
      {...props}
    />
  );
}

export function DialogBody({ className, ...props }) {
  return <div className={cn("px-6 py-5 space-y-4", className)} {...props} />;
}

export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-zinc-100 flex items-center justify-end gap-3",
        className,
      )}
      {...props}
    />
  );
}

export function DialogClose({ onClose }) {
  return (
    <button
      onClick={onClose}
      className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-700 p-1 rounded"
    >
      <X size={18} />
    </button>
  );
}
