import "server-only";
import { db } from "./db";

export type SetupProblem = { key: string; title: string; fix: string };

const clean = (v: string | undefined) => v?.trim().replace(/^["']|["']$/g, "") ?? "";
let healthy = false;

function keyOk(v: string) {
  try {
    return Buffer.from(v, "base64").length === 32;
  } catch {
    return false;
  }
}

/**
 * Checks the minimum configuration the app needs, so a half-configured deployment shows a helpful
 * page instead of crashing. Once everything passes, the result is cached for the life of the process.
 */
export async function setupProblems(): Promise<SetupProblem[]> {
  if (healthy) return [];
  const problems: SetupProblem[] = [];
  const dbUrl = clean(process.env.DATABASE_URL);
  if (!dbUrl) {
    problems.push({ key: "DATABASE_URL", title: "No database connected", fix: "Add DATABASE_URL (your Neon or Supabase connection string, starting with postgresql://) in Vercel → Settings → Environment Variables, then redeploy." });
  } else if (!/^postgres(ql)?:\/\//.test(dbUrl)) {
    problems.push({ key: "DATABASE_URL", title: "DATABASE_URL doesn't look right", fix: "It must start with postgresql://. Copy the whole connection string from Neon (Dashboard → Connect) again." });
  }
  for (const key of ["ENCRYPTION_KEY", "HASH_KEY"] as const) {
    const v = clean(process.env[key]);
    if (!v) problems.push({ key, title: `${key} is missing`, fix: `Add ${key} in Vercel → Settings → Environment Variables. It must be a random 32-byte key written in base64 (44 characters ending in "=").` });
    else if (!keyOk(v)) problems.push({ key, title: `${key} isn't a valid key`, fix: `${key} must be 44 characters of base64 ending in "=". Copy it again without extra characters.` });
  }

  if (!problems.some((p) => p.key === "DATABASE_URL")) {
    try {
      const rows = await db.$queryRaw<{ t: string | null }[]>`SELECT to_regclass('public."Restaurant"')::text AS t`;
      if (!rows[0]?.t) {
        problems.push({ key: "MIGRATIONS", title: "The database is empty (tables not created yet)", fix: "Open Vercel → Deployments, click ⋯ on the latest deployment → Redeploy. The build creates the tables automatically. If it still fails, add DIRECT_URL (Neon's connection string with pooling turned off) and redeploy." });
      }
    } catch (err) {
      const msg = (err as Error).message.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 200) ?? "unknown error";
      problems.push({ key: "DATABASE_CONNECT", title: "Can't connect to the database", fix: `Check that DATABASE_URL is the exact connection string from Neon (including the password) and that the database isn't paused. Error: ${msg}` });
    }
  }
  if (problems.length === 0) healthy = true;
  return problems;
}
