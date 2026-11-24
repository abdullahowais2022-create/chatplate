import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Quiet labels: neutral chip with a coloured dot instead of a rainbow of filled pills.
const badgeVariants = cva("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-xs font-medium [&_svg]:size-3", {
  variants: {
    variant: {
      default: "border-transparent bg-primary text-primary-foreground",
      secondary: "border-transparent bg-muted text-muted-foreground",
      outline: "bg-card text-foreground",
      success: "bg-card text-foreground before:size-1.5 before:rounded-full before:bg-emerald-500",
      warning: "bg-card text-foreground before:size-1.5 before:rounded-full before:bg-amber-500",
      danger: "bg-card text-foreground before:size-1.5 before:rounded-full before:bg-red-500",
      info: "bg-card text-foreground before:size-1.5 before:rounded-full before:bg-sky-500",
      violet: "bg-card text-foreground before:size-1.5 before:rounded-full before:bg-violet-500",
      brand: "bg-card text-foreground before:size-1.5 before:rounded-full before:bg-brand",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
