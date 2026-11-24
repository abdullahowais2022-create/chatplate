"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Languages, AlertTriangle, ArrowLeft, Bot, Check, CheckCheck, Clock, Hand, Headphones, Info, MapPin, MessagesSquare, RotateCcw, Search, Send, Sparkles, UserRound, Wand2, XCircle } from "lucide-react";
import type { ConversationDetail, ConversationListItem } from "@/server/services/queries";
import { useLive } from "@/components/dashboard/live";
import { Avatar, EmptyState, Skeleton } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { OrderStatusBadge } from "@/components/status";
import { api } from "@/lib/api";
import { languageName } from "@/lib/constants";
import { cn, money, timeAgo } from "@/lib/utils";

type Filter = "all" | "attention" | "unread" | "human";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "attention", label: "Needs human" },
  { id: "unread", label: "Unread" },
  { id: "human", label: "Staff handling" },
];

export function InboxView({ conversations, selectedId, filter, q }: { conversations: ConversationListItem[]; selectedId: string | null; filter: Filter; q: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(q);
  const nav = (params: Record<string, string | null>) => {
    const u = new URLSearchParams({ filter, ...(q ? { q } : {}), ...(selectedId ? { c: selectedId } : {}) });
    for (const [k, v] of Object.entries(params)) {
      if (v) u.set(k, v);
      else u.delete(k);
    }
    router.push(`/dashboard/inbox?${u}`);
  };

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] overflow-hidden border-t bg-card sm:-m-6 lg:m-0 lg:h-[calc(100vh-7rem)] lg:rounded-xl lg:border">
      {/* List */}
      <div className={cn("flex w-full flex-col border-r lg:w-96 lg:shrink-0", selectedId && "hidden lg:flex")}>
        <div className="space-y-3 border-b p-3">
          <form onSubmit={(e) => { e.preventDefault(); nav({ q: search || null }); }} className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or last 4 digits" className="pl-9" />
          </form>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => nav({ filter: f.id, c: null })} className={cn("whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium", filter === f.id ? "bg-ink text-white" : "bg-muted text-muted-foreground hover:bg-secondary")}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4"><EmptyState icon={MessagesSquare} title="No conversations" description={filter === "all" ? "When customers message your WhatsApp number, they'll appear here." : "Nothing matches this filter."} /></div>
          ) : (
            conversations.map((c) => (
              <button key={c.id} onClick={() => nav({ c: c.id })} className={cn("flex w-full items-start gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/60", selectedId === c.id && "bg-brand-50/70")}>
                <div className="relative">
                  <Avatar name={c.customerName ?? c.phone} />
                  {c.mode === "AI" ? <Bot className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-card p-0.5 text-brand-600" /> : <UserRound className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-card p-0.5 text-sky-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("truncate text-sm", c.unreadCount ? "font-bold" : "font-medium")}>{c.customerName ?? c.phone}</p>
                    {c.tags.includes("VIP") && <Badge variant="warning" className="px-1.5 py-0 text-[10px]">VIP</Badge>}
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  <p className={cn("truncate text-xs", c.unreadCount ? "text-foreground" : "text-muted-foreground")}>{c.lastMessagePreview}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {c.needsHuman && <Badge variant="danger" className="py-0 text-[10px]"><AlertTriangle /> Needs human</Badge>}
                    {c.state === "AWAITING_CONFIRMATION" && <Badge variant="info" className="py-0 text-[10px]">Confirming</Badge>}
                    {c.state === "ORDERING" && <Badge variant="brand" className="py-0 text-[10px]">Ordering</Badge>}
                    {c.language && <span className="text-[10px] uppercase text-muted-foreground">{c.language}</span>}
                    {c.unreadCount > 0 && <span className="ml-auto rounded-full bg-success px-1.5 text-[10px] font-bold text-white">{c.unreadCount}</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className={cn("min-w-0 flex-1", !selectedId && "hidden lg:block")}>
        {selectedId ? <ConversationPane key={selectedId} id={selectedId} onBack={() => nav({ c: null })} /> : (
          <div className="flex h-full items-center justify-center p-6"><EmptyState icon={MessagesSquare} title="Select a conversation" description="Pick a chat on the left to see the full history, transcripts and orders." className="border-0 bg-transparent" /></div>
        )}
      </div>
    </div>
  );
}

function ConversationPane({ id, onBack }: { id: string; onBack: () => void }) {
  const live = useLive();
  const router = useRouter();
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [translateReply, setTranslateReply] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    try {
      setConv(await api<ConversationDetail>(`/api/conversations/${id}`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load, live.version]);
  useEffect(() => {
    if (conv && conv.messages.length !== lastCount.current) {
      lastCount.current = conv.messages.length;
      bottom.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conv]);

  const act = async (name: string, path: string, success: string) => {
    setBusy(name);
    try {
      await api(path, { method: "POST" });
      toast.success(success);
      await load();
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    if (!text.trim()) return;
    setBusy("send");
    try {
      await api(`/api/conversations/${id}/messages`, { body: { text, translate: canTranslate && translateReply } });
      setText("");
      await load();
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const suggest = async () => {
    setBusy("suggest");
    try {
      const r = await api<{ suggestion: string | null }>(`/api/conversations/${id}/suggest`, { method: "POST" });
      if (r.suggestion) setConv((c) => (c ? { ...c, aiSuggestion: r.suggestion } : c));
      else toast.info("No customer message to reply to yet.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (error) return <div className="p-6"><EmptyState icon={XCircle} title="Couldn't load this conversation" description={error} action={<Button onClick={load}>Retry</Button>} /></div>;
  if (!conv) return <div className="space-y-3 p-6">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className={cn("h-14", i % 2 ? "w-2/3" : "ml-auto w-1/2")} />)}</div>;

  const human = conv.mode === "HUMAN";
  const customerLang = conv.language ?? conv.customer.language;
  const canTranslate = Boolean(customerLang) && base(customerLang) !== base(conv.staffLanguage);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-3 py-2.5 sm:px-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack} aria-label="Back"><ArrowLeft /></Button>
        <Avatar name={conv.customer.name ?? conv.customer.phone} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/customers/${conv.customer.id}`} className="truncate font-semibold hover:underline">{conv.customer.name ?? conv.customer.phone}</Link>
            {conv.customer.tags.map((t) => <Badge key={t} variant={t === "BLOCKED" ? "danger" : t === "VIP" ? "warning" : "secondary"} className="text-[10px]">{t}</Badge>)}
          </div>
          <p className="truncate text-xs text-muted-foreground">{conv.customer.phone} · {languageName(conv.language ?? conv.customer.language)} · {conv.customer.orderCount} orders</p>
        </div>
        <Badge variant={human ? "info" : "brand"} className="hidden sm:inline-flex">{human ? <><UserRound /> Staff handling</> : <><Bot /> AI handling</>}</Badge>
        {human ? (
          <Button size="sm" variant="outline" loading={busy === "handback"} onClick={() => act("handback", `/api/conversations/${id}/handback`, "Handed back to the AI")}><RotateCcw /> <span className="hidden sm:inline">Hand back to AI</span></Button>
        ) : (
          <Button size="sm" loading={busy === "takeover"} onClick={() => act("takeover", `/api/conversations/${id}/takeover`, "You're now handling this chat. The AI will only suggest replies.")}><Hand /> <span className="hidden sm:inline">Take over</span></Button>
        )}
      </div>

      {conv.needsHuman && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1"><b>Needs a human:</b> {conv.needsHumanReason ?? "The AI asked for help."}</span>
          <Button size="sm" variant="ghost" loading={busy === "resolve"} onClick={() => act("resolve", `/api/conversations/${id}/resolve`, "Marked as resolved")}><Check /> Resolve</Button>
        </div>
      )}

      {conv.orders.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b bg-muted/30 px-4 py-2 scrollbar-thin">
          {conv.orders.map((o) => (
            <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="flex shrink-0 items-center gap-2 rounded-lg border bg-card px-2.5 py-1 text-xs hover:border-primary">
              <span className="font-mono font-semibold">#{o.number}</span><OrderStatusBadge status={o.status} /><span>{money(o.total)}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="chat-bg flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-6">
        {conv.messages.map((m) => <Bubble key={m.id} m={m} staffLanguage={conv.staffLanguage} />)}
        <div ref={bottom} />
      </div>

      <div className="border-t bg-card p-3">
        {!conv.withinWindow && (
          <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-900"><Clock className="h-3.5 w-3.5" /> The customer last wrote over 24 hours ago. WhatsApp only allows template messages now, so free-form replies will fail.</p>
        )}
        {human && (
          <div className="mb-2 rounded-lg border border-brand-200 bg-brand-50/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-brand-800"><Sparkles className="h-3.5 w-3.5" /> AI suggestion (never sent automatically)</p>
              <Button size="sm" variant="ghost" className="h-7" loading={busy === "suggest"} onClick={suggest}><Wand2 /> {conv.aiSuggestion ? "Regenerate" : "Suggest"}</Button>
            </div>
            {conv.aiSuggestion && (
              <div className="mt-1.5 flex items-start gap-2">
                <p className="flex-1 whitespace-pre-wrap text-sm">{conv.aiSuggestion}</p>
                <Button size="sm" variant="outline" className="h-7" onClick={() => setText(conv.aiSuggestion ?? "")}>Use</Button>
              </div>
            )}
          </div>
        )}
        {canTranslate && (
          <label className="mb-2 flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" className="h-3.5 w-3.5 accent-[hsl(var(--primary))]" checked={translateReply} onChange={(e) => setTranslateReply(e.target.checked)} />
            <Languages className="h-3.5 w-3.5" /> Write in {languageName(conv.staffLanguage)}, send in {languageName(customerLang)} (auto-translate)
          </label>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder={human ? "Type your reply… (Enter to send)" : "Replying will take this chat over from the AI"}
            className="max-h-40 min-h-[42px] resize-none"
            rows={1}
          />
          <Button onClick={send} loading={busy === "send"} disabled={!text.trim()} aria-label="Send"><Send /></Button>
        </div>
      </div>
    </div>
  );
}

type Msg = ConversationDetail["messages"][number];

function Bubble({ m, staffLanguage }: { m: Msg; staffLanguage: string }) {
  const out = m.direction === "OUTBOUND";
  const [showAi, setShowAi] = useState(false);
  const [tr, setTr] = useState<{ text: string | null; busy: boolean; hidden: boolean }>({ text: m.translation, busy: false, hidden: false });
  useEffect(() => {
    if (m.translation) setTr((x) => ({ ...x, text: m.translation }));
  }, [m.translation]);
  const sourceText = m.voiceNote?.transcript ?? m.body;
  const foreign = Boolean(sourceText) && (!m.language || base(m.language) !== base(staffLanguage));
  const staffOriginal = out && m.sender === "STAFF" && m.translation;
  const translate = async () => {
    setTr((x) => ({ ...x, busy: true }));
    try {
      const r = await api<{ translation: string }>(`/api/messages/${m.id}/translate`, { method: "POST" });
      setTr({ text: r.translation, busy: false, hidden: false });
    } catch (e) {
      toast.error((e as Error).message);
      setTr((x) => ({ ...x, busy: false }));
    }
  };
  const ai = m.ai as { extraction?: { intent?: string; confidence?: number; language?: string; missing_information?: string[] }; decision?: { action?: string }; engine?: string; errors?: string[] } | null;
  return (
    <div className={cn("flex", out ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[70%]", out ? "rounded-br-md bg-[#fde6d4]" : "rounded-bl-md bg-white")}>
        {out && (
          <p className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-brand-800">
            {m.sender === "AI" ? <><Bot className="h-3 w-3" /> AI assistant</> : m.sender === "STAFF" ? <><UserRound className="h-3 w-3" /> {m.staffName ?? "Staff"}</> : <><Info className="h-3 w-3" /> Automatic update</>}
          </p>
        )}
        {m.voiceNote && (
          <div className="mb-1 rounded-lg bg-muted/60 p-2">
            <p className="flex items-center gap-1.5 text-xs font-medium"><Headphones className="h-3.5 w-3.5" /> Voice note</p>
            {m.voiceNote.hasAudio && <audio controls preload="none" src={`/api/voice-notes/${m.voiceNote.id}`} className="mt-1 h-8 w-56 max-w-full" />}
            {m.voiceNote.status === "COMPLETED" ? <p className="mt-1 text-xs italic text-muted-foreground">Transcript:</p> : m.voiceNote.status === "FAILED" ? <p className="mt-1 text-xs text-red-600">Transcription failed: {m.voiceNote.error}</p> : <p className="mt-1 text-xs text-muted-foreground">Transcribing…</p>}
          </div>
        )}
        {m.location && (
          <a href={`https://maps.google.com/?q=${m.location.latitude},${m.location.longitude}`} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-1.5 rounded-lg bg-muted/60 p-2 text-xs font-medium text-sky-700 hover:underline">
            <MapPin className="h-3.5 w-3.5" /> {m.location.name ?? "Shared location"} ({m.location.latitude.toFixed(4)}, {m.location.longitude.toFixed(4)})
          </a>
        )}
        {(m.voiceNote?.transcript ?? m.body) && <p className="whitespace-pre-wrap break-words" dir="auto">{m.voiceNote?.transcript ?? m.body}</p>}
        {!m.body && !m.voiceNote && !m.location && <p className="italic text-muted-foreground">[{m.type.toLowerCase()}]</p>}
        {tr.text && !tr.hidden && (
          <div className="mt-1.5 border-t border-black/10 pt-1.5 dark:border-white/10">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <Languages className="h-3 w-3" /> {staffOriginal ? `You wrote (${languageName(m.translationLanguage)})` : `Translated from ${languageName(m.language)}`}
            </p>
            <p className="whitespace-pre-wrap break-words text-[13px] text-foreground/80" dir="auto">{tr.text}</p>
          </div>
        )}
        {m.requestsLocation && <p className="mt-2 flex items-center gap-1 text-[11px] text-brand-800"><MapPin className="h-3 w-3" /> Asked to share location</p>}
        {m.buttons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">{m.buttons.map((b) => <span key={b.id} className="rounded-full border border-brand-300 bg-white/70 px-2 py-0.5 text-[11px] text-brand-800">{b.title}</span>)}</div>
        )}
        <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
          {!staffOriginal && foreign && (tr.text ? (
            <button onClick={() => setTr((x) => ({ ...x, hidden: !x.hidden }))} className="rounded px-1 font-medium hover:bg-muted">{tr.hidden ? "Show translation" : "Hide translation"}</button>
          ) : (
            <button onClick={translate} disabled={tr.busy} className="flex items-center gap-0.5 rounded px-1 font-medium text-brand-800 hover:bg-muted disabled:opacity-60"><Languages className="h-3 w-3" /> {tr.busy ? "Translating…" : "Translate"}</button>
          ))}
          {!out && ai?.extraction && (
            <button onClick={() => setShowAi((s) => !s)} className="rounded bg-brand-100 px-1 font-medium text-brand-800 hover:bg-brand-200">AI</button>
          )}
          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {out && <Ticks status={m.status} error={m.error} />}
        </div>
        {showAi && ai?.extraction && (
          <div className="mt-1.5 rounded-md bg-muted p-2 text-[11px] leading-relaxed text-muted-foreground">
            <p>Intent: <b>{ai.extraction.intent}</b> · Confidence: <b>{Math.round((ai.extraction.confidence ?? 0) * 100)}%</b> · Language: <b>{ai.extraction.language}</b></p>
            <p>Action: <b>{ai.decision?.action}</b> · Engine: {ai.engine}</p>
            {ai.extraction.missing_information?.length ? <p>Missing: {ai.extraction.missing_information.join(", ")}</p> : null}
            {ai.errors?.length ? <p className="text-red-600">Errors: {ai.errors.join("; ")}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Ticks({ status, error }: { status: string; error: string | null }) {
  switch (status) {
    case "QUEUED":
      return <Clock className="h-3 w-3" />;
    case "SENT":
      return <Check className="h-3.5 w-3.5" />;
    case "DELIVERED":
      return <CheckCheck className="h-3.5 w-3.5" />;
    case "READ":
      return <CheckCheck className="h-3.5 w-3.5 text-sky-500" />;
    case "FAILED":
      return <span className="flex items-center gap-0.5 text-red-600" title={error ?? undefined}><XCircle className="h-3 w-3" /> Failed</span>;
    case "SIMULATED":
      return <span className="italic" title="WhatsApp isn't connected. This message was not actually sent.">simulated</span>;
    default:
      return null;
  }
}

const base = (l: string | null | undefined) => (l ?? "").toLowerCase().split(/[-_]/)[0];
