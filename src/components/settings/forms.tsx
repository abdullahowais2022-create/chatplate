"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Trash2, X } from "lucide-react";
import type { SettingsDTO } from "@/server/services/queries";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { SwitchRow, Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { DAYS, LANGUAGES, PAYMENT_LABEL } from "@/lib/constants";
import { PAYMENT_METHODS } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type FormProps = { settings: SettingsDTO; onSaved?: () => void; submitLabel?: string; readOnly?: boolean };

function useSave(onSaved?: () => void) {
  const [busy, setBusy] = useState(false);
  const save = async (path: string, method: string, body: unknown, msg = "Saved") => {
    setBusy(true);
    try {
      await api(path, { method, body });
      toast.success(msg);
      onSaved?.();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, save };
}

const TIMEZONES = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC", "America/New_York", "Europe/London", "Asia/Dubai"];

export function ProfileForm({ settings, onSaved, submitLabel = "Save", readOnly }: FormProps) {
  const [f, setF] = useState({
    name: settings.name, logoUrl: settings.logoUrl ?? "", address: settings.address ?? "", phone: settings.phone ?? "", email: settings.email ?? "",
    timezone: settings.timezone, currency: settings.currency, latitude: settings.latitude?.toString() ?? "", longitude: settings.longitude?.toString() ?? "",
  });
  const { busy, save } = useSave(onSaved);
  const [uploading, setUploading] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const upload = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    try {
      set("logoUrl", (await api<{ url: string }>("/api/uploads", { form })).url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save("/api/settings/profile", "PUT", { ...f, latitude: f.latitude ? Number(f.latitude) : null, longitude: f.longitude ? Number(f.longitude) : null }); }}>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {f.logoUrl ? <img src={f.logoUrl} alt="Logo" className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground">Logo</span>}
        </div>
        <label className="cursor-pointer rounded-lg border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted">
          {uploading ? "Uploading…" : "Upload logo"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={readOnly} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Restaurant name"><Input required value={f.name} onChange={(e) => set("name", e.target.value)} disabled={readOnly} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} disabled={readOnly} placeholder="+1 555 0100" /></Field>
        <Field label="Address" className="sm:col-span-2" hint="Shared with customers for pickup orders."><Input value={f.address} onChange={(e) => set("address", e.target.value)} disabled={readOnly} /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} disabled={readOnly} /></Field>
        <Field label="Currency" hint="3-letter code, e.g. USD, EUR, AED">
          <Input maxLength={3} value={f.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} disabled={readOnly} />
        </Field>
        <Field label="Timezone" hint="Opening hours are in this timezone.">
          <NativeSelect value={f.timezone} onChange={(e) => set("timezone", e.target.value)} disabled={readOnly}>
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </NativeSelect>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Latitude"><Input inputMode="decimal" value={f.latitude} onChange={(e) => set("latitude", e.target.value)} disabled={readOnly} /></Field>
          <Field label="Longitude"><Input inputMode="decimal" value={f.longitude} onChange={(e) => set("longitude", e.target.value)} disabled={readOnly} /></Field>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Coordinates are used for radius delivery zones. Tip: right-click your restaurant in Google Maps to copy them.</p>
      {!readOnly && <Button type="submit" loading={busy}>{submitLabel}</Button>}
    </form>
  );
}

export function HoursForm({ settings, onSaved, submitLabel = "Save hours", readOnly }: FormProps) {
  const [rows, setRows] = useState(settings.hours.length ? settings.hours : [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, openTime: "11:00", closeTime: "22:00", isClosed: false })));
  const { busy, save } = useSave(onSaved);
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <div className="space-y-3">
      {order.map((d) => {
        const dayRows = rows.map((r, i) => ({ r, i })).filter((x) => x.r.dayOfWeek === d);
        const closed = dayRows.length === 0 || dayRows.every((x) => x.r.isClosed);
        return (
          <div key={d} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
            <div className="flex w-36 items-center gap-2">
              <Switch disabled={readOnly} checked={!closed} onCheckedChange={(open) => setRows((rs) => (open ? [...rs.filter((r) => r.dayOfWeek !== d), { dayOfWeek: d, openTime: "11:00", closeTime: "22:00", isClosed: false }] : rs.filter((r) => r.dayOfWeek !== d)))} />
              <span className="text-sm font-medium">{DAYS[d]}</span>
            </div>
            {closed ? <span className="text-sm text-muted-foreground">Closed</span> : (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {dayRows.map(({ r, i }) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input type="time" className="w-28" disabled={readOnly} value={r.openTime} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, openTime: e.target.value } : x)))} />
                    <span className="text-muted-foreground">–</span>
                    <Input type="time" className="w-28" disabled={readOnly} value={r.closeTime} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, closeTime: e.target.value } : x)))} />
                    {dayRows.length > 1 && !readOnly && <Button variant="ghost" size="icon" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove shift"><X /></Button>}
                  </div>
                ))}
                {!readOnly && <Button variant="ghost" size="sm" onClick={() => setRows((rs) => [...rs, { dayOfWeek: d, openTime: "17:00", closeTime: "22:00", isClosed: false }])}><Plus /> Split shift</Button>}
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">Closing earlier than opening (e.g. 18:00–02:00) means the shift runs past midnight. Times are in {settings.timezone}.</p>
      {!readOnly && <Button loading={busy} onClick={() => save("/api/settings/hours", "PUT", { hours: rows }, "Opening hours saved")}>{submitLabel}</Button>}
    </div>
  );
}

