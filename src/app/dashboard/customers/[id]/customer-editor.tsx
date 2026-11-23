"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { LANGUAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type C = { id: string; name: string | null; tags: string[]; notes: string | null; savedAddress: string | null; preferredLanguage: string | null };
const TAGS = [
  { id: "VIP", label: "⭐ VIP", hint: "" },
  { id: "REGULAR", label: "Regular", hint: "" },
  { id: "BLOCKED", label: "⛔ Blocked", hint: "The AI ignores blocked customers" },
];

export function CustomerEditor({ customer, canEdit }: { customer: C; canEdit: boolean }) {
  const router = useRouter();
  const [f, setF] = useState(customer);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/customers/${customer.id}`, { method: "PATCH", body: { name: f.name || null, tags: f.tags, notes: f.notes || null, savedAddress: f.savedAddress || null, preferredLanguage: f.preferredLanguage || null } });
      toast.success("Customer updated");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Field label="Name"><Input disabled={!canEdit} value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((t) => {
              const on = f.tags.includes(t.id);
              return (
                <button key={t.id} disabled={!canEdit} title={t.hint} onClick={() => setF({ ...f, tags: on ? f.tags.filter((x) => x !== t.id) : [...f.tags, t.id] })} className={cn("rounded-full border px-2.5 py-1 text-xs", on ? (t.id === "BLOCKED" ? "border-red-500 bg-red-50 text-red-700" : "border-brand-500 bg-brand-50 text-brand-800") : "text-muted-foreground")}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Preferred language">
          <NativeSelect disabled={!canEdit} value={f.preferredLanguage ?? ""} onChange={(e) => setF({ ...f, preferredLanguage: e.target.value })}>
            <option value="">Auto-detect</option>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Saved delivery address" hint="Offered automatically on the next delivery order."><Textarea disabled={!canEdit} rows={2} value={f.savedAddress ?? ""} onChange={(e) => setF({ ...f, savedAddress: e.target.value })} /></Field>
        <Field label="Internal notes"><Textarea disabled={!canEdit} rows={3} value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="e.g. Prefers extra napkins" /></Field>
        {canEdit && <Button onClick={save} loading={busy} className="w-full">Save</Button>}
      </CardContent>
    </Card>
  );
}
