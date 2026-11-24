"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bot, Braces, CircleCheck, FlaskConical, MapPin, MessageCircle, RotateCcw, Send, ShoppingCart, User } from "lucide-react";
import type { ConversationDetail } from "@/server/services/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useLive } from "@/components/dashboard/live";
import { api } from "@/lib/api";
import { languageName } from "@/lib/constants";
import { cn, money } from "@/lib/utils";

const SAMPLES = [
  "I want 2 large pepperoni pizzas, one without onions, and a Coke.",
  "Can I get 3 shawarma sandwiches for delivery?",
  "I want 2 chicken burgers, no mayo, and one fries.",
  "Make it 4 burgers instead of 3.",
  "Remove the fries.",
  "Cancel my order.",
  "What time do you open?",
  "Do you deliver to Williamsburg?",
  "بدي بيتزا مارغريتا وسط وكولا",
  "Je voudrais deux falafels à emporter",
  "Quiero una hamburguesa doble",
  "मुझे दो चिकन शावरमा चाहिए",
  "Bir büyük pepperoni pizza istiyorum",
  "I have a nut allergy, is the baklava safe?",
];

type Result = {
  engine: string;
  language: string;
  intent: string;
  action: string;
  wouldDo: string;
  missing: string[];
  reply: string;
  outbound: { kind: string; text: string; buttons?: { id: string; title: string }[] }[];
  extraction: Record<string, unknown> & { items: { name: string; quantity: number; variant: string | null; addons: string[]; removals: string[]; unit_price: number; line_total: number }[]; confidence: number };
  handoffReason: string | null;
  flagForStaff: string | null;
  errors: string[];
  durationMs: number;
  next: { state: string; draft: unknown; language: string };
};

const WOULD: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "secondary" }> = {
  create_order: { label: "Would CREATE an order", variant: "success" },
  modify_order: { label: "Would MODIFY an order", variant: "warning" },
  cancel_order: { label: "Would CANCEL an order", variant: "danger" },
  awaiting_confirmation: { label: "Shows summary, waits for confirmation", variant: "info" },
  none: { label: "No order change", variant: "secondary" },
};

export function Playground({ openai, restaurantLocation }: { openai: boolean; restaurantLocation: { lat: number; lng: number } | null }) {
  return (
    <>
      {!openai && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <b>Demo engine:</b> no <code>OPENAI_API_KEY</code> is configured, so a built-in rule-based parser is used. It handles common phrasings in 7 languages. Add an OpenAI key for full natural-language understanding, voice notes and replies in any language.
        </div>
      )}
      <Tabs defaultValue="tester">
        <TabsList>
          <TabsTrigger value="tester"><FlaskConical /> Message tester</TabsTrigger>
          <TabsTrigger value="simulator"><MessageCircle /> Customer simulator</TabsTrigger>
        </TabsList>
        <TabsContent value="tester"><Tester openai={openai} /></TabsContent>
        <TabsContent value="simulator"><Simulator restaurantLocation={restaurantLocation} /></TabsContent>
      </Tabs>
    </>
  );
}

