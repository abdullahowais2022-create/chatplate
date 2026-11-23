"use client";
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
));
Label.displayName = "Label";

/** Label + control + hint. Links the label to the first child control (for screen readers and click-to-focus). */
export function Field({ label, hint, error, children, className }: { label: string; hint?: React.ReactNode; error?: string; children: React.ReactNode; className?: string }) {
  const autoId = React.useId();
  let controlId: string | undefined;
  const enhanced = React.Children.map(children, (child, i) => {
    if (i !== 0 || !React.isValidElement<{ id?: string; "aria-describedby"?: string }>(child)) return child;
    const t = child.type;
    // Native controls, or our forwardRef-based Input/Textarea/NativeSelect. Wrappers (divs) are left alone.
    const isControl = t === "input" || t === "select" || t === "textarea" || (typeof t === "object" && t !== null && "render" in t);
    if (!isControl) return child;
    controlId = child.props.id ?? autoId;
    return React.cloneElement(child, { id: controlId, "aria-describedby": hint || error ? `${autoId}-hint` : undefined });
  });
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={controlId}>{label}</Label>
      {enhanced}
      {error ? <p id={`${autoId}-hint`} className="text-xs text-destructive">{error}</p> : hint ? <p id={`${autoId}-hint`} className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export { Label };
