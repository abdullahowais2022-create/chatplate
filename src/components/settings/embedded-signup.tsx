"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { WhatsAppStatusDTO } from "@/server/services/queries";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Config = NonNullable<WhatsAppStatusDTO["embeddedSignup"]>;
type FBLoginResponse = { authResponse?: { code?: string } | null; status?: string };
type FBStatic = {
  init: (o: Record<string, unknown>) => void;
  login: (cb: (r: FBLoginResponse) => void, o: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    FB?: FBStatic;
    fbAsyncInit?: () => void;
  }
}

const SDK_ID = "facebook-jssdk";
let sdkPromise: Promise<FBStatic> | null = null;

/** Loads and initialises Facebook's SDK once per page. Fails clearly if it's blocked. */
function loadSdk(cfg: Config): Promise<FBStatic> {
  if (window.FB) return Promise.resolve(window.FB);
  sdkPromise ??= new Promise<FBStatic>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      sdkPromise = null;
      reject(new Error("Facebook didn't load. An ad blocker or browser privacy setting may be blocking it: allow facebook.com for this site, then reload."));
    }, 20_000);
    window.fbAsyncInit = () => {
      window.clearTimeout(timer);
      window.FB!.init({ appId: cfg.appId, autoLogAppEvents: true, xfbml: false, version: cfg.graphVersion });
      resolve(window.FB!);
    };
    if (!document.getElementById(SDK_ID)) {
      const s = document.createElement("script");
      s.id = SDK_ID;
      s.src = "https://connect.facebook.net/en_US/sdk.js";
      s.async = true;
      s.crossOrigin = "anonymous";
      s.onerror = () => {
        window.clearTimeout(timer);
        sdkPromise = null;
        document.getElementById(SDK_ID)?.remove();
        reject(new Error("Couldn't load Facebook. An ad blocker or privacy setting may be blocking it: allow facebook.com for this site, then try again."));
      };
      document.body.appendChild(s);
    }
  });
  return sdkPromise;
}

/**
 * The one-click "Connect WhatsApp" button (Meta Embedded Signup). Opens Meta's own popup, where the
 * owner logs in, picks or creates their WhatsApp Business Account and verifies their number by SMS.
 * TillText never sees their Facebook password.
 */
