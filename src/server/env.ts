import "server-only";
import { z } from "zod";
import { databaseUrl } from "./db-url";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  ENCRYPTION_KEY: z.string().min(40, "ENCRYPTION_KEY must be a base64-encoded 32-byte key"),
  HASH_KEY: z.string().min(40, "HASH_KEY must be a base64-encoded 32-byte key"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_TRANSCRIBE_MODEL: z.string().default("whisper-1"),
  META_GRAPH_API_VERSION: z.string().default("v21.0"),
  // One-click WhatsApp connection (Meta Embedded Signup). Set once by whoever runs TillText.
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_EMBEDDED_SIGNUP_CONFIG_ID: z.string().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  // Permanent token of TillText's own Admin system user. Connected businesses' WhatsApp accounts are
  // assigned to it, so their connection never expires (Embedded Signup tokens last 60 days).
  META_SYSTEM_USER_TOKEN: z.string().optional(),
  QSTASH_TOKEN: z.string().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_PRIVATE_BUCKET: z.string().default("voice-notes"),
  SUPABASE_PUBLIC_BUCKET: z.string().default("public-media"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("TillText <orders@example.com>"),
  DEMO_MODE: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

type Env = z.infer<typeof schema>;
let cached: Env | null = null;

/** Validated server environment. Throws a readable error on misconfiguration. */
export function env(): Env {
  if (cached) return cached;
  // Trim pasted values (stray spaces/quotes are a common copy-paste problem) and treat "" as unset.
  const clean: Record<string, string | undefined> = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => {
      const t = v?.trim().replace(/^["']|["']$/g, "");
      return [k, t ? t : undefined];
    }),
  );
  clean.DATABASE_URL = databaseUrl(clean) || undefined;
  // On Vercel, default APP_URL to the project's production domain.
  if (!clean.APP_URL) {
    const host = clean.VERCEL_PROJECT_PRODUCTION_URL ?? clean.VERCEL_URL;
    if (host) clean.APP_URL = `https://${host}`;
  }
  const parsed = schema.safeParse(clean);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

// These read process.env directly so they never throw on a partially configured deployment.
export const isDemoMode = () => process.env.DEMO_MODE?.trim() === "true";
export const hasOpenAI = () => Boolean(process.env.OPENAI_API_KEY?.trim());
