import { route, ok, parseJson, clientIp } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { availabilitySchema, menuItemSchema } from "@/lib/schemas";
import { deleteMenuItem, saveMenuItem, setAvailability } from "@/server/services/menu";

type Ctx = { params: Promise<{ id: string }> };

/** Full update (managers and owners). */
export const PUT = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession("menu:write");
  const data = await parseJson(req, menuItemSchema);
  return ok(await saveMenuItem(s.restaurantId, (await params).id, data, { userId: s.userId, ip: clientIp(req) }));
});

/** Availability toggles (any staff member, e.g. "sold out" during service). */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession("menu:availability");
  const data = await parseJson(req, availabilitySchema);
  return ok(await setAvailability(s.restaurantId, (await params).id, data, { userId: s.userId, ip: clientIp(req) }));
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession("menu:write");
  await deleteMenuItem(s.restaurantId, (await params).id, { userId: s.userId, ip: clientIp(req) });
  return ok({ deleted: true });
});
