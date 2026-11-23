"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Ban, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/constants";

const ACTION_LABEL: Record<string, string> = { CONFIRMED: "Accept order", PREPARING: "Start preparing", READY: "Mark ready", OUT_FOR_DELIVERY: "Out for delivery", COMPLETED: "Complete" };

type Props = { order: { id: string; status: string; nextStatuses: string[]; assignedToId: string | null; notes: string | null; type: string }; team: { id: string; name: string }[] };

export function OrderActions({ order, team }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [notes, setNotes] = useState(order.notes ?? "");
  const closed = order.status === "COMPLETED" || order.status === "CANCELLED";

  const patch = async (key: string, body: Record<string, unknown>, success: string) => {
    setBusy(key);
    try {
      await api(`/api/orders/${order.id}`, { method: "PATCH", body });
      toast.success(success);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    try {
      await api(`/api/orders/${order.id}/cancel`, { body: { reason: reason || null, notifyCustomer } });
      toast.success("Order cancelled");
      setCancelOpen(false);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap gap-2">
          {order.nextStatuses.map((st, i) => (
            <Button key={st} variant={i === 0 ? "default" : "outline"} loading={busy === st} onClick={() => patch(st, { status: st }, `Order marked ${STATUS_LABEL[st]?.toLowerCase()}. Customer notified.`)}>
              {ACTION_LABEL[st] ?? STATUS_LABEL[st]}
            </Button>
          ))}
          {closed && <p className="self-center text-sm text-muted-foreground">This order is {STATUS_LABEL[order.status]?.toLowerCase()}.</p>}
          <div className="flex-1" />
          <Button variant="outline" asChild><a href={`/print/orders/${order.id}`} target="_blank" rel="noreferrer"><Printer /> Print ticket</a></Button>
          <Button variant="outline" asChild><a href={`/api/orders/${order.id}/ticket`}><Download /> Download</a></Button>
          {!closed && <Button variant="ghost" className="text-destructive hover:bg-red-50 hover:text-destructive" onClick={() => setCancelOpen(true)}><Ban /> Cancel</Button>}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Assigned to">
            <NativeSelect value={order.assignedToId ?? ""} disabled={busy === "assign"} onChange={(e) => patch("assign", { assignedToId: e.target.value || null }, "Assignment updated")}>
              <option value="">Unassigned</option>
              {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Staff notes (internal)">
            <div className="flex gap-2">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} className="min-h-9" placeholder="e.g. Ring the bell twice" />
              <Button variant="outline" disabled={notes === (order.notes ?? "")} loading={busy === "notes"} onClick={() => patch("notes", { notes }, "Notes saved")}>Save</Button>
            </div>
          </Field>
        </div>
      </CardContent>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>This can&apos;t be undone. No payment was taken online, so there&apos;s nothing to refund here.</DialogDescription>
          </DialogHeader>
          <Field label="Reason (optional)"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Out of ingredients" /></Field>
          <label className="flex items-center gap-2 text-sm"><Switch checked={notifyCustomer} onCheckedChange={setNotifyCustomer} /> Notify the customer on WhatsApp</label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep order</Button>
            <Button variant="destructive" loading={busy === "cancel"} onClick={cancel}>Cancel order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
