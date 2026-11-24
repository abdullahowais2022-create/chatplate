"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Smartphone, UserRound } from "lucide-react";
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

function loadSdk(cfg: Config): Promise<FBStatic> {
  return new Promise((resolve, reject) => {
    const ready = () => {
      window.FB!.init({ appId: cfg.appId, autoLogAppEvents: true, xfbml: false, version: cfg.graphVersion });
      resolve(window.FB!);
    };
    if (window.FB) return ready();
    window.fbAsyncInit = ready;
    if (document.getElementById(SDK_ID)) return;
    const s = document.createElement("script");
    s.id = SDK_ID;
    s.src = "https://connect.facebook.net/en_US/sdk.js";
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.onerror = () => reject(new Error("Couldn't load Facebook. Check your connection or ad blocker, then try again."));
    document.body.appendChild(s);
  });
}

/**
 * The one-click "Connect WhatsApp" button (Meta Embedded Signup). Opens Meta's own popup, where the
 * owner logs in, picks or creates their WhatsApp Business Account and verifies their number by SMS.
 * TillText never sees their Facebook password.
 */
export function EmbeddedSignupButton({ config, onConnected }: { config: Config; onConnected: (s: WhatsAppStatusDTO) => void }) {
  const [busy, setBusy] = useState(false);
  // "app": keep using the WhatsApp Business app on the phone (Meta coexistence). "new": a fresh number.
  const [mode, setMode] = useState<"app" | "new">("app");
  const session = useRef<{ wabaId?: string; phoneNumberId?: string; cancelledAt?: string }>({});

  useEffect(() => {
    loadSdk(config).catch(() => undefined); // preload so the popup opens instantly on click
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
    for (let i = 0; i < 40 && !session.current.phoneNumberId && !session.current.cancelledAt; i++) await new Promise((r) => setTimeout(r, 250));
    return session.current;
  };

  const start = async () => {
    setBusy(true);
    session.current = {};
    try {
      const FB = await loadSdk(config);
      const code = await new Promise<string | null>((resolve) =>
        FB.login((r) => resolve(r.authResponse?.code ?? null), {
          config_id: config.configId,
          response_type: "code",
          override_default_response_type: true,
          extras: { setup: {}, featureType: mode === "app" ? "whatsapp_business_app_onboarding" : "", sessionInfoVersion: "3" },
        }),
      );
      const ids = await waitForIds();
      if (!code || !ids.phoneNumberId || !ids.wabaId) {
        toast.message(ids.cancelledAt ? "WhatsApp setup was closed before it finished. You can start again any time." : "WhatsApp setup didn't finish. Please try again.");
        return;
      }
      const next = await api<WhatsAppStatusDTO & { warning?: string | null }>("/api/whatsapp/embedded", { body: { code, wabaId: ids.wabaId, phoneNumberId: ids.phoneNumberId, existingApp: mode === "app" } });
      onConnected(next);
      if (next.warning) toast.warning(next.warning);
      else toast.success(`WhatsApp connected${next.displayPhoneNumber ? `: ${next.displayPhoneNumber}` : ""}. Your AI assistant is live.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h3 className="text-lg font-semibold">Connect your WhatsApp number</h3>
        <p className="mt-1 text-sm text-muted-foreground">Takes about 2 minutes. TillText sets up the webhook, permissions and AI assistant for you automatically.</p>
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
            className={`rounded-lg border p-3 text-left text-sm transition-colors ${mode === value ? "border-primary bg-accent" : "hover:bg-muted/60"}`}
          >
            <span className="block font-medium">{title}</span>
            <span className="text-muted-foreground">{text}</span>
          </button>
        ))}
      </div>
      <ol className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        {[
          [UserRound, "Log in with Facebook", "In Meta's secure window. We never see your password."],
          [ShieldCheck, "Pick your business", "Choose or create your WhatsApp Business account."],
          mode === "app"
            ? [Smartphone, "Confirm on your phone", "Scan the QR code Meta shows with your WhatsApp Business app."]
            : [Smartphone, "Verify your number", "Enter the code Meta sends by SMS or call."],
        ].map(([Icon, title, text], i) => {
          const I = Icon as typeof UserRound;
          return (
            <li key={i} className="flex gap-3 rounded-lg bg-muted/50 p-3">
              <I className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span><span className="block font-medium">{title as string}</span><span className="text-muted-foreground">{text as string}</span></span>
            </li>
          );
        })}
      </ol>
      <Button size="lg" onClick={start} loading={busy} className="w-full bg-[#1877F2] text-white hover:bg-[#166fe5] sm:w-auto">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="currentColor" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" /></svg>
        Connect with Facebook
      </Button>
      <p className="text-xs text-muted-foreground">
        {mode === "app"
          ? "Official Meta connection, so there's no ban risk. Keep the WhatsApp Business app updated and open it at least every couple of weeks to stay linked."
          : "Use a number that isn't active in the WhatsApp or WhatsApp Business phone app, or remove it from the app first."}
      </p>
    </div>
  );
}
