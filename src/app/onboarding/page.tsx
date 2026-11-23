import { redirect } from "next/navigation";
import { requirePageSession } from "@/server/auth/session";
import { getSettings, getWhatsAppStatus } from "@/server/services/queries";
import { env } from "@/server/env";
import { db } from "@/server/db";
import { can } from "@/lib/permissions";
import { Wizard } from "./wizard";

export const metadata = { title: "Set up your restaurant" };

export default async function OnboardingPage() {
  const s = await requirePageSession();
  if (!can(s.role, "settings:write")) redirect("/dashboard");
  const [settings, whatsapp, menuCount] = await Promise.all([
    getSettings(s.restaurantId),
    getWhatsAppStatus(s.restaurantId, env().APP_URL),
    db.menuItem.count({ where: { restaurantId: s.restaurantId, deletedAt: null } }),
  ]);
  return <Wizard settings={settings} whatsapp={whatsapp!} menuCount={menuCount} canManageWhatsApp={can(s.role, "whatsapp:manage")} />;
}
