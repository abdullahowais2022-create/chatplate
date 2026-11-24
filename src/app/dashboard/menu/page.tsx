import { requirePageSession } from "@/server/auth/session";
import { getMenu } from "@/server/services/queries";
import { can } from "@/lib/permissions";
import { MenuManager } from "./menu-manager";
import { catalogLabel } from "@/lib/business";

export const metadata = { title: "Menu & products" };

export default async function MenuPage() {
  const s = await requirePageSession("menu:read");
  const menu = await getMenu(s.restaurantId);
  return <MenuManager menu={menu} currency={s.currency} canEdit={can(s.role, "menu:write")} title={catalogLabel(s.businessType)} />;
}
