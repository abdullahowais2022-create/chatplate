import "server-only";
import OpenAI from "openai";
import { env } from "../env";

let client: OpenAI | null = null;

export function openai(): OpenAI | null {
  const key = env().OPENAI_API_KEY;
  if (!key) return null;
  client ??= new OpenAI({ apiKey: key, timeout: 25_000, maxRetries: 2 });
  return client;
}

/** Older chat models accept `temperature`; reasoning models only allow the default. */
export function samplingParams(model: string) {
  return /^gpt-4/.test(model) ? { temperature: 0.2 } : {};
}

export async function jsonCompletion<T>(opts: {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T> {
  const c = openai();
  if (!c) throw new Error("OpenAI is not configured");
  const model = env().OPENAI_MODEL;
  const res = await c.chat.completions.create({
    model,
    ...samplingParams(model),
    max_completion_tokens: opts.maxTokens ?? 1500,
    response_format: { type: "json_schema", json_schema: { name: opts.schemaName, strict: true, schema: opts.schema } },
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  });
  const choice = res.choices[0];
  if (choice?.message.refusal) throw new Error(`Model refused: ${choice.message.refusal}`);
  const content = choice?.message.content;
  if (!content) throw new Error("Empty model response");
  return JSON.parse(content) as T;
}
