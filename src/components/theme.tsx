"use client";
import { useEffect, useState } from "react";
import { ThemeProvider as NextThemes, useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match device", icon: Monitor },
] as const;

/** Three-way switch: light, dark, or follow the device setting. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div role="radiogroup" aria-label="Colour theme" className={cn("inline-flex items-center gap-0.5 rounded-lg border bg-muted/60 p-0.5", className)}>
      {OPTIONS.map((o) => {
        const active = mounted && theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => setTheme(o.value)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active && "bg-card text-foreground shadow-sm",
            )}
          >
            <o.icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/** Toast notifications that follow the current theme. */
export function ToasterThemed() {
  const { resolvedTheme } = useTheme();
  return <Toaster richColors position="top-right" closeButton theme={resolvedTheme === "dark" ? "dark" : "light"} />;
}
