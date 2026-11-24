import "server-only";
import type { z } from "zod";
import { db } from "../db";
import { randomToken } from "../crypto";
import { hashPassword } from "../auth/password";
import { conflict } from "../http";
import type { signupSchema } from "@/lib/schemas";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 40) || "restaurant";
}

export const DEFAULT_HOURS = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, openTime: "11:00", closeTime: "22:00", isClosed: false }));

export async function createRestaurantWithOwner(input: z.infer<typeof signupSchema>, opts: { isDemo?: boolean } = {}) {
  if (await db.user.findUnique({ where: { email: input.email } })) throw conflict("An account with this email already exists");
  const passwordHash = await hashPassword(input.password);
  return db.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: {
        name: input.restaurantName,
        businessType: input.businessType,
        slug: `${slugify(input.restaurantName)}-${randomToken(4).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5)}`,
        isDemo: opts.isDemo ?? false,
        supportedLanguages: ["*"],
        acceptedPaymentMethods: ["CASH", "CARD_ON_DELIVERY", "CARD_AT_PICKUP"],
        businessHours: { create: DEFAULT_HOURS },
        whatsapp: { create: { webhookKey: randomToken(18), verifyToken: randomToken(24) } },
      },
    });
    const user = await tx.user.create({ data: { restaurantId: restaurant.id, email: input.email, name: input.name, passwordHash, role: "OWNER" } });
    return { restaurant, user };
  });
}