export function EmbeddedSignupButton({ config, onConnected }: { config: Config; onConnected: (s: WhatsAppStatusDTO) => void }) {
  const [busy, setBusy] = useState(false);
  const [sdk, setSdk] = useState<{ state: "loading" | "ready" | "error"; error?: string }>({ state: "loading" });
  const [popupHint, setPopupHint] = useState(false);
  // "app": keep using the WhatsApp Business app on the phone (Meta coexistence). "new": a fresh number.
  const [mode, setMode] = useState<"app" | "new">("app");
  const session = useRef<{ wabaId?: string; phoneNumberId?: string; cancelledAt?: string }>({});

  useEffect(() => {
    // Load Facebook before the click: browsers block pop-ups that don't open immediately on a click.
    loadSdk(config).then(() => setSdk({ state: "ready" }), (e: Error) => setSdk({ state: "error", error: e.message }));
    const onMessage = (event: MessageEvent) => {
      if (!/(^|\.)facebook\.com$/.test(new URL(event.origin).hostname)) return;
      let data: { type?: string; event?: string; data?: { waba_id?: string; phone_number_id?: string; current_step?: string } };
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (data.event?.startsWith("FINISH")) {
        session.current = { wabaId: data.data?.waba_id, phoneNumberId: data.data?.phone_number_id };
      } else if (data.event === "CANCEL") {
        session.current = { cancelledAt: data.data?.current_step ?? "unknown" };
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [config]);

  const waitForIds = async () => {
    for (let i = 0; i < 12 && !session.current.phoneNumberId && !session.current.cancelledAt; i++) await new Promise((r) => setTimeout(r, 250));
    return session.current;
  };

  const finish = async (code: string | null) => {
    try {
      const ids = await waitForIds();
      if (!code) {
        const why = ids.cancelledAt
          ? `Meta's window was closed at the "${ids.cancelledAt.toLowerCase().replace(/_/g, " ")}" step. You can start again any time.`
          : "Facebook's window closed without logging in. If Meta showed an error inside it, take a screenshot of that message and try again.";
        toast.message(why, { duration: 12_000 });
        return;
      }
      // If Meta's window didn't pass the ids back, the server finds them from the login.
      const next = await api<WhatsAppStatusDTO & { warning?: string | null }>("/api/whatsapp/embedded", { body: { code, wabaId: ids.wabaId ?? null, phoneNumberId: ids.phoneNumberId ?? null, existingApp: mode === "app" } });
      onConnected(next);
      if (next.warning) toast.warning(next.warning);
      else toast.success(`WhatsApp connected${next.displayPhoneNumber ? `: ${next.displayPhoneNumber}` : ""}. Your AI assistant is live.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setPopupHint(false);
    }
  };

  // Must call FB.login synchronously inside the click, or the browser blocks Facebook's window.
  const start = () => {
    const FB = window.FB;
    if (!FB) {
      toast.error(sdk.error ?? "Facebook is still loading. Try again in a moment.");
      return;
    }
    setBusy(true);
    session.current = {};
    const hint = window.setTimeout(() => setPopupHint(true), 6000);
    try {
      FB.login(
        (r) => {
          window.clearTimeout(hint);
          void finish(r.authResponse?.code ?? null);
        },
        {
          config_id: config.configId,
          response_type: "code",
          override_default_response_type: true,
          extras: { setup: {}, featureType: mode === "app" ? "whatsapp_business_app_onboarding" : "", sessionInfoVersion: "3" },
        },
      );
    } catch (e) {
      window.clearTimeout(hint);
      setBusy(false);
      toast.error((e as Error).message);
    }
  };

  const cancel = () => {
    setBusy(false);
    setPopupHint(false);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <div>
        <h3 className="font-semibold">Connect your WhatsApp number</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">About two minutes. Everything else is set up for you.</p>
      </div>
      <div role="radiogroup" aria-label="Which number" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {([
          ["app", "My number already uses the WhatsApp Business app", "Keep chatting on your phone as usual. TillText answers alongside you, and replies you send from the phone show up here too."],
          ["new", "A new number, or one not on WhatsApp yet", "TillText handles this number completely; it won't work in the WhatsApp phone app."],
        ] as const).map(([value, title, text]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={`rounded-md border p-3 text-left text-sm transition-colors ${mode === value ? "border-foreground ring-1 ring-foreground" : "hover:bg-muted/60"}`}
          >
            <span className="block font-medium">{title}</span>
            <span className="text-muted-foreground">{text}</span>
          </button>
        ))}
      </div>
      <ol className="space-y-1.5 text-sm text-muted-foreground">
        <li><span className="num mr-2 text-foreground">1</span>Log in with Facebook in Meta&apos;s own window. TillText never sees your password.</li>
        <li><span className="num mr-2 text-foreground">2</span>Pick or create your WhatsApp Business account.</li>
        <li><span className="num mr-2 text-foreground">3</span>{mode === "app" ? "Scan the QR code Meta shows with your WhatsApp Business app." : "Enter the code Meta sends to the number by SMS or call."}</li>
      </ol>
      <Button size="lg" onClick={start} loading={busy || sdk.state === "loading"} disabled={sdk.state === "error"} className="w-full bg-[#1877F2] text-white hover:bg-[#166fe5] sm:w-auto">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="currentColor" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" /></svg>
        Connect with Facebook
      </Button>
      {sdk.state === "error" && <p className="text-sm text-destructive">{sdk.error}</p>}
      {busy && popupHint && (
        <div className="rounded-md bg-muted p-3 text-sm">
          <p><b>Don&apos;t see a Facebook window?</b> Your browser may have blocked it. Click the blocked pop-up icon at the right of the address bar, choose <b>Always allow pop-ups</b> for this site, then try again. The window can also open behind this one.</p>
          <button type="button" onClick={cancel} className="mt-2 text-sm font-medium underline underline-offset-2">Cancel and try again</button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {mode === "app"
          ? "Official Meta connection, so there's no ban risk. Keep the WhatsApp Business app updated and open it at least every couple of weeks to stay linked."
          : "Use a number that isn't active in the WhatsApp or WhatsApp Business phone app, or remove it from the app first."}
      </p>
    </div>
  );
}
