import "server-only";
import { toFile } from "openai";
import { openai } from "./openai";
import { env } from "../env";

const EXT: Record<string, string> = { "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac", "audio/amr": "amr", "audio/wav": "wav", "audio/webm": "webm" };

export type Transcription = { ok: true; text: string } | { ok: false; reason: string };

/** Transcribes a WhatsApp voice note (OGG/Opus) with Whisper or gpt-4o-transcribe. */
export async function transcribe(data: Buffer, mimeType: string): Promise<Transcription> {
  const c = openai();
  if (!c) return { ok: false, reason: "Speech-to-text is not configured (OPENAI_API_KEY missing)" };
  const base = mimeType.split(";")[0]!.trim();
  try {
    const file = await toFile(data, `voice.${EXT[base] ?? "ogg"}`, { type: base });
    const res = await c.audio.transcriptions.create({ file, model: env().OPENAI_TRANSCRIBE_MODEL, response_format: "json" });
    const text = (res as { text?: string }).text?.trim() ?? "";
    // Whisper sometimes returns filler on silence/noise.
    if (text.replace(/[^\p{L}\p{N}]/gu, "").length < 2) return { ok: false, reason: "Transcript was empty or unclear" };
    return { ok: true, text };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}
