// Production build used by Vercel (`npm run build`).
// 1. Generates the Prisma client (needs no database).
// 2. Applies database migrations when a database is configured. A failure here is reported loudly
//    but doesn't fail the deploy: the site then shows a "Setup needed" page explaining what to fix.
// 3. Builds the Next.js app.
import { spawnSync } from "node:child_process";

const run = (cmd, args, env = process.env) => spawnSync(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" }).status ?? 1;
const clean = (v) => (v ?? "").trim().replace(/^["']|["']$/g, "");

if (run("npx", ["prisma", "generate"]) !== 0) process.exit(1);

const dbUrl = clean(process.env.DATABASE_URL);
const directUrl = clean(process.env.DIRECT_URL) || dbUrl;
if (!dbUrl) {
  console.warn("\n⚠️  DATABASE_URL is not set: skipping database migrations. The site will show a setup page until you add it.\n");
} else {
  console.log("\n▶ Applying database migrations…");
  // Migrations need a direct (non-pooled) connection when one is available.
  const status = run("npx", ["prisma", "migrate", "deploy"], { ...process.env, DATABASE_URL: directUrl });
  if (status !== 0) {
    console.warn("\n⚠️  Database migrations FAILED (see the error above). Check DATABASE_URL / DIRECT_URL, then redeploy.");
    console.warn("    The build continues; the site will show a setup page describing the problem.\n");
  }
}

process.exit(run("npx", ["next", "build"]));
