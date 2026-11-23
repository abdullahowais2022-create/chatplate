import { route, ok, notFound } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { bumpLive } from "@/server/live";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("inbox:reply");
  const { id } = await params;
  const res = await db.conversation.updateMany({ where: { id, restaurantId: s.restaurantId }, data: { needsHuman: false, needsHumanReason: null, unreadCount: 0 } });
  if (!res.count) throw notFound("Conversation not found");
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "conversation.resolved", entityType: "Conversation", entityId: id });
  await bumpLive(s.restaurantId);
  return ok({ resolved: true });
});
