import "server-only";
import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "./db-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Tolerate stray whitespace/quotes in a pasted DATABASE_URL.
    // Also accept the variable names Vercel's Neon/Postgres integration creates.
    datasourceUrl: databaseUrl() || undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
