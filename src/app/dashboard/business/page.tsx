import { requirePageSession } from "@/server/auth/session";
import { getSettings } from "@/server/services/queries";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/misc";
import { BusinessTabs } from "./business-tabs";

export const metadata = { title: "Business settings" };

export default async function BusinessPage() {
  const s = await requirePageSession("settings:read");
  const settings = await getSettings(s.restaurantId);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Business settings" description="Everything the AI is allowed to tell customers comes from here and your menu." />
      <BusinessTabs settings={settings} readOnly={!can(s.role, "settings:write")} />
    </div>
  );
}
