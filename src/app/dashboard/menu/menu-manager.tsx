"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ScanText, ImagePlus, Languages, Pencil, Plus, Search, Trash2, UtensilsCrossed, X } from "lucide-react";
import type { MenuCategoryDTO, MenuItemDTO } from "@/server/services/queries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/image";
import { AiCatalogImport } from "@/components/ai-catalog-import";
import { DIETARY_TAGS } from "@/lib/schemas";
import { cn, money } from "@/lib/utils";

const TRANSLATION_LANGS = [
  { code: "ar", name: "Arabic" }, { code: "fr", name: "French" }, { code: "es", name: "Spanish" },
  { code: "hi", name: "Hindi" }, { code: "ur", name: "Urdu" }, { code: "tr", name: "Turkish" },
];
const TAG_LABEL: Record<string, string> = { vegetarian: "Vegetarian", vegan: "Vegan", gluten_free: "Gluten-free", halal: "Halal", spicy: "Spicy", contains_nuts: "Contains nuts", dairy_free: "Dairy-free" };

type Props = { menu: MenuCategoryDTO[]; currency: string; canEdit: boolean; title?: string };

export function MenuManager({ menu, currency, canEdit, title = "Products" }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [editing, setEditing] = useState<{ item: Partial<MenuItemDTO> | null; open: boolean }>({ item: null, open: false });
  const [aiOpen, setAiOpen] = useState(false);
  const [catDialog, setCatDialog] = useState<{ open: boolean; cat: Partial<MenuCategoryDTO> | null }>({ open: false, cat: null });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return menu
      .filter((c) => activeCat === "all" || c.id === activeCat)
      .map((c) => ({ ...c, items: c.items.filter((i) => !needle || i.name.toLowerCase().includes(needle) || i.aliases.some((a) => a.toLowerCase().includes(needle))) }))
      .filter((c) => !needle || c.items.length);
  }, [menu, q, activeCat]);

  const toggle = async (item: MenuItemDTO, data: { isSoldOut?: boolean; isAvailable?: boolean }) => {
    try {
      await api(`/api/menu/items/${item.id}`, { method: "PATCH", body: data });
      toast.success(data.isSoldOut !== undefined ? (data.isSoldOut ? `${item.name} marked sold out. The AI will stop offering it.` : `${item.name} is back in stock`) : data.isAvailable ? `${item.name} is visible again` : `${item.name} hidden from the menu`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const totalItems = menu.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import your price list</DialogTitle>
            <DialogDescription>Paste a price list, describe what you sell, or add a photo of your menu or price board. You review everything before it&apos;s saved.</DialogDescription>
          </DialogHeader>
          <AiCatalogImport currency={currency} onDone={() => { setAiOpen(false); router.refresh(); }} />
        </DialogContent>
      </Dialog>
      <PageHeader
        title={title}
        description="The AI only offers what's here: the exact names, prices, sizes and extras. Mark items sold out and the AI stops accepting them instantly."
        actions={canEdit && (
          <>
            <Button variant="outline" onClick={() => setAiOpen(true)}><ScanText /> Import price list</Button>
            <Button variant="outline" onClick={() => setCatDialog({ open: true, cat: null })}><Plus /> Category</Button>
            <Button onClick={() => setEditing({ open: true, item: { categoryId: activeCat !== "all" ? activeCat : menu[0]?.id } })} disabled={!menu.length}><Plus /> Product</Button>
          </>
        )}
      />

      {menu.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title={`Your ${title.toLowerCase()} list is empty`} description="Start by adding a category (e.g. Pizza, Drinks, Fruit & veg, Skincare), then add items with prices." action={canEdit && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setAiOpen(true)}><ScanText /> Import from a photo or list</Button>
              <Button variant="outline" onClick={() => setCatDialog({ open: true, cat: null })}><Plus /> Add a category</Button>
            </div>
          )} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex flex-1 gap-1 overflow-x-auto rounded-lg bg-muted p-1 scrollbar-thin">
              <button onClick={() => setActiveCat("all")} className={cn("whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium", activeCat === "all" ? "bg-card shadow" : "text-muted-foreground")}>All ({totalItems})</button>
              {menu.map((c) => (
                <button key={c.id} onClick={() => setActiveCat(c.id)} className={cn("whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium", activeCat === c.id ? "bg-card shadow" : "text-muted-foreground", !c.isActive && "line-through")}>{c.name} ({c.items.length})</button>
              ))}
            </div>
            <div className="relative md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" className="pl-9" />
            </div>
          </div>

          <div className="space-y-8">
            {filtered.map((c) => (
              <section key={c.id}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{c.name}</h2>
                  {!c.isActive && <Badge variant="secondary">Hidden</Badge>}
                  {Object.keys(c.nameI18n).length > 0 && <Badge variant="outline"><Languages /> {Object.keys(c.nameI18n).length}</Badge>}
                  {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCatDialog({ open: true, cat: c })} aria-label="Edit category"><Pencil /></Button>}
                </div>
                {c.items.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No items in this category yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {c.items.map((i) => (
                      <Card key={i.id} className={cn("flex gap-3 p-3", (!i.isAvailable || i.isSoldOut) && "bg-muted/40")}>
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {i.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={i.imageUrl} alt="" className={cn("h-full w-full object-cover", i.isSoldOut && "grayscale")} />
                          ) : <div className="flex h-full items-center justify-center text-muted-foreground"><UtensilsCrossed className="h-6 w-6" /></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-1">
                            <p className="flex-1 font-medium leading-tight">{i.name}</p>
                            {canEdit && <Button variant="ghost" size="icon" className="-mr-1 -mt-1 h-7 w-7" onClick={() => setEditing({ open: true, item: i })} aria-label="Edit"><Pencil /></Button>}
                          </div>
                          <p className="num text-[13px] text-foreground">
                            {i.variants.length ? i.variants.map((v) => `${v.name} ${money(v.price, currency)}`).join(" · ") : money(i.price, currency)}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {i.isSoldOut && <Badge variant="danger">Sold out</Badge>}
                            {!i.isAvailable && <Badge variant="secondary">Hidden</Badge>}
                            {i.dietaryTags.map((t) => <Badge key={t} variant="success" className="text-[10px]">{TAG_LABEL[t] ?? t}</Badge>)}
                            {i.addons.length > 0 && <Badge variant="outline" className="text-[10px]">{i.addons.length} add-ons</Badge>}
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-xs">
                            <label className="flex items-center gap-1.5"><Switch checked={!i.isSoldOut} onCheckedChange={(v) => toggle(i, { isSoldOut: !v })} /> In stock</label>
                            {canEdit && <label className="flex items-center gap-1.5"><Switch checked={i.isAvailable} onCheckedChange={(v) => toggle(i, { isAvailable: v })} /> On menu</label>}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}

      {editing.open && <ItemEditor key={editing.item?.id ?? "new"} item={editing.item} categories={menu} currency={currency} onClose={() => setEditing({ open: false, item: null })} />}
      {catDialog.open && <CategoryEditor cat={catDialog.cat} onClose={() => setCatDialog({ open: false, cat: null })} />}
    </div>
  );
}

function CategoryEditor({ cat, onClose }: { cat: Partial<MenuCategoryDTO> | null; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(cat?.name ?? "");
  const [i18n, setI18n] = useState<Record<string, string>>(cat?.nameI18n ?? {});
  const [isActive, setIsActive] = useState(cat?.isActive ?? true);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const body = { name, nameI18n: clean(i18n), isActive };
      if (cat?.id) await api(`/api/menu/categories/${cat.id}`, { method: "PATCH", body });
      else await api("/api/menu/categories", { body });
      toast.success("Category saved");
      router.refresh();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!cat?.id || !confirm(`Delete "${cat.name}" and all its items? Past orders are not affected.`)) return;
    setBusy(true);
    try {
      await api(`/api/menu/categories/${cat.id}`, { method: "DELETE" });
      toast.success("Category deleted");
      router.refresh();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{cat?.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pizza" autoFocus /></Field>
        <TranslationFields label="Translated names" values={i18n} onChange={setI18n} />
        <label className="flex items-center gap-2 text-sm"><Switch checked={isActive} onCheckedChange={setIsActive} /> Visible to the AI</label>
        <DialogFooter>
          {cat?.id && <Button variant="ghost" className="mr-auto text-destructive" onClick={remove} disabled={busy}><Trash2 /> Delete</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy} disabled={!name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type VariantRow = { id?: string; name: string; price: string; isDefault: boolean; isAvailable: boolean; nameI18n: Record<string, string> };
type AddonRow = { id?: string; name: string; price: string; isAvailable: boolean; nameI18n: Record<string, string> };

function ItemEditor({ item, categories, currency, onClose }: { item: Partial<MenuItemDTO> | null; categories: MenuCategoryDTO[]; currency: string; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    categoryId: item?.categoryId ?? categories[0]?.id ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: String(item?.price ?? ""),
    imageUrl: item?.imageUrl ?? "",
    isAvailable: item?.isAvailable ?? true,
    isSoldOut: item?.isSoldOut ?? false,
    dietaryTags: item?.dietaryTags ?? [],
    aliases: (item?.aliases ?? []).join(", "),
    nameI18n: item?.nameI18n ?? {},
    descriptionI18n: item?.descriptionI18n ?? {},
  });
  const [variants, setVariants] = useState<VariantRow[]>((item?.variants ?? []).map((v) => ({ ...v, price: String(v.price) })));
  const [addons, setAddons] = useState<AddonRow[]>((item?.addons ?? []).map((a) => ({ ...a, price: String(a.price) })));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const upload = async (file: File) => {
    setUploading(true);
    try {
      set("imageUrl", await uploadImage(file));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        ...f,
        price: Number(f.price || variants[0]?.price || 0),
        description: f.description || null,
        imageUrl: f.imageUrl || null,
        aliases: f.aliases.split(",").map((a) => a.trim()).filter(Boolean),
        nameI18n: clean(f.nameI18n),
        descriptionI18n: clean(f.descriptionI18n),
        variants: variants.filter((v) => v.name.trim()).map((v) => ({ ...v, price: Number(v.price || 0), nameI18n: clean(v.nameI18n) })),
        addons: addons.filter((a) => a.name.trim()).map((a) => ({ ...a, price: Number(a.price || 0), nameI18n: clean(a.nameI18n) })),
      };
      if (item?.id) await api(`/api/menu/items/${item.id}`, { method: "PUT", body });
      else await api("/api/menu/items", { body });
      toast.success("Menu item saved. The AI uses it right away.");
      router.refresh();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!item?.id || !confirm(`Delete "${item.name}"? Past orders keep their copy.`)) return;
    setBusy(true);
    try {
      await api(`/api/menu/items/${item.id}`, { method: "DELETE" });
      toast.success("Item deleted");
      router.refresh();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item?.id ? "Edit menu item" : "New menu item"}</DialogTitle>
          <DialogDescription>Customers can order this on WhatsApp by name, alias or any translated name.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Pepperoni Pizza" /></Field>
              <Field label="Category">
                <NativeSelect value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Description"><Textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} /></Field>
          </div>
          <div className="space-y-2">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {f.imageUrl ? <img src={f.imageUrl} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-8 w-8 text-muted-foreground" />}
            </div>
            <label className="block cursor-pointer rounded-md border bg-card px-2 py-1 text-center text-xs font-medium hover:bg-muted">
              {uploading ? "Uploading…" : "Upload photo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={`Base price (${currency})`} hint={variants.length ? "Variant prices are used instead." : undefined}><Input type="number" min="0" step="0.01" value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
          <Field label="Other names customers use" hint="Comma separated, e.g. coke, cola"><Input value={f.aliases} onChange={(e) => set("aliases", e.target.value)} /></Field>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium">Dietary tags</p>
          <div className="flex flex-wrap gap-1.5">
            {DIETARY_TAGS.map((t) => {
              const on = f.dietaryTags.includes(t);
              return <button type="button" key={t} onClick={() => set("dietaryTags", on ? f.dietaryTags.filter((x) => x !== t) : [...f.dietaryTags, t])} className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "text-muted-foreground")}>{TAG_LABEL[t]}</button>;
            })}
          </div>
        </div>

        <RowsEditor
          title="Sizes / variants"
          hint="e.g. Small / Medium / Large. Without a default, the AI asks the customer which one."
          rows={variants}
          onAdd={() => setVariants((v) => [...v, { name: "", price: "", isDefault: false, isAvailable: true, nameI18n: {} }])}
          render={(v, i) => (
            <>
              <Input value={v.name} onChange={(e) => setVariants((rows) => rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} placeholder="Large" className="flex-1" />
              <Input type="number" step="0.01" min="0" value={v.price} onChange={(e) => setVariants((rows) => rows.map((r, j) => (j === i ? { ...r, price: e.target.value } : r)))} placeholder="Price" className="w-24" />
              <label className="flex items-center gap-1 text-xs"><input type="radio" checked={v.isDefault} onChange={() => setVariants((rows) => rows.map((r, j) => ({ ...r, isDefault: j === i })))} onClick={() => v.isDefault && setVariants((rows) => rows.map((r) => ({ ...r, isDefault: false })))} /> Default</label>
              <Switch checked={v.isAvailable} onCheckedChange={(on) => setVariants((rows) => rows.map((r, j) => (j === i ? { ...r, isAvailable: on } : r)))} aria-label="Available" />
              <Button type="button" variant="ghost" size="icon" onClick={() => setVariants((rows) => rows.filter((_, j) => j !== i))} aria-label="Remove"><X /></Button>
            </>
          )}
        />
        <RowsEditor
          title="Add-ons"
          hint="Extras the customer can ask for, e.g. Extra cheese +1.50"
          rows={addons}
          onAdd={() => setAddons((a) => [...a, { name: "", price: "", isAvailable: true, nameI18n: {} }])}
          render={(a, i) => (
            <>
              <Input value={a.name} onChange={(e) => setAddons((rows) => rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} placeholder="Extra cheese" className="flex-1" />
              <Input type="number" step="0.01" min="0" value={a.price} onChange={(e) => setAddons((rows) => rows.map((r, j) => (j === i ? { ...r, price: e.target.value } : r)))} placeholder="Price" className="w-24" />
              <Switch checked={a.isAvailable} onCheckedChange={(on) => setAddons((rows) => rows.map((r, j) => (j === i ? { ...r, isAvailable: on } : r)))} aria-label="Available" />
              <Button type="button" variant="ghost" size="icon" onClick={() => setAddons((rows) => rows.filter((_, j) => j !== i))} aria-label="Remove"><X /></Button>
            </>
          )}
        />

        <TranslationFields label="Translated names" values={f.nameI18n} onChange={(v) => set("nameI18n", v)} />
        <TranslationFields label="Translated descriptions" values={f.descriptionI18n} onChange={(v) => set("descriptionI18n", v)} multiline />

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><Switch checked={!f.isSoldOut} onCheckedChange={(v) => set("isSoldOut", !v)} /> In stock</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.isAvailable} onCheckedChange={(v) => set("isAvailable", v)} /> On menu</label>
        </div>

        <DialogFooter>
          {item?.id && <Button variant="ghost" className="mr-auto text-destructive" onClick={remove} disabled={busy}><Trash2 /> Delete</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy} disabled={!f.name.trim() || !f.categoryId || (!f.price && !variants.length)}>Save item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RowsEditor<T>({ title, hint, rows, onAdd, render }: { title: string; hint: string; rows: T[]; onAdd: () => void; render: (row: T, i: number) => React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{hint}</p></div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}><Plus /> Add</Button>
      </div>
      <div className="space-y-2">{rows.map((r, i) => <div key={i} className="flex items-center gap-2">{render(r, i)}</div>)}</div>
    </div>
  );
}

function TranslationFields({ label, values, onChange, multiline }: { label: string; values: Record<string, string>; onChange: (v: Record<string, string>) => void; multiline?: boolean }) {
  const [open, setOpen] = useState(Object.keys(values).length > 0);
  return (
    <div className="rounded-lg border p-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-sm font-medium">
        <Languages className="h-4 w-4" /> {label} <span className="text-xs font-normal text-muted-foreground">({Object.values(values).filter(Boolean).length} of {TRANSLATION_LANGS.length})</span>
        <span className="ml-auto text-xs text-primary">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TRANSLATION_LANGS.map((l) => (
            <Field key={l.code} label={l.name}>
              {multiline ? (
                <Textarea dir="auto" rows={2} value={values[l.code] ?? ""} onChange={(e) => onChange({ ...values, [l.code]: e.target.value })} />
              ) : (
                <Input dir="auto" value={values[l.code] ?? ""} onChange={(e) => onChange({ ...values, [l.code]: e.target.value })} />
              )}
            </Field>
          ))}
        </div>
      )}
    </div>
  );
}

function clean(o: Record<string, string>) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v?.trim()).map(([k, v]) => [k, v.trim()]));
}
