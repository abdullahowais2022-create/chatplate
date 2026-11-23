import "server-only";
import type { ActorType, Prisma } from "@prisma/client";
import { db } from "./db";

type AuditInput = {
  restaurantId: string;
  actorType: ActorType;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
};

const toJson = (v: unknown) =>
  v === undefined ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);

/** Append-only audit trail of order, menu, settings, staff, and AI escalation changes. Never throws. */
export async function audit(input: AuditInput, tx: Prisma.TransactionClient = db) {
  try {
    await tx.auditLog.create({
      data: {
        restaurantId: input.restaurantId,
        actorType: input.actorType,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        before: toJson(input.before),
        after: toJson(input.after),
        ip: input.ip ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", err);
  }
}
