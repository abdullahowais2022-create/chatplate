"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FlaskConical, KeyRound, MessageCircle, ScrollText, UserPlus, Users } from "lucide-react";
import type { WhatsAppStatusDTO } from "@/server/services/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Avatar } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WhatsAppConnect } from "@/components/settings/whatsapp-connect";
import { api } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/utils";
import type { RoleName } from "@/lib/permissions";

type Member = { id: string; name: string; email: string; role: RoleName; isActive: boolean; lastLoginAt: string | null };
type AuditRow = { id: string; action: string; entityType: string; actorType: string; actorName: string | null; before: unknown; after: unknown; createdAt: string };

const ROLE_HELP: Record<RoleName, string> = {
  OWNER: "Everything, including team and WhatsApp credentials",
  MANAGER: "Menu, settings, customers, orders, inbox, playground",
  STAFF: "Inbox, orders and sold-out toggles",
};

export function SettingsTabs({ defaultTab, me, team, whatsapp, audit, timezone }: { defaultTab: string; me: { id: string; role: RoleName }; team: Member[]; whatsapp: WhatsAppStatusDTO | null; audit: AuditRow[] | null; timezone: string }) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        {whatsapp && <TabsTrigger value="whatsapp"><MessageCircle /> WhatsApp</TabsTrigger>}
        <TabsTrigger value="team"><Users /> Team</TabsTrigger>
        <TabsTrigger value="account"><KeyRound /> Account</TabsTrigger>
        {audit && <TabsTrigger value="audit"><ScrollText /> Audit log</TabsTrigger>}
      </TabsList>
      {whatsapp && (
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader><CardTitle>WhatsApp Business connection</CardTitle><CardDescription>Uses the official Meta WhatsApp Cloud API.</CardDescription></CardHeader>
            <CardContent><WhatsAppConnect initial={whatsapp} /></CardContent>
          </Card>
          <Card className="mt-4"><CardContent className="flex items-center gap-3 pt-5 text-sm"><FlaskConical className="h-5 w-5 text-brand-600" /><span className="flex-1">Test the assistant before going live.</span><Button variant="outline" asChild><Link href="/dashboard/playground">Open AI playground</Link></Button></CardContent></Card>
        </TabsContent>
      )}
      <TabsContent value="team"><TeamPanel me={me} team={team} /></TabsContent>
      <TabsContent value="account"><PasswordPanel /></TabsContent>
      {audit && (
        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle>Audit log</CardTitle><CardDescription>Order changes, menu edits, settings, staff actions and AI escalations.</CardDescription></CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {audit.map((a) => (
                  <li key={a.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                    <span className="w-40 shrink-0 text-xs text-muted-foreground" title={formatDateTime(a.createdAt, timezone)}>{timeAgo(a.createdAt)}</span>
                    <Badge variant={a.actorType === "AI" ? "brand" : a.actorType === "CUSTOMER" ? "info" : "secondary"} className="w-fit">{a.actorName ?? a.actorType.toLowerCase()}</Badge>
                    <span className="font-mono text-xs">{a.action}</span>
                    <span className="truncate text-xs text-muted-foreground">{summarize(a.after)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
}

function summarize(v: unknown) {
  if (!v || typeof v !== "object") return "";
  return Object.entries(v as Record<string, unknown>).slice(0, 4).map(([k, x]) => `${k}: ${typeof x === "object" ? JSON.stringify(x) : String(x)}`).join(" · ").slice(0, 160);
}

function TeamPanel({ me, team }: { me: { id: string; role: RoleName }; team: Member[] }) {
  const router = useRouter();
  const isOwner = me.role === "OWNER";
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", role: "STAFF" as RoleName, temporaryPassword: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const call = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(msg);
      router.refresh();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div><CardTitle>Team members</CardTitle><CardDescription>Owners manage the team. Everyone signs in with their own email.</CardDescription></div>
        {isOwner && <Button onClick={() => setOpen(true)}><UserPlus /> Add member</Button>}
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {team.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.name} {m.id === me.id && <span className="text-xs text-muted-foreground">(you)</span>} {!m.isActive && <Badge variant="danger">Deactivated</Badge>}</p>
                <p className="text-xs text-muted-foreground">{m.email} · {m.lastLoginAt ? `last seen ${timeAgo(m.lastLoginAt)}` : "never signed in"}</p>
              </div>
              {isOwner && m.id !== me.id ? (
                <div className="flex items-center gap-2">
                  <NativeSelect value={m.role} className="w-32" onChange={(e) => call(m.id, () => api(`/api/team/${m.id}`, { method: "PATCH", body: { role: e.target.value } }), "Role updated")}>
                    <option value="OWNER">Owner</option><option value="MANAGER">Manager</option><option value="STAFF">Staff</option>
                  </NativeSelect>
                  <Button variant="outline" size="sm" loading={busy === `a${m.id}`} onClick={() => call(`a${m.id}`, () => api(`/api/team/${m.id}`, { method: "PATCH", body: { isActive: !m.isActive } }), m.isActive ? "Deactivated and signed out" : "Reactivated")}>{m.isActive ? "Deactivate" : "Activate"}</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => confirm(`Remove ${m.name}?`) && call(`d${m.id}`, () => api(`/api/team/${m.id}`, { method: "DELETE" }), "Removed")}>Remove</Button>
                </div>
              ) : <Badge variant="secondary">{m.role.charAt(0) + m.role.slice(1).toLowerCase()}</Badge>}
            </li>
          ))}
        </ul>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a team member</DialogTitle><DialogDescription>Share the temporary password with them securely. They&apos;ll be asked to change it.</DialogDescription></DialogHeader>
          <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Role" hint={ROLE_HELP[f.role]}>
            <NativeSelect value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as RoleName })}><option value="STAFF">Staff</option><option value="MANAGER">Manager</option><option value="OWNER">Owner</option></NativeSelect>
          </Field>
          <Field label="Temporary password" hint="At least 10 characters with letters and numbers."><Input value={f.temporaryPassword} onChange={(e) => setF({ ...f, temporaryPassword: e.target.value })} /></Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={busy === "add"} onClick={async () => (await call("add", () => api("/api/team", { body: f }), `${f.name} added`)) && (setOpen(false), setF({ name: "", email: "", role: "STAFF", temporaryPassword: "" }))}>Add member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PasswordPanel() {
  const [f, setF] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardHeader><CardTitle>Change password</CardTitle><CardDescription>Changing your password signs you out everywhere else.</CardDescription></CardHeader>
      <CardContent className="max-w-sm space-y-4">
        <Field label="Current password"><Input type="password" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} /></Field>
        <Field label="New password" hint="At least 10 characters with letters and numbers."><Input type="password" autoComplete="new-password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} /></Field>
        <Button
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api("/api/auth/password", { body: f });
              toast.success("Password changed");
              setF({ currentPassword: "", newPassword: "" });
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Update password
        </Button>
      </CardContent>
    </Card>
  );
}
