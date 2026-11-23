import { route, ok, parseJson, clientIp } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { categorySchema } from "@/lib/schemas";
import { deleteCategory, updateCategory } from "@/server/services/menu";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession("menu:write");
  const data = await parseJson(req, categorySchema.partial());
  return ok(await updateCategory(s.restaurantId, (await params).id, data, { userId: s.userId, ip: clientIp(req) }));
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession("menu:write");
  await deleteCategory(s.restaurantId, (await params).id, { userId: s.userId, ip: clientIp(req) });
  return ok({ deleted: true });
});
