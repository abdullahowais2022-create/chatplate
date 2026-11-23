import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "./env";

/**
 * File storage. Supabase Storage in production (private bucket for voice notes, public bucket for
 * logos and menu images). Falls back to ./storage on local disk for development.
 */
const LOCAL_ROOT = path.join(process.cwd(), "storage");

function supabase() {
  const e = env();
  return e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY
    ? { url: e.SUPABASE_URL.replace(/\/$/, ""), key: e.SUPABASE_SERVICE_ROLE_KEY }
    : null;
}

function safeKey(key: string) {
  if (key.includes("..") || key.startsWith("/")) throw new Error("Invalid storage key");
  return key;
}

async function upload(bucket: string, key: string, data: Buffer, contentType: string) {
  const sb = supabase();
  if (!sb) {
    const file = path.join(LOCAL_ROOT, bucket, safeKey(key));
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
    await fs.writeFile(`${file}.meta`, contentType);
    return;
  }
  const res = await fetch(`${sb.url}/storage/v1/object/${bucket}/${safeKey(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sb.key}`, "Content-Type": contentType, "x-upsert": "true" },
    body: new Uint8Array(data),
  });
  if (!res.ok) throw new Error(`Storage upload failed (${res.status}): ${await res.text()}`);
}

export async function putPrivate(key: string, data: Buffer, contentType: string) {
  await upload(env().SUPABASE_PRIVATE_BUCKET, key, data, contentType);
  return key;
}

export async function getPrivate(key: string): Promise<{ data: Buffer; contentType: string } | null> {
  const bucket = env().SUPABASE_PRIVATE_BUCKET;
  const sb = supabase();
  if (!sb) {
    const file = path.join(LOCAL_ROOT, bucket, safeKey(key));
    try {
      const [data, contentType] = await Promise.all([fs.readFile(file), fs.readFile(`${file}.meta`, "utf8")]);
      return { data, contentType };
    } catch {
      return null;
    }
  }
  const res = await fetch(`${sb.url}/storage/v1/object/${bucket}/${safeKey(key)}`, {
    headers: { Authorization: `Bearer ${sb.key}` },
  });
  if (!res.ok) return null;
  return { data: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
}

/** Uploads a public asset and returns its URL. */
export async function putPublic(key: string, data: Buffer, contentType: string): Promise<string> {
  const bucket = env().SUPABASE_PUBLIC_BUCKET;
  await upload(bucket, key, data, contentType);
  const sb = supabase();
  return sb ? `${sb.url}/storage/v1/object/public/${bucket}/${key}` : `/api/media/public/${key}`;
}

export async function getLocalPublic(key: string) {
  const file = path.join(LOCAL_ROOT, env().SUPABASE_PUBLIC_BUCKET, safeKey(key));
  try {
    const [data, contentType] = await Promise.all([fs.readFile(file), fs.readFile(`${file}.meta`, "utf8")]);
    return { data, contentType };
  } catch {
    return null;
  }
}
