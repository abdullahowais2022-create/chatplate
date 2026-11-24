import { cn } from "@/lib/utils";

/** TillText logo: a chat bubble holding a till receipt (item lines, prices and a total), i.e. "order at the till, by text". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden>
      {/* Solid fills (no gradient ids) so multiple instances never clash, e.g. when one is display:none. */}
      <path d="M32 4C16.54 4 4 15.4 4 29.5c0 7.3 3.37 13.88 8.78 18.53L10.2 59.2a1 1 0 0 0 1.43 1.1l12.06-6.02A30.6 30.6 0 0 0 32 55c15.46 0 28-11.4 28-25.5S47.46 4 32 4Z" fill="#EE621A" />
      <path d="M32 4C16.54 4 4 15.4 4 29.5c0 2.2.3 4.33.87 6.36C8.6 22.1 19.3 12 32 12s23.4 10.1 27.13 23.86c.57-2.03.87-4.16.87-6.36C60 15.4 47.46 4 32 4Z" fill="#FB8A3C" opacity=".55" />
      <path d="M20 15a2.5 2.5 0 0 1 2.5-2.5h19A2.5 2.5 0 0 1 44 15v31l-3-2.2-3 2.2-3-2.2-3 2.2-3-2.2-3 2.2-3-2.2-3 2.2Z" fill="#fff" />
      <path d="M24.5 20h9M24.5 25.5h9M24.5 31h9" stroke="#FDAC74" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M37 20h2.5M37 25.5h2.5M37 31h2.5" stroke="#E35413" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24.5 37.5h15" stroke="#E35413" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="text-xl font-extrabold tracking-tight">
        <span className="text-ink">till</span>
        <span className="text-brand-600">text</span>
      </span>
    </span>
  );
}
