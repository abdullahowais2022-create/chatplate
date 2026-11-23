import { route, ok } from "@/server/http";
import { destroySession } from "@/server/auth/session";

export const POST = route(async () => {
  await destroySession();
  return ok({ redirect: "/login" });
});
