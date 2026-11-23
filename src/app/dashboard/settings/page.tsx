import { requirePageSession } from "@/server/auth/session";
import { getWhatsAppStatus, listAudit, listTeam } from "@/server/services/queries";
import { env } from "@/server/env";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/misc";
import { SettingsTabs } from "./settings-tabs";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const s = await requirePageSession();
  const sp = await searchParams;
  const [team, whatsapp, audit] = await Promise.all([
    listTeam(s.restaurantId),
    can(s.role, "whatsapp:manage") ? getWhatsAppStatus(s.restaurantId, env().APP_URL) : null,
    can(s.role, "audit:read") ? listAudit(s.restaurantId, 150) : null,
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Settings" description="Team, WhatsApp connection, your account and the audit log." />
      <SettingsTabs
        defaultTab={sp.tab ?? (whatsapp ? "whatsapp" : "team")}
        me={{ id: s.userId, role: s.role }}
        team={team}
        whatsapp={whatsapp}
        audit={audit}
        timezone={s.timezone}
      />
    </div>
  );
}
