// Finds the Postgres connection string under the many names hosting integrations use.
// Vercel's Neon integration adds a custom prefix to every variable it creates
// (e.g. DATABASE_POSTGRES_URL, STORAGE_DATABASE_URL), so we match by suffix as well.
// Keep in sync with scripts/build.mjs.

const clean = (v: string | undefined) => v?.trim().replace(/^["']|["']$/g, "") ?? "";

const POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
const DIRECT = ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];

function find(suffixes: string[], env: Record<string, string | undefined>): string {
  // Exact names win; then any variable ending in "_<suffix>", in priority order.
  for (const s of suffixes) {
    const v = clean(env[s]);
    if (v) return v;
  }
  const keys = Object.keys(env).sort();
  for (const s of suffixes) {
    for (const k of keys) {
      if (k.endsWith(`_${s}`)) {
        const v = clean(env[k]);
        if (/^postgres(ql)?:\/\//.test(v)) return v;
      }
    }
  }
  return "";
}

export function databaseUrl(env: Record<string, string | undefined> = process.env): string {
  return find(POOLED, env);
}

export function directDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  return find(DIRECT, env) || databaseUrl(env);
}
