import "server-only";
import { db } from "./db";
import { env } from "./env";

/**
 * File storage. Uses Supabase Storage when it is configured (private bucket for voice notes, public
 * bucket for logos and product photos). Otherwise files are kept in the database (StoredFile), which
 * works everywhere, including Vercel where the filesystem is read-only.
 */
function supabase() {
  const e = env();
  return e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY
    ? { url: e.SUPABASE_URL.replace(/\/$/, ""), key: e.SUPABASE_SERVICE_ROLE_KEY }
    : null;
}

function safeKey(key: string) {
  if (key.includes("..") || key.startsWith("/") || !/^[\w./-]+$/.test(key)) throw new Error("Invalid storage key");
  return key;
}

async function upload(bucket: string, key: string, data: Buffer, contentType: string) {
  const k = safeKey(key);
  const sb = supabase();
  if (!sb) {
    const row = { bucket, contentType, size: data.length, data: new Uint8Array(data) };
    await db.storedFile.upsert({ where: { key: `${bucket}/${k}` }, create: { key: `${bucket}/${k}`, ...row }, update: row });
    return;
  }
  const res = await fetch(`${sb.url}/storage/v1/object/${bucket}/${k}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sb.key}`, "Content-Type": contentType, "x-upsert": "true" },
    body: new Uint8Array(data),
  });
  if (!res.ok) throw new Error(`Storage upload failed (${res.status}): ${await res.text()}`);
}

async function readFromDb(bucket: string, key: string) {
  const row = await db.storedFile.findUnique({ where: { key: `${bucket}/${safeKey(key)}` } });
  return row ? { data: Buffer.from(row.data), contentType: row.contentType } : null;
}

export async function putPrivate(key: string, data: Buffer, contentType: string) {
  await upload(env().SUPABASE_PRIVATE_BUCKET, key, data, contentType);
  return key;
}

export async function getPrivate(key: string): Promise<{ data: Buffer; contentType: string } | null> {
  const bucket = env().SUPABASE_PRIVATE_BUCKET;
  const sb = supabase();
  if (!sb) return readFromDb(bucket, key);
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

/** Reads a public asset stored in the database (served by /api/media/public/...). */
export async function getStoredPublic(key: string) {
  return readFromDb(env().SUPABASE_PUBLIC_BUCKET, key);
}
