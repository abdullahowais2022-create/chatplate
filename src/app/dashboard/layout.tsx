import { setupProblems } from "@/server/setup";
import { redirect } from "next/navigation";
import { requirePageSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { LiveProvider } from "@/components/dashboard/live";

// Always render per request (auth, live data, and setup checks).
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if ((await setupProblems()).length) redirect("/setup");
  const s = await requirePageSession();
  if (!s.onboardingCompleted && s.role === "OWNER") redirect("/onboarding");
  const [r, unreadNotifications, attention] = await Promise.all([
    db.restaurant.findUniqueOrThrow({ where: { id: s.restaurantId }, select: { liveVersion: true } }),
    db.notification.count({ where: { restaurantId: s.restaurantId, readAt: null } }),
    db.conversation.count({ where: { restaurantId: s.restaurantId, OR: [{ needsHuman: true }, { mode: "HUMAN", unreadCount: { gt: 0 } }] } }),
  ]);
  return (
    <LiveProvider initial={{ version: r.liveVersion, unreadNotifications, attention }}>
      <DashboardShell user={{ name: s.name, email: s.email, role: s.role, restaurantName: s.restaurantName, restaurantLogoUrl: s.restaurantLogoUrl, businessType: s.businessType, isDemo: s.isDemo }}>{children}</DashboardShell>
    </LiveProvider>
  );
}