type ZoneRow = { id?: string; name: string; type: "RADIUS" | "AREA"; radiusKm: string; areas: string; fee: string; minimumOrder: string; estimatedMinutes: string; isActive: boolean };

export function DeliveryForm({ settings, onSaved, submitLabel = "Save delivery & pickup", readOnly }: FormProps) {
  const [f, setF] = useState({
    deliveryEnabled: settings.deliveryEnabled, pickupEnabled: settings.pickupEnabled, minimumOrderAmount: String(settings.minimumOrderAmount),
    prepTimeMinutes: String(settings.prepTimeMinutes), allowPreorders: settings.allowPreorders,
    pickupInstructions: settings.pickupInstructions ?? "", deliveryInstructions: settings.deliveryInstructions ?? "",
  });
  const [zones, setZones] = useState<ZoneRow[]>(settings.zones.map((z) => ({ id: z.id, name: z.name, type: z.type, radiusKm: z.radiusKm?.toString() ?? "", areas: z.areas.join(", "), fee: String(z.fee), minimumOrder: z.minimumOrder?.toString() ?? "", estimatedMinutes: z.estimatedMinutes?.toString() ?? "", isActive: z.isActive })));
  const { busy, save } = useSave(onSaved);

  const submit = async () => {
    const ok = await save("/api/settings", "PATCH", { ...f, minimumOrderAmount: Number(f.minimumOrderAmount || 0), prepTimeMinutes: Number(f.prepTimeMinutes || 0), pickupInstructions: f.pickupInstructions || null, deliveryInstructions: f.deliveryInstructions || null }, "Delivery settings saved");
    if (!ok) return;
    await save("/api/settings/zones", "PUT", {
      zones: zones.map((z) => ({ id: z.id, name: z.name, type: z.type, radiusKm: z.type === "RADIUS" ? Number(z.radiusKm) : null, areas: z.type === "AREA" ? z.areas.split(",").map((a) => a.trim()).filter(Boolean) : [], fee: Number(z.fee || 0), minimumOrder: z.minimumOrder ? Number(z.minimumOrder) : null, estimatedMinutes: z.estimatedMinutes ? Number(z.estimatedMinutes) : null, isActive: z.isActive })),
    }, "Delivery zones saved");
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SwitchRow label="Delivery" description="Customers can ask for delivery" checked={f.deliveryEnabled} onCheckedChange={(v) => setF({ ...f, deliveryEnabled: v })} disabled={readOnly} />
        <SwitchRow label="Pickup" description="Customers can collect from the restaurant" checked={f.pickupEnabled} onCheckedChange={(v) => setF({ ...f, pickupEnabled: v })} disabled={readOnly} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={`Minimum order (${settings.currency})`}><Input type="number" min="0" step="0.01" value={f.minimumOrderAmount} onChange={(e) => setF({ ...f, minimumOrderAmount: e.target.value })} disabled={readOnly} /></Field>
        <Field label="Preparation time (min)" hint="Scheduled orders must be at least this far ahead."><Input type="number" min="0" value={f.prepTimeMinutes} onChange={(e) => setF({ ...f, prepTimeMinutes: e.target.value })} disabled={readOnly} /></Field>
        <div className="pt-6"><SwitchRow label="Pre-orders when closed" checked={f.allowPreorders} onCheckedChange={(v) => setF({ ...f, allowPreorders: v })} disabled={readOnly} /></div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Pickup instructions"><Textarea rows={2} value={f.pickupInstructions} onChange={(e) => setF({ ...f, pickupInstructions: e.target.value })} disabled={readOnly} placeholder="Pick up at the counter and mention your order number." /></Field>
        <Field label="Delivery instructions"><Textarea rows={2} value={f.deliveryInstructions} onChange={(e) => setF({ ...f, deliveryInstructions: e.target.value })} disabled={readOnly} placeholder="Our driver will call when they arrive." /></Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div><p className="font-medium">Delivery zones</p><p className="text-xs text-muted-foreground">Radius zones use the location pin; area zones match neighbourhoods or postcodes in the address. The cheapest matching zone applies.</p></div>
          {!readOnly && <Button variant="outline" size="sm" onClick={() => setZones((z) => [...z, { name: "", type: "RADIUS", radiusKm: "3", areas: "", fee: "0", minimumOrder: "", estimatedMinutes: "", isActive: true }])}><Plus /> Zone</Button>}
        </div>
        {zones.length === 0 && <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No zones. Delivery will be accepted anywhere with no fee.</p>}
        <div className="space-y-2">
          {zones.map((z, i) => {
            const upd = (patch: Partial<ZoneRow>) => setZones((zs) => zs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-12 sm:items-end">
                <Field label="Name" className="sm:col-span-3"><Input value={z.name} onChange={(e) => upd({ name: e.target.value })} disabled={readOnly} /></Field>
                <Field label="Type" className="sm:col-span-2"><NativeSelect value={z.type} onChange={(e) => upd({ type: e.target.value as ZoneRow["type"] })} disabled={readOnly}><option value="RADIUS">Radius</option><option value="AREA">Areas</option></NativeSelect></Field>
                {z.type === "RADIUS" ? (
                  <Field label="Radius (km)" className="sm:col-span-2"><Input type="number" min="0.1" step="0.1" value={z.radiusKm} onChange={(e) => upd({ radiusKm: e.target.value })} disabled={readOnly} /></Field>
                ) : (
                  <Field label="Areas / postcodes" className="sm:col-span-2"><Input value={z.areas} onChange={(e) => upd({ areas: e.target.value })} placeholder="Downtown, 10115" disabled={readOnly} /></Field>
                )}
                <Field label="Fee" className="sm:col-span-1"><Input type="number" min="0" step="0.01" value={z.fee} onChange={(e) => upd({ fee: e.target.value })} disabled={readOnly} /></Field>
                <Field label="Min order" className="sm:col-span-2"><Input type="number" min="0" step="0.01" value={z.minimumOrder} onChange={(e) => upd({ minimumOrder: e.target.value })} disabled={readOnly} /></Field>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Switch checked={z.isActive} onCheckedChange={(v) => upd({ isActive: v })} disabled={readOnly} /><span className="text-xs">Active</span>
                  {!readOnly && <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setZones((zs) => zs.filter((_, j) => j !== i))} aria-label="Remove zone"><Trash2 /></Button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!readOnly && <Button loading={busy} onClick={submit}>{submitLabel}</Button>}
    </div>
  );
}

export function PaymentForm({ settings, onSaved, submitLabel = "Save payment options", readOnly }: FormProps) {
  const [methods, setMethods] = useState<string[]>(settings.acceptedPaymentMethods);
  const [ask, setAsk] = useState(settings.askPaymentPreference);
  const [note, setNote] = useState(settings.paymentNote ?? "");
  const { busy, save } = useSave(onSaved);
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">MenuTexter never processes payments, sends payment links or asks for card details. It only records how the customer <b>prefers</b> to pay you.</div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Payment methods you accept</p>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => {
            const on = methods.includes(m);
            return <button type="button" key={m} disabled={readOnly} onClick={() => setMethods(on ? methods.filter((x) => x !== m) : [...methods, m])} className={cn("rounded-lg border px-3 py-1.5 text-sm", on ? "border-primary bg-brand-50 text-brand-800" : "text-muted-foreground")}>{PAYMENT_LABEL[m]}</button>;
          })}
        </div>
      </div>
      <SwitchRow label="Ask customers how they'll pay" description="The AI asks for a payment preference before confirming." checked={ask} onCheckedChange={setAsk} disabled={readOnly} />
      <Field label="Note for customers about payment (optional)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} disabled={readOnly} placeholder="Card machines are available on delivery." /></Field>
      {!readOnly && <Button loading={busy} onClick={() => save("/api/settings", "PATCH", { acceptedPaymentMethods: methods, askPaymentPreference: ask, paymentNote: note || null }, "Payment options saved")}>{submitLabel}</Button>}
    </div>
  );
}

