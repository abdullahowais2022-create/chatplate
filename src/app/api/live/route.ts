import { route, ok } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/** Tiny change cursor polled by the dashboard; when `version` changes the page refreshes. */
export const GET = route(async () => {
  const s = await requireApiSession();
  const [r, unreadNotifications, attention] = await Promise.all([
    db.restaurant.findUniqueOrThrow({ where: { id: s.restaurantId }, select: { liveVersion: true } }),
    db.notification.count({ where: { restaurantId: s.restaurantId, readAt: null } }),
    db.conversation.count({ where: { restaurantId: s.restaurantId, OR: [{ needsHuman: true }, { mode: "HUMAN", unreadCount: { gt: 0 } }] } }),
  ]);
  return ok({ version: r.liveVersion, unreadNotifications, attention });
});