function Tester({ openai }: { openai: boolean }) {
  const [message, setMessage] = useState(SAMPLES[0]!);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [multi, setMulti] = useState(false);
  const [heuristic, setHeuristic] = useState(false);
  const [session, setSession] = useState<{ state: string; draft: unknown; language: string | null; history: { role: "customer" | "assistant"; text: string }[] }>({ state: "IDLE", draft: null, language: null, history: [] });
  const [showJson, setShowJson] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const body = multi ? { message, state: session.state, draft: session.draft, history: session.history, language: session.language, forceHeuristic: heuristic } : { message, forceHeuristic: heuristic };
      const r = await api<Result>("/api/playground", { body });
      setResult(r);
      if (multi) setSession((s) => ({ state: r.next.state, draft: r.next.draft, language: r.next.language, history: [...s.history, { role: "customer", text: message }, { role: "assistant", text: r.reply }] }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    setSession({ state: "IDLE", draft: null, language: null, history: [] });
    setResult(null);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader><CardTitle>Customer message</CardTitle><CardDescription>Nothing is saved or sent. This is a dry run against your live menu.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Textarea dir="auto" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void run(); }} />
            <div className="flex flex-wrap gap-1.5">
              {SAMPLES.map((s) => <button key={s} onClick={() => setMessage(s)} dir="auto" className="max-w-full truncate rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground">{s}</button>)}
            </div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={multi} onCheckedChange={(v) => { setMulti(v); reset(); }} /> Multi-turn (keep the cart between messages)</label>
            {openai && <label className="flex items-center gap-2 text-sm"><Switch checked={heuristic} onCheckedChange={setHeuristic} /> Compare with the offline rule-based engine</label>}
            <div className="flex gap-2">
              <Button onClick={run} loading={busy} disabled={!message.trim()} className="flex-1"><Send /> Test message</Button>
              {multi && <Button variant="outline" onClick={reset}><RotateCcw /> Reset</Button>}
            </div>
          </CardContent>
        </Card>
        {multi && session.history.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Conversation so far · state <code>{session.state}</code></CardTitle></CardHeader>
            <CardContent className="chat-bg max-h-80 space-y-2 overflow-y-auto rounded-b-xl p-3">
              {session.history.map((h, i) => <p key={i} dir="auto" className={cn("max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-1.5 text-sm shadow-sm", h.role === "customer" ? "bg-white" : "ml-auto bg-[#fde6d4]")}>{h.text}</p>)}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4 lg:col-span-3">
        {!result ? (
          <Card className="flex h-full min-h-64 items-center justify-center border-dashed p-8 text-center text-sm text-muted-foreground">Run a message to see what the AI understands and how it would reply.</Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Mini label="Language" value={languageName(result.language)} />
              <Mini label="Intent" value={result.intent.replace("_", " ")} />
              <Mini label="Confidence" value={`${Math.round(result.extraction.confidence * 100)}%`} />
              <Mini label="Engine" value={`${result.engine} · ${result.durationMs}ms`} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={WOULD[result.wouldDo]?.variant ?? "secondary"} className="px-3 py-1 text-sm"><ShoppingCart /> {WOULD[result.wouldDo]?.label ?? result.wouldDo}</Badge>
              <Badge variant="outline" className="px-3 py-1 text-sm">Next step: {result.action.replace("_", " ")}</Badge>
              {result.handoffReason && <Badge variant="danger" className="px-3 py-1 text-sm">Hands off to staff: {result.handoffReason}</Badge>}
              {result.flagForStaff && <Badge variant="warning" className="px-3 py-1 text-sm">Flags for staff: {result.flagForStaff}</Badge>}
            </div>

            <Card>
              <CardHeader><CardTitle>Extracted order</CardTitle></CardHeader>
              <CardContent>
                {result.extraction.items.length === 0 ? <p className="text-sm text-muted-foreground">No items.</p> : (
                  <table className="w-full text-sm">
                    <tbody className="divide-y">
                      {result.extraction.items.map((i, k) => (
                        <tr key={k}>
                          <td className="py-2 pr-2 font-semibold">{i.quantity}×</td>
                          <td className="py-2">{i.name}{i.variant && <span className="text-muted-foreground"> · {i.variant}</span>}{i.addons.length > 0 && <span className="text-emerald-700"> + {i.addons.join(", ")}</span>}{i.removals.length > 0 && <span className="text-red-600"> · no {i.removals.join(", ")}</span>}</td>
                          <td className="py-2 text-right text-muted-foreground">{i.unit_price ? money(i.unit_price) : "size?"}</td>
                          <td className="py-2 text-right font-medium">{money(i.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Missing:</span>
                  {result.missing.length ? result.missing.map((m) => <Badge key={m} variant="warning">{m.replace("_", " ")}</Badge>) : <Badge variant="success"><CircleCheck /> nothing</Badge>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Proposed WhatsApp reply</CardTitle></CardHeader>
              <CardContent className="chat-bg space-y-2 rounded-b-xl p-4">
                {result.outbound.length === 0 && <p className="text-sm italic text-muted-foreground">{result.reply || "No reply. The order confirmation is sent once the order is created."}</p>}
                {result.outbound.map((o, i) => (
                  <div key={i} className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-[#fde6d4] px-3 py-2 text-sm shadow-sm">
                    <p dir="auto" className="whitespace-pre-wrap">{o.text}</p>
                    {o.kind === "location_request" && <p className="mt-2 flex items-center gap-1 rounded-lg bg-white/70 px-2 py-1 text-xs font-medium text-sky-700"><MapPin className="h-3 w-3" /> Send location</p>}
                    {o.buttons && <div className="mt-2 grid gap-1">{o.buttons.map((b) => <span key={b.id} className="rounded-lg bg-white/80 py-1 text-center text-xs font-medium text-sky-700">{b.title}</span>)}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Structured JSON</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowJson((s) => !s)}><Braces /> {showJson ? "Hide" : "Show"}</Button>
              </CardHeader>
              {showJson && <CardContent><pre className="max-h-96 overflow-auto rounded-lg bg-ink p-3 text-xs text-white">{JSON.stringify(result.extraction, null, 2)}</pre></CardContent>}
            </Card>
            {result.errors.length > 0 && <p className="text-xs text-destructive">Errors (fell back to the rule-based engine): {result.errors.join("; ")}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 truncate font-semibold capitalize">{value}</p></div>;
}

function Simulator({ restaurantLocation }: { restaurantLocation: { lat: number; lng: number } | null }) {
  const live = useLive();
  const [customer, setCustomer] = useState("Test customer");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;
    api<ConversationDetail>(`/api/conversations/${conversationId}`).then(setConv).catch(() => undefined);
  }, [conversationId, live.version]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages.length]);

  const send = async (payload: { text?: string; buttonId?: string; location?: { lat: number; lng: number; address?: string } }) => {
    setBusy(true);
    try {
      const r = await api<{ conversationId: string | null }>("/api/simulator", { body: { customer, ...payload } });
      if (r.conversationId) {
        setConversationId(r.conversationId);
        setConv(await api<ConversationDetail>(`/api/conversations/${r.conversationId}`));
      }
      setText("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const shareLocation = () => {
    if (!restaurantLocation) return toast.error("Set your restaurant's coordinates in Business settings first.");
    // ~1.2 km away from the restaurant
    void send({ location: { lat: restaurantLocation.lat + 0.008, lng: restaurantLocation.lng + 0.008, address: "Simulated pin near the restaurant" } });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader><CardTitle>How it works</CardTitle><CardDescription>Chat as a customer through the <b>real</b> pipeline. Orders you confirm here appear in Orders and the Inbox (marked simulated). Nothing is sent to WhatsApp.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><p className="text-sm font-medium">Customer name</p><Input value={customer} onChange={(e) => { setCustomer(e.target.value); setConversationId(null); setConv(null); }} /></div>
          <p className="text-xs text-muted-foreground">Change the name to start a fresh customer. Tap the reply buttons in the chat just like on WhatsApp.</p>
          {conversationId && <Button variant="outline" asChild className="w-full"><Link href={`/dashboard/inbox?c=${conversationId}`}>Open in inbox</Link></Button>}
        </CardContent>
      </Card>
      <Card className="flex h-[640px] flex-col overflow-hidden lg:col-span-2">
        <div className="flex items-center gap-3 border-b bg-[#7a2e10] px-4 py-3 text-white">
          <Bot className="h-5 w-5" /><span className="font-semibold">Your business (WhatsApp preview)</span>
          {conv && <Badge variant={conv.mode === "AI" ? "brand" : "info"} className="ml-auto">{conv.mode === "AI" ? "AI handling" : "Staff handling"}</Badge>}
        </div>
        <div className="chat-bg flex-1 space-y-2 overflow-y-auto p-4">
          {!conv?.messages.length && <p className="mt-20 text-center text-sm text-muted-foreground">Say hi, or try &ldquo;2 large pepperoni pizzas for pickup&rdquo;.</p>}
          {conv?.messages.map((m) => {
            const out = m.direction === "OUTBOUND";
            return (
              <div key={m.id} className={cn("flex", out ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm", out ? "rounded-bl-md bg-white" : "rounded-br-md bg-[#d9fdd3]")}>
                  {m.location ? <p className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Location shared</p> : <p dir="auto" className="whitespace-pre-wrap">{m.body}</p>}
                  {out && m.requestsLocation && <button onClick={shareLocation} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border-t py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"><MapPin className="h-3 w-3" /> Send location</button>}
                  {out && m.buttons.length > 0 && (
                    <div className="mt-2 grid gap-1 border-t pt-1">
                      {m.buttons.map((b) => <button key={b.id} disabled={busy} onClick={() => send({ buttonId: b.id, text: b.title })} className="rounded-lg py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50">{b.title}</button>)}
                    </div>
                  )}
                  <p className="mt-0.5 text-right text-[10px] text-muted-foreground">{out ? (m.sender === "AI" ? "AI" : m.sender === "STAFF" ? m.staffName : "Auto") : <User className="inline h-3 w-3" />} · {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottom} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) void send({ text }); }} className="flex items-center gap-2 border-t bg-card p-3">
          <Button type="button" variant="ghost" size="icon" onClick={shareLocation} aria-label="Share location" title="Share a location pin"><MapPin /></Button>
          <Input dir="auto" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message as the customer…" />
          <Button type="submit" loading={busy} disabled={!text.trim()} aria-label="Send"><Send /></Button>
        </form>
      </Card>
    </div>
  );
}