export function AiForm({ settings, onSaved, submitLabel = "Save AI settings", readOnly }: FormProps) {
  const [f, setF] = useState({
    aiEnabled: settings.aiEnabled, aiTone: settings.aiTone, aiCustomInstructions: settings.aiCustomInstructions ?? "", greetingMessage: settings.greetingMessage ?? "",
    autoReplyWhenClosed: settings.autoReplyWhenClosed, closedMessage: settings.closedMessage ?? "", defaultLanguage: settings.defaultLanguage,
    anyLanguage: settings.supportedLanguages.includes("*"), supportedLanguages: settings.supportedLanguages.filter((l) => l !== "*"),
    handoffOnComplaint: settings.handoffOnComplaint, handoffConfidenceThreshold: settings.handoffConfidenceThreshold, handoffKeywords: settings.handoffKeywords.join(", "), maxClarifications: String(settings.maxClarifications),
  });
  const { busy, save } = useSave(onSaved);
  const submit = () =>
    save("/api/settings", "PATCH", {
      aiEnabled: f.aiEnabled, aiTone: f.aiTone, aiCustomInstructions: f.aiCustomInstructions || null, greetingMessage: f.greetingMessage || null,
      autoReplyWhenClosed: f.autoReplyWhenClosed, closedMessage: f.closedMessage || null, defaultLanguage: f.defaultLanguage,
      supportedLanguages: [...(f.anyLanguage ? ["*"] : []), ...new Set([f.defaultLanguage, ...f.supportedLanguages])],
      handoffOnComplaint: f.handoffOnComplaint, handoffConfidenceThreshold: Number(f.handoffConfidenceThreshold), handoffKeywords: f.handoffKeywords.split(",").map((k) => k.trim()).filter(Boolean), maxClarifications: Number(f.maxClarifications),
    }, "AI settings saved");
  return (
    <div className="space-y-5">
      <SwitchRow label="AI assistant replies automatically" description="When off, every message waits for staff (the AI still drafts suggestions)." checked={f.aiEnabled} onCheckedChange={(v) => setF({ ...f, aiEnabled: v })} disabled={readOnly} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Personality & tone">
          <NativeSelect value={f.aiTone} onChange={(e) => setF({ ...f, aiTone: e.target.value })} disabled={readOnly}>
            <option value="friendly">Friendly & warm</option><option value="professional">Professional & concise</option><option value="playful">Playful (light emoji)</option><option value="formal">Formal</option>
          </NativeSelect>
        </Field>
        <Field label="Default language">
          <NativeSelect value={f.defaultLanguage} onChange={(e) => setF({ ...f, defaultLanguage: e.target.value })} disabled={readOnly}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </NativeSelect>
        </Field>
      </div>
      <div className="space-y-2">
        <SwitchRow label="Reply in any language the customer uses" description="Recommended. Otherwise the AI replies only in the languages selected below and uses the default for others." checked={f.anyLanguage} onCheckedChange={(v) => setF({ ...f, anyLanguage: v })} disabled={readOnly} />
        {!f.anyLanguage && (
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => {
              const on = f.supportedLanguages.includes(l.code) || l.code === f.defaultLanguage;
              return <button type="button" key={l.code} disabled={readOnly} onClick={() => setF({ ...f, supportedLanguages: on ? f.supportedLanguages.filter((x) => x !== l.code) : [...f.supportedLanguages, l.code] })} className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-primary bg-brand-50 text-brand-800" : "text-muted-foreground")}>{l.name}</button>;
            })}
          </div>
        )}
      </div>
      <Field label="Greeting message (optional)" hint="Sent the first time someone writes. Leave empty to use the built-in greeting, which is automatically translated.">
        <Textarea rows={2} value={f.greetingMessage} onChange={(e) => setF({ ...f, greetingMessage: e.target.value })} disabled={readOnly} />
      </Field>
      <Field label="Style notes for the AI (optional)" hint="Tone and wording only, e.g. 'Call customers habibi', 'Mention our Friday special'. It can never override menu, prices or safety rules.">
        <Textarea rows={2} value={f.aiCustomInstructions} onChange={(e) => setF({ ...f, aiCustomInstructions: e.target.value })} disabled={readOnly} />
      </Field>
      <SwitchRow label="Auto-reply outside opening hours" checked={f.autoReplyWhenClosed} onCheckedChange={(v) => setF({ ...f, autoReplyWhenClosed: v })} disabled={readOnly} />
      {f.autoReplyWhenClosed && <Field label="Closed message (optional)" hint="Leave empty to tell customers your next opening time automatically."><Textarea rows={2} value={f.closedMessage} onChange={(e) => setF({ ...f, closedMessage: e.target.value })} disabled={readOnly} /></Field>}

      <div className="rounded-lg border p-4">
        <p className="font-medium">Human handoff rules</p>
        <p className="mb-3 text-xs text-muted-foreground">Customers can always type HUMAN or tap &ldquo;Talk to a human&rdquo;. The AI also hands over when:</p>
        <div className="space-y-3">
          <SwitchRow label="A customer complains" checked={f.handoffOnComplaint} onCheckedChange={(v) => setF({ ...f, handoffOnComplaint: v })} disabled={readOnly} />
          <Field label="A message contains any of these words" hint="Comma separated"><Input value={f.handoffKeywords} onChange={(e) => setF({ ...f, handoffKeywords: e.target.value })} disabled={readOnly} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={`AI confidence below ${Math.round(f.handoffConfidenceThreshold * 100)}%`} hint="Low-confidence messages get a clarifying question first.">
              <input type="range" min="0" max="0.9" step="0.05" value={f.handoffConfidenceThreshold} onChange={(e) => setF({ ...f, handoffConfidenceThreshold: Number(e.target.value) })} disabled={readOnly} className="w-full accent-[hsl(var(--primary))]" />
            </Field>
            <Field label="Clarifying questions before handoff"><Input type="number" min="1" max="10" value={f.maxClarifications} onChange={(e) => setF({ ...f, maxClarifications: e.target.value })} disabled={readOnly} /></Field>
          </div>
        </div>
      </div>
      {!readOnly && <Button loading={busy} onClick={submit}>{submitLabel}</Button>}
    </div>
  );
}

