import { route, ok, parseJson, clientIp, notFound } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { orderUpdateSchema } from "@/lib/schemas";
import { getOrder } from "@/server/services/queries";
import { assignOrder, updateOrderStatus } from "@/server/services/orders";
import { db } from "@/server/db";
import { audit } from "@/server/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("orders:read");
  return ok(await getOrder(s.restaurantId, (await params).id));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession("orders:write");
  const { id } = await params;
  const body = await parseJson(req, orderUpdateSchema);
  const actor = { type: "STAFF" as const, userId: s.userId };
  if (body.status) await updateOrderStatus({ restaurantId: s.restaurantId, orderId: id, to: body.status, actor, ip: clientIp(req) });
  if (body.assignedToId !== undefined) await assignOrder({ restaurantId: s.restaurantId, orderId: id, assigneeId: body.assignedToId, actor });
  if (body.notes !== undefined) {
    const res = await db.order.updateMany({ where: { id, restaurantId: s.restaurantId }, data: { notes: body.notes } });
    if (!res.count) throw notFound("Order not found");
    await db.orderEvent.create({ data: { orderId: id, type: "NOTE", actorType: "STAFF", actorUserId: s.userId, message: "Staff notes updated" } });
    await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: "order.notes_updated", entityType: "Order", entityId: id, after: { notes: body.notes } });
  }
  return ok(await getOrder(s.restaurantId, id));
});
