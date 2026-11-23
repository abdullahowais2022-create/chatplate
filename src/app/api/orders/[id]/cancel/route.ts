import { route, ok, parseJson, clientIp } from "@/server/http";
import { requireApiSession } from "@/server/auth/session";
import { cancelOrderSchema } from "@/lib/schemas";
import { cancelOrder } from "@/server/services/orders";
import { getOrder } from "@/server/services/queries";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const s = await requireApiSession("orders:write");
  const { id } = await params;
  const { reason, notifyCustomer } = await parseJson(req, cancelOrderSchema);
  await cancelOrder({ restaurantId: s.restaurantId, orderId: id, actor: { type: "STAFF", userId: s.userId }, reason: reason ?? "Cancelled by the restaurant", notifyCustomer, ip: clientIp(req) });
  return ok(await getOrder(s.restaurantId, id));
});