export function NotificationsForm({ settings, onSaved, readOnly }: FormProps) {
  const [f, setF] = useState({
    notifyEmail: settings.notifyEmail, notifyEmailAddresses: settings.notifyEmailAddresses.join(", "), notifyWhatsApp: settings.notifyWhatsApp, notifyWhatsAppNumber: settings.notifyWhatsAppNumber ?? "",
    notifyOnNewOrder: settings.notifyOnNewOrder, notifyOnNeedsHuman: settings.notifyOnNeedsHuman, notifyOnComplaint: settings.notifyOnComplaint,
  });
  const { busy, save } = useSave(onSaved);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">The dashboard always updates in real time. Choose extra channels:</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SwitchRow label="New orders" checked={f.notifyOnNewOrder} onCheckedChange={(v) => setF({ ...f, notifyOnNewOrder: v })} disabled={readOnly} />
        <SwitchRow label="Needs a human" checked={f.notifyOnNeedsHuman} onCheckedChange={(v) => setF({ ...f, notifyOnNeedsHuman: v })} disabled={readOnly} />
        <SwitchRow label="Complaints" checked={f.notifyOnComplaint} onCheckedChange={(v) => setF({ ...f, notifyOnComplaint: v })} disabled={readOnly} />
      </div>
      <SwitchRow label="Email notifications" description="Sent to owners and managers, plus any addresses below (requires RESEND_API_KEY)." checked={f.notifyEmail} onCheckedChange={(v) => setF({ ...f, notifyEmail: v })} disabled={readOnly} />
      {f.notifyEmail && <Field label="Extra email addresses" hint="Comma separated"><Input value={f.notifyEmailAddresses} onChange={(e) => setF({ ...f, notifyEmailAddresses: e.target.value })} disabled={readOnly} /></Field>}
      <SwitchRow label="WhatsApp alerts to the owner or manager" description="Sent from your business number. WhatsApp only delivers these if that phone messaged your business number in the last 24 hours." checked={f.notifyWhatsApp} onCheckedChange={(v) => setF({ ...f, notifyWhatsApp: v })} disabled={readOnly} />
      {f.notifyWhatsApp && <Field label="Alert phone number" hint="With country code, e.g. +44 7700 900123"><Input value={f.notifyWhatsAppNumber} onChange={(e) => setF({ ...f, notifyWhatsAppNumber: e.target.value })} disabled={readOnly} /></Field>}
      {!readOnly && (
        <Button loading={busy} onClick={() => save("/api/settings/notifications", "PUT", { ...f, notifyEmailAddresses: f.notifyEmailAddresses.split(",").map((x) => x.trim()).filter(Boolean), notifyWhatsAppNumber: f.notifyWhatsAppNumber || null }, "Notification settings saved")}>Save notifications</Button>
      )}
    </div>
  );
}

export function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [shown, setShown] = useState(!secret);
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input readOnly value={shown ? value : "•".repeat(Math.min(value.length, 32))} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
        {secret && <Button type="button" variant="outline" onClick={() => setShown((s) => !s)}>{shown ? "Hide" : "Show"}</Button>}
        <Button type="button" variant="outline" size="icon" aria-label={`Copy ${label}`} onClick={async () => { await navigator.clipboard.writeText(value); toast.success("Copied"); }}><Copy /></Button>
      </div>
    </Field>
  );
}
