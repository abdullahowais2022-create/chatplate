/**
 * Shrinks a photo in the browser before upload, so big phone pictures (often 5-10 MB) still upload
 * quickly and fit the 2 MB limit. Re-encodes to WebP (JPEG where WebP isn't supported).
 */
export async function shrinkImage(file: File, maxSide = 1024): Promise<File> {
  if (!/^image\/(png|jpe?g|webp|heic|heif|gif|avif)$/i.test(file.type) && file.type !== "") {
    throw new Error("Please choose a photo (PNG, JPEG or WebP).");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // The browser can't decode it (e.g. HEIC on some desktops). Let the server decide.
    return file;
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const toBlob = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.86));
  const blob = (await toBlob("image/webp")) ?? (await toBlob("image/jpeg"));
  if (!blob) return file;
  const type = blob.type || "image/jpeg";
  return new File([blob], `image.${type === "image/webp" ? "webp" : "jpg"}`, { type });
}

/** Shrinks then uploads an image; returns its public URL. */
export async function uploadImage(file: File, maxSide = 1024): Promise<string> {
  const { api } = await import("./api");
  const form = new FormData();
  form.append("file", await shrinkImage(file, maxSide));
  return (await api<{ url: string }>("/api/uploads", { form })).url;
}

/** Shrinks a photo and returns it as a data URL (used to send a menu/price-board photo to the AI). */
export async function imageToDataUrl(file: File, maxSide = 1600): Promise<string> {
  const small = await shrinkImage(file, maxSide);
  if (!/^image\/(png|jpeg|webp)$/.test(small.type)) throw new Error("Please choose a PNG, JPEG or WebP photo.");
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Couldn't read that photo."));
    r.readAsDataURL(small);
  });
}
