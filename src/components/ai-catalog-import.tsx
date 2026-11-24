"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, ImageIcon, Plus, ScanText, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { api } from "@/lib/api";
import { imageToDataUrl } from "@/lib/image";

type Item = { name: string; description: string | null; price: number; variants: { name: string; price: number }[] };
type Draft = { categories: { name: string; items: Item[] }[]; greetingMessage: string | null };

const EXAMPLE = `Fruit & veg
Bananas 1 kg - 1.20
Tomatoes 500 g - 0.99

Drinks
Coca-Cola 1.5 L - 1.80`;

/**
 * "Set up with AI": the owner pastes a price list, describes what they sell, or snaps a photo of their
 * menu / price board. The AI drafts categories, products and prices; the owner reviews, edits and saves.
 */
export function AiCatalogImport({ currency, onDone }: { currency: string; onDone?: (created: number) => void }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<"read" | "save" | "photo" | null>(null);

  const pickPhoto = async (file: File) => {
    setBusy("photo");
    try {
      setImage(await imageToDataUrl(file));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const read = async () => {
    setBusy("read");
    try {
      const r = await api<{ draft: Draft }>("/api/menu/import", { body: { mode: "preview", text: text || null, image } });
      setDraft(r.draft);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!draft) return;
    setBusy("save");
    try {
      const r = await api<{ created: number }>("/api/menu/import", { body: { mode: "apply", draft } });
      toast.success(`${r.created} products added. The AI can sell them now.`);
      setDraft(null);
      setText("");
      setImage(null);
      onDone?.(r.created);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const setItem = (ci: number, ii: number, patch: Partial<Item>) =>
    setDraft((d) => d && { ...d, categories: d.categories.map((c, i) => (i !== ci ? c : { ...c, items: c.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) })) });
  const removeItem = (ci: number, ii: number) =>
    setDraft((d) => d && { ...d, categories: d.categories.map((c, i) => (i !== ci ? c : { ...c, items: c.items.filter((_, j) => j !== ii) })).filter((c) => c.items.length) });
  const count = draft?.categories.reduce((n, c) => n + c.items.length, 0) ?? 0;

  if (draft) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-muted p-3 text-sm">
          <span>Check the names and prices ({currency}). Nothing is saved until you press <b>Add {count} products</b>. Prices showing 0 couldn&apos;t be read.</span>
        </div>
        <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
          {draft.categories.map((c, ci) => (
            <div key={ci} className="space-y-2">
              <Input
                aria-label="Category name"
                value={c.name}
                onChange={(e) => setDraft((d) => d && { ...d, categories: d.categories.map((x, i) => (i === ci ? { ...x, name: e.target.value } : x)) })}
                className="h-8 border-transparent bg-muted/60 font-semibold"
              />
              {c.items.map((it, ii) => (
                <div key={ii} className="grid grid-cols-[1fr_96px_36px] items-center gap-2 pl-2">
                  <div className="min-w-0">
                    <Input aria-label="Product name" value={it.name} onChange={(e) => setItem(ci, ii, { name: e.target.value })} />
                    {it.variants.length > 0 && <p className="mt-1 truncate text-xs text-muted-foreground">Options: {it.variants.map((v) => `${v.name} ${v.price}`).join(" · ")}</p>}
                  </div>
                  <Input aria-label="Price" type="number" min={0} step="0.01" value={it.price} onChange={(e) => setItem(ci, ii, { price: Number(e.target.value) })} className={it.price === 0 ? "border-amber-400" : ""} />
                  <Button variant="ghost" size="icon" aria-label={`Remove ${it.name}`} onClick={() => removeItem(ci, ii)}><Trash2 /></Button>
                </div>
              ))}
            </div>
          ))}
        </div>
        {draft.greetingMessage !== null && (
          <Field label="Welcome message (sent to new customers)" hint="Only used if you haven't set one already.">
            <Textarea value={draft.greetingMessage} onChange={(e) => setDraft((d) => d && { ...d, greetingMessage: e.target.value || null })} rows={2} />
          </Field>
        )}
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="ghost" onClick={() => setDraft(null)}>Back</Button>
          <Button onClick={save} loading={busy === "save"} disabled={!count}><Plus /> Add {count} products</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field label="Paste your price list, or describe what you sell" hint="One product per line with its price works best. Headings become categories.">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder={EXAMPLE} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        {image ? (
          <span className="relative inline-flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Menu or price list photo" className="h-20 w-20 rounded-lg border object-cover" />
            <button type="button" onClick={() => setImage(null)} aria-label="Remove photo" className="absolute -right-2 -top-2 rounded-full border bg-card p-0.5 shadow"><X className="h-3.5 w-3.5" /></button>
          </span>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm font-medium hover:bg-muted">
            {busy === "photo" ? <ImageIcon className="h-4 w-4 animate-pulse" /> : <Camera className="h-4 w-4" />}
            Add a photo of your menu or price board
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void pickPhoto(f); }} />
          </label>
        )}
      </div>
      <Button onClick={read} loading={busy === "read"} disabled={!text.trim() && !image}><ScanText /> Read products</Button>
    </div>
  );
}
