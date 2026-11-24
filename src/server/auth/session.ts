import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@prisma/client";
import { db } from "../db";
import { hmac, randomToken } from "../crypto";
import { forbidden, unauthorized } from "../http";
import { can, type Permission } from "@/lib/permissions";

// "__Host-" cookies can only be set over HTTPS, for this exact host and path "/", which blocks
// cookie injection from other subdomains. Plain name in local development (http).
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-tt_session" : "tt_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  restaurantId: string;
  restaurantName: string;
  businessType: string;
  restaurantLogoUrl: string | null;
  onboardingCompleted: boolean;
  isDemo: boolean;
  mustChangePassword: boolean;
  currency: string;
  timezone: string;
};

export async function createSession(userId: string, meta: { ip?: string; userAgent?: string } = {}) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: { userId, tokenHash: hmac(`session:${token}`), expiresAt, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 300) },
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hmac(`session:${token}`) } });
  jar.delete(SESSION_COOKIE);
}

/** Returns the current session (memoised per request) or null. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hmac(`session:${token}`) },
    include: { user: { include: { restaurant: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const { user } = session;
  if (!user.isActive || user.deletedAt || user.restaurant.deletedAt) return null;
  return {
    sessionId: session.id,
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    restaurantId: user.restaurantId,
    restaurantName: user.restaurant.name,
    businessType: user.restaurant.businessType,
    restaurantLogoUrl: user.restaurant.logoUrl,
    onboardingCompleted: Boolean(user.restaurant.onboardingCompletedAt),
    isDemo: user.restaurant.isDemo,
    mustChangePassword: user.mustChangePassword,
    currency: user.restaurant.currency,
    timezone: user.restaurant.timezone,
  };
});

/** Actions the shared public demo account may never perform (it is used by strangers). */
const DEMO_BLOCKED: Permission[] = ["team:manage", "whatsapp:manage"];

/**
 * Rejects cookie-authenticated requests sent by another website (CSRF). Browsers always send an
 * Origin header on cross-site and on state-changing requests; it must match this site's host.
 */
async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = null;
  }
  if (!host || originHost !== host) throw forbidden("Cross-site request blocked");
}

/**
 * For API routes: throws 401/403. The returned restaurantId scopes every query.
 * `allowPendingPasswordChange` lets a user with a temporary password call the change-password route.
 */
export async function requireApiSession(permission?: Permission, opts: { allowPendingPasswordChange?: boolean; allowDemo?: boolean } = {}): Promise<SessionUser> {
  await assertSameOrigin();
  const s = await getSession();
  if (!s) throw unauthorized();
  if (s.mustChangePassword && !opts.allowPendingPasswordChange) throw forbidden("Please change your temporary password first");
  if (permission && !can(s.role, permission)) throw forbidden();
  if (s.isDemo && permission && DEMO_BLOCKED.includes(permission) && !opts.allowDemo) throw forbidden("This is disabled in the public demo");
  return s;
}

/** For server components: redirects instead of throwing. */
export async function requirePageSession(permission?: Permission): Promise<SessionUser> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.mustChangePassword) redirect("/change-password");
  if (permission && !can(s.role, permission)) redirect("/dashboard?denied=1");
  return s;
}
