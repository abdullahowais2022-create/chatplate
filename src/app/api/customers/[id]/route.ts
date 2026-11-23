import { route, ok, parseJson, clientIp, notFound } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { customerUpdateSchema } from "@/lib/schemas";
import { getCustomer } from "@/server/services/queries";
import { db } from "@/server/db";
import { audit } from "@/server/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const s = await requireApiSession("customers:read");
  return ok(await getCustomer(s.restaurantId, (await params).id));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession("customers:write");
  const { id } = await params;
  const data = await parseJson(req, customerUpdateSchema);
  const before = await db.customer.findFirst({ where: { id, restaurantId: s.restaurantId, deletedAt: null }, select: { name: true, tags: true, notes: true } });
  if (!before) throw notFound("Customer not found");
  await db.customer.update({ where: { id }, data });
  await audit({ restaurantId: s.restaurantId, actorType: "STAFF", actorUserId: s.userId, action: data.tags?.includes("BLOCKED") && !before.tags.includes("BLOCKED") ? "customer.blocked" : "customer.updated", entityType: "Customer", entityId: id, before, after: data, ip: clientIp(req) });
  return ok(await getCustomer(s.restaurantId, id));
});
