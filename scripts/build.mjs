// Production build used by Vercel (`npm run build`).
// 1. Generates the Prisma client (needs no database).
// 2. Applies database migrations when a database is configured. A failure here is reported loudly
//    but doesn't fail the deploy: the site then shows a "Setup needed" page explaining what to fix.
// 3. Builds the Next.js app.
import { spawnSync } from "node:child_process";

const run = (cmd, args, env = process.env) => spawnSync(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" }).status ?? 1;
const clean = (v) => (v ?? "").trim().replace(/^["']|["']$/g, "");

if (run("npx", ["prisma", "generate"]) !== 0) process.exit(1);

// The database URL may come from Vercel's Neon/Postgres integration under other names, often with a
// custom prefix (e.g. DATABASE_POSTGRES_URL). Keep in sync with src/server/db-url.ts.
const POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
const DIRECT = ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];
const find = (suffixes) => {
  for (const s of suffixes) if (clean(process.env[s])) return clean(process.env[s]);
  const keys = Object.keys(process.env).sort();
  for (const s of suffixes)
    for (const k of keys)
      if (k.endsWith(`_${s}`) && /^postgres(ql)?:\/\//.test(clean(process.env[k]))) return clean(process.env[k]);
  return "";
};
const dbUrl = find(POOLED);
const directUrl = find(DIRECT) || dbUrl;
if (!dbUrl) {
  console.warn("\n⚠️  DATABASE_URL is not set: skipping database migrations. The site will show a setup page until you add it.\n");
} else {
  console.log("\n▶ Applying database migrations…");
  // Migrations need a direct (non-pooled) connection when one is available.
  const status = run("npx", ["prisma", "migrate", "deploy"], { ...process.env, DATABASE_URL: directUrl });
  process.env.DATABASE_URL = dbUrl;
  if (status !== 0) {
    console.warn("\n⚠️  Database migrations FAILED (see the error above). Check DATABASE_URL / DIRECT_URL, then redeploy.");
    console.warn("    The build continues; the site will show a setup page describing the problem.\n");
  }
}

process.exit(run("npx", ["next", "build"]));
