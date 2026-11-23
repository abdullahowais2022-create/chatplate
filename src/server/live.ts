import "server-only";
import { db } from "./db";

/** Bumps the restaurant's change cursor so open dashboards refresh (see /api/live). */
export async function bumpLive(restaurantId: string) {
  await db.restaurant
    .update({ where: { id: restaurantId }, data: { liveVersion: { increment: 1 } } })
    .catch((err) => console.error("[live] bump failed", err));
}
