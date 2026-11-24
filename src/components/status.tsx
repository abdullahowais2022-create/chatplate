import { STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const DOT: Record<string, string> = {
  NEW: "bg-brand animate-pulse",
  CONFIRMED: "bg-sky-500",
  PREPARING: "bg-amber-500",
  READY: "bg-emerald-500",
  OUT_FOR_DELIVERY: "bg-violet-500",
  COMPLETED: "bg-stone-400",
  CANCELLED: "bg-red-500",
};

/** Order status as a dot and a word, the way a kitchen ticket would show it. */
export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium", status === "COMPLETED" || status === "CANCELLED" ? "text-muted-foreground" : "text-foreground", className)}>
      <span className={cn("size-1.5 rounded-full", DOT[status] ?? "bg-stone-400")} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
