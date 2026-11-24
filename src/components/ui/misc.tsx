import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Separator = ({ className }: { className?: string }) => <div className={cn("h-px w-full bg-border", className)} />;

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("animate-pulse rounded-md bg-muted", className)} />;

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center", className)}>
      <Icon className="mb-3 h-5 w-5 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  const initials = (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const hue = [...(name ?? "?")].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white", className)} style={{ backgroundColor: `hsl(${hue} 28% 42%)` }}>
      {initials}
    </div>
  );
}

/** One figure in a stat strip: small caps label, receipt-style number, optional note. */
export function Stat({ label, value, hint, tone = "default", className }: { label: string; value: React.ReactNode; hint?: string; icon?: LucideIcon; tone?: "default" | "warning" | "success"; className?: string }) {
  return (
    <div className={cn("px-4 py-3.5", className)}>
      <p className="label-caps flex items-center gap-1.5">
        {tone === "warning" && <span className="size-1.5 rounded-full bg-brand" />}
        {label}
      </p>
      <p className="num mt-1.5 text-[26px] font-medium leading-none">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
