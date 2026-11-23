"use client";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, CircleAlert, CircleDashed, ExternalLink, RefreshCw, Send, Unplug } from "lucide-react";
import type { WhatsAppStatusDTO } from "@/server/services/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { CopyField } from "./forms";
import { api } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/utils";

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "danger" | "secondary"; icon: typeof CheckCircle2 }> = {
  CONNECTED: { label: "Connected", variant: "success", icon: CheckCircle2 },
  PENDING_VERIFICATION: { label: "Waiting for webhook verification", variant: "warning", icon: CircleDashed },
  ERROR: { label: "Error", variant: "danger", icon: CircleAlert },
  NOT_CONNECTED: { label: "Not connected", variant: "secondary", icon: CircleDashed },
};

export function WhatsAppConnect({ initial, onChange }: { initial: WhatsAppStatusDTO; onChange?: (s: WhatsAppStatusDTO) => void }) {
  const [s, setS] = useState(initial);
  const [f, setF] = useState({ wabaId: s.wabaId ?? "", phoneNumberId: s.phoneNumberId ?? "", displayPhoneNumber: s.displayPhoneNumber ?? "", accessToken: "", appSecret: "" });
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const update = (next: WhatsAppStatusDTO) => {
    setS(next);
    onChange?.(next);
  };
  const st = STATUS[s.status] ?? STATUS.NOT_CONNECTED!;

  const run = async <T,>(key: string, fn: () => Promise<T>, ok?: string) => {
    setBusy(key);
    try {
      const r = await fn();
      if (ok) toast.success(ok);
      return r;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const saveCreds = () =>
    run("save", async () => {
      const next = await api<WhatsAppStatusDTO>("/api/whatsapp", { method: "PUT", body: { wabaId: f.wabaId, phoneNumberId: f.phoneNumberId, displayPhoneNumber: f.displayPhoneNumber || null, ...(f.accessToken ? { accessToken: f.accessToken } : {}), ...(f.appSecret ? { appSecret: f.appSecret } : {}) } });
      update(next);
      setF((x) => ({ ...x, accessToken: "", appSecret: "" }));
      if (next.status === "ERROR") toast.error(next.lastError ?? "Meta rejected these credentials");
      else toast.success("Credentials saved and verified with Meta");
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/40 p-4">
        <st.icon className={s.status === "CONNECTED" ? "h-6 w-6 text-success" : s.status === "ERROR" ? "h-6 w-6 text-destructive" : "h-6 w-6 text-muted-foreground"} />
        <div className="flex-1">
          <div className="flex items-center gap-2"><p className="font-semibold">{s.displayPhoneNumber ?? "WhatsApp Business number"}</p><Badge variant={st.variant}>{st.label}</Badge></div>
          <p className="text-xs text-muted-foreground">
            Webhook {s.webhookVerifiedAt ? `verified ${timeAgo(s.webhookVerifiedAt)}` : "not verified yet"} · Last event {s.lastWebhookAt ? timeAgo(s.lastWebhookAt) : "never"}{s.lastTestAt ? ` · Test sent ${formatDateTime(s.lastTestAt)}` : ""}
          </p>
          {s.lastError && <p className="mt-1 text-xs text-destructive">{s.lastError}</p>}
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="font-semibold">1. Add these to your Meta app&apos;s webhook settings</h3>
        <p className="text-sm text-muted-foreground">In <a className="text-primary underline" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com <ExternalLink className="inline h-3 w-3" /></a> → your app → WhatsApp → Configuration → Webhook → Edit. Then subscribe to the <b>messages</b> field.</p>
        <CopyField label="Callback URL" value={s.webhookUrl} />
        <div className="flex items-end gap-2">
          <div className="flex-1"><CopyField label="Verify token" value={s.verifyToken} secret /></div>
          <Button variant="outline" loading={busy === "rotate"} onClick={() => run("rotate", async () => update(await api<WhatsAppStatusDTO>("/api/whatsapp/rotate-token", { method: "POST" })), "New verify token generated. Update it in Meta.")}><RefreshCw /> Rotate</Button>
        </div>
        {s.webhookUrl.startsWith("http://") && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Meta requires an HTTPS URL. Set APP_URL to your public HTTPS domain (or use a tunnel such as ngrok/cloudflared while developing).</p>}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">2. Enter your WhatsApp Business credentials</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="WhatsApp Business Account ID"><Input value={f.wabaId} onChange={(e) => setF({ ...f, wabaId: e.target.value.trim() })} placeholder="1234567890" /></Field>
          <Field label="Phone Number ID"><Input value={f.phoneNumberId} onChange={(e) => setF({ ...f, phoneNumberId: e.target.value.trim() })} placeholder="1098765432" /></Field>
          <Field label="Permanent access token" hint={s.hasAccessToken ? "A token is saved. Leave empty to keep it." : "System User token with whatsapp_business_messaging permission."}>
            <Input type="password" autoComplete="off" value={f.accessToken} onChange={(e) => setF({ ...f, accessToken: e.target.value })} placeholder={s.hasAccessToken ? "•••••••• (saved)" : "EAAG…"} />
          </Field>
          <Field label="App secret" hint={s.hasAppSecret ? "Saved. Leave empty to keep it." : "Meta app → Settings → Basic → App secret. Used to verify webhook signatures."}>
            <Input type="password" autoComplete="off" value={f.appSecret} onChange={(e) => setF({ ...f, appSecret: e.target.value.trim() })} placeholder={s.hasAppSecret ? "•••••••• (saved)" : "32 characters"} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">Secrets are encrypted (AES-256-GCM) before they&apos;re stored and are never shown again.</p>
        <Button loading={busy === "save"} onClick={saveCreds} disabled={!f.wabaId || !f.phoneNumberId}>Save & verify</Button>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">3. Send a test message</h3>
        <p className="text-sm text-muted-foreground">Sends Meta&apos;s approved <code>hello_world</code> template to any WhatsApp number.</p>
        <div className="flex gap-2">
          <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="+1 555 010 0000" className="max-w-xs" />
          <Button variant="outline" loading={busy === "test"} disabled={!testTo || !s.hasAccessToken} onClick={() => run("test", () => api("/api/whatsapp/test", { body: { to: testTo } }), "Test message sent. Check WhatsApp.")}><Send /> Send test</Button>
        </div>
      </section>

      {s.hasAccessToken && (
        <div className="border-t pt-4">
          <Button variant="ghost" className="text-destructive" loading={busy === "disconnect"} onClick={() => confirm("Disconnect WhatsApp? The AI will stop receiving messages.") && run("disconnect", async () => update(await api<WhatsAppStatusDTO>("/api/whatsapp", { method: "DELETE" })), "Disconnected")}><Unplug /> Disconnect</Button>
        </div>
      )}
    </div>
  );
}
