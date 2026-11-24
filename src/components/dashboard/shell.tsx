"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Package, Bell, ClipboardList, FlaskConical, KeyRound, LayoutDashboard, LogOut, Menu, MessagesSquare, Settings, Store, Users, UtensilsCrossed, X, CheckCheck } from "lucide-react";
import { Logo } from "@/components/brand";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLive } from "./live";
import { ThemeSwitch } from "@/components/theme";
import { can, type Permission, type RoleName } from "@/lib/permissions";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { businessInfo, catalogLabel } from "@/lib/business";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; perm: Permission; badge?: "attention" }[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, perm: "overview:read" },
  { href: "/dashboard/inbox", label: "Live inbox", icon: MessagesSquare, perm: "inbox:read", badge: "attention" },
  { href: "/dashboard/orders", label: "Orders", icon: ClipboardList, perm: "orders:read" },
  { href: "/dashboard/menu", label: "Menu & products", icon: UtensilsCrossed, perm: "menu:read" },
  { href: "/dashboard/customers", label: "Customers", icon: Users, perm: "customers:read" },
  { href: "/dashboard/business", label: "Business settings", icon: Store, perm: "settings:read" },
  { href: "/dashboard/playground", label: "AI playground", icon: FlaskConical, perm: "playground:use" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, perm: "orders:read" },
];

type ShellUser = { name: string; email: string; role: RoleName; restaurantName: string; restaurantLogoUrl?: string | null; businessType: string; isDemo: boolean };

export function DashboardShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const live = useLive();

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
      {NAV.filter((n) => can(user.role, n.perm)).map((item) => {
        const n = item.href === "/dashboard/menu" ? { ...item, label: catalogLabel(user.businessType), icon: businessInfo(user.businessType).food ? UtensilsCrossed : Package } : item;
        const active = n.href === "/dashboard" ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <n.icon className="h-4 w-4" />
            <span className="flex-1">{n.label}</span>
            {n.badge === "attention" && live.attention > 0 && (
              <span className="num rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{live.attention}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card lg:flex">
        <div className="flex h-14 items-center px-5"><Logo markClassName="h-7 w-7" /></div>
        <div className="mx-3 mb-2 rounded-md border px-2.5 py-2">
          <div className="flex items-center gap-2.5">
            {user.restaurantLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.restaurantLogoUrl} alt="" className="h-7 w-7 shrink-0 rounded border object-cover" />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-foreground text-xs font-semibold text-background">{user.restaurantName.slice(0, 1).toUpperCase()}</span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{user.restaurantName}</p>
              <p className="truncate text-xs text-muted-foreground">{businessInfo(user.businessType).label}</p>
            </div>
          </div>
        </div>
        {nav}

      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b px-5">
              <Logo />
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu"><X /></Button>
            </div>
            <p className="border-b px-5 py-3 font-semibold">{user.restaurantName}</p>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></Button>
          <div className="lg:hidden"><Logo markClassName="h-7 w-7" /></div>
          <div className="flex-1" />
          <ThemeSwitch className="hidden sm:inline-flex" />
          <NotificationBell count={live.unreadNotifications} />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-muted">
              <Avatar name={user.name} className="h-8 w-8" />
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight">{user.name}</span>
                <span className="block text-xs capitalize text-muted-foreground">{user.role.toLowerCase()}</span>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/dashboard/settings?tab=account"><KeyRound /> Change password</Link></DropdownMenuItem>
              <div className="flex items-center justify-between px-2 py-1.5 text-sm sm:hidden"><span>Theme</span><ThemeSwitch /></div>
              <DropdownMenuItem
                onSelect={async () => {
                  await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
                  window.location.href = "/login";
                }}
              >
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {user.isDemo && (
          <div className="flex items-center gap-2 border-b px-4 py-1.5 text-xs text-muted-foreground sm:px-6">
            <span className="rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">Demo</span>
            <span>Replies are simulated. Try it as a customer in the <Link className="text-foreground underline underline-offset-2" href="/dashboard/playground">AI playground</Link>.</span>
          </div>
        )}
        <main className="flex-1 px-4 py-5 sm:px-8 sm:py-7">{children}</main>
      </div>
    </div>
  );
}

type Notif = { id: string; title: string; body: string | null; link: string | null; read: boolean; createdAt: string; type: string };

function NotificationBell({ count }: { count: number }) {
  const [items, setItems] = useState<Notif[] | null>(null);
  return (
    <DropdownMenu onOpenChange={(o) => o && api<Notif[]>("/api/notifications").then(setItems).catch(() => setItems([]))}>
      <DropdownMenuTrigger className="relative rounded-lg p-2 hover:bg-muted" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {count > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand ring-2 ring-background" aria-label={`${count} unread`} />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <button
            className="flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={async () => {
              await api("/api/notifications/read", { body: {} });
              setItems((x) => x?.map((n) => ({ ...n, read: true })) ?? null);
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!items && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          {items?.length === 0 && <p className="p-4 text-sm text-muted-foreground">You&apos;re all caught up.</p>}
          {items?.map((n) => (
            <DropdownMenuItem key={n.id} asChild className="block rounded-none border-b px-3 py-2 last:border-0">
              <Link href={n.link ?? "/dashboard"} onClick={() => api("/api/notifications/read", { body: { ids: [n.id] } }).catch(() => undefined)}>
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
