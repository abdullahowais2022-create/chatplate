import { cn } from "@/lib/utils";

/** MenuTexter logo: a chat bubble holding a menu card (dish lines + price dots), i.e. "text the menu". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden>
      {/* Solid fills (no gradient ids) so multiple instances never clash, e.g. when one is display:none. */}
      <path d="M32 4C16.54 4 4 15.4 4 29.5c0 7.3 3.37 13.88 8.78 18.53L10.2 59.2a1 1 0 0 0 1.43 1.1l12.06-6.02A30.6 30.6 0 0 0 32 55c15.46 0 28-11.4 28-25.5S47.46 4 32 4Z" fill="#EE621A" />
      <path d="M32 4C16.54 4 4 15.4 4 29.5c0 2.2.3 4.33.87 6.36C8.6 22.1 19.3 12 32 12s23.4 10.1 27.13 23.86c.57-2.03.87-4.16.87-6.36C60 15.4 47.46 4 32 4Z" fill="#FB8A3C" opacity=".55" />
      <rect x="18" y="13" width="28" height="33" rx="4.5" fill="#fff" />
      <path d="M25.5 20.5h13" stroke="#E35413" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M23.5 28h11M23.5 33.5h11M23.5 39h11" stroke="#FDAC74" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="40" cy="28" r="1.7" fill="#E35413" />
      <circle cx="40" cy="33.5" r="1.7" fill="#E35413" />
      <circle cx="40" cy="39" r="1.7" fill="#E35413" />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="text-xl font-extrabold tracking-tight">
        <span className="text-ink">menu</span>
        <span className="text-brand-600">texter</span>
      </span>
    </span>
  );
}
