import { route, ok } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { getConversation } from "@/server/services/queries";
import { db } from "@/server/db";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("inbox:read");
  const { id } = await params;
  const conv = await getConversation(s.restaurantId, id);
  await db.conversation.updateMany({ where: { id, restaurantId: s.restaurantId, unreadCount: { gt: 0 } }, data: { unreadCount: 0 } });
  return ok(conv);
});
