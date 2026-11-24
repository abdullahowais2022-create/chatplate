"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, CreditCard, Clock, MessageCircle, PartyPopper, Store, Truck, UtensilsCrossed } from "lucide-react";
import type { SettingsDTO, WhatsAppStatusDTO } from "@/server/services/queries";
import { Logo } from "@/components/brand";
import { ThemeSwitch } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeliveryForm, HoursForm, PaymentForm, ProfileForm } from "@/components/settings/forms";
import { WhatsAppConnect } from "@/components/settings/whatsapp-connect";
import { AiCatalogImport } from "@/components/ai-catalog-import";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Business profile", icon: Store, description: "The basics customers will see." },
  { title: "Opening hours", icon: Clock, description: "The AI never accepts orders or promises times outside these." },
  { title: "Delivery & pickup", icon: Truck, description: "Zones, fees and minimum order." },
  { title: "Payments", icon: CreditCard, description: "How customers pay you directly. No online payments." },
  { title: "Products & menu", icon: UtensilsCrossed, description: "The AI only sells what's in your product list or menu." },
  { title: "Connect WhatsApp", icon: MessageCircle, description: "Link your WhatsApp Business number." },
  { title: "All set", icon: PartyPopper, description: "" },
];

export function Wizard({ settings, whatsapp, menuCount, canManageWhatsApp }: { settings: SettingsDTO; whatsapp: WhatsAppStatusDTO; menuCount: number; canManageWhatsApp: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(settings.onboardingStep, STEPS.length - 1));
  const [wa, setWa] = useState(whatsapp);
  const [finishing, setFinishing] = useState(false);
  const [items, setItems] = useState(menuCount);

  const go = async (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
    await api("/api/onboarding", { method: "PATCH", body: { step: n } }).catch(() => undefined);
    router.refresh();
  };
  const next = () => go(step + 1);
  const finish = async () => {
    setFinishing(true);
    await api("/api/onboarding", { method: "PATCH", body: { step: STEPS.length - 1, complete: true } });
    window.location.href = "/dashboard";
  };
  const S = STEPS[step]!;
  const formProps = { settings, onSaved: next, submitLabel: "Save & continue" };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <Button variant="ghost" size="sm" onClick={finish} loading={finishing}>Skip setup</Button>
        </div>
      </header>
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-8 px-4 pb-16 lg:grid-cols-[240px_1fr]">
        <ol className="flex gap-2 overflow-x-auto lg:flex-col">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button onClick={() => go(i)} className={cn("flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm", i === step ? "bg-card font-semibold shadow-sm" : "text-muted-foreground hover:bg-card/60")}>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs", i < step ? "bg-success text-white" : i === step ? "bg-primary text-white" : "bg-muted")}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
                {s.title}
              </button>
            </li>
          ))}
        </ol>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground"><S.icon className="h-5 w-5" /></div>
              <div><CardTitle className="text-xl">{S.title}</CardTitle>{S.description && <CardDescription>{S.description}</CardDescription>}</div>
            </div>
          </CardHeader>
          <CardContent>
            {step === 0 && <ProfileForm {...formProps} />}
            {step === 1 && <HoursForm {...formProps} />}
            {step === 2 && <DeliveryForm {...formProps} />}
            {step === 3 && <PaymentForm {...formProps} />}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">You have <b>{items}</b> products. Let the AI build your list from a photo or a pasted price list, or add them one by one in the product manager.</p>
                <AiCatalogImport currency={settings.currency} onDone={(n) => { setItems((x) => x + n); router.refresh(); }} />
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button asChild variant="outline"><Link href="/dashboard/menu" target="_blank"><UtensilsCrossed /> Open product manager</Link></Button>
                  <Button onClick={next}>{items ? "Continue" : "I'll add them later"} <ArrowRight /></Button>
                </div>
              </div>
            )}
            {step === 5 && (
              <div className="space-y-6">
                {canManageWhatsApp ? <WhatsAppConnect initial={wa} onChange={setWa} /> : <p className="text-sm text-muted-foreground">Only the owner can connect WhatsApp.</p>}
                <div className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                  Don&apos;t have Meta access yet? Continue anyway: you can test everything with the built-in customer simulator and connect later from <b>Settings → WhatsApp</b>. See the setup guide in <code>docs/WHATSAPP_SETUP.md</code>.
                </div>
                <Button onClick={next}>{wa.status === "CONNECTED" ? "Continue" : "Continue without connecting"} <ArrowRight /></Button>
              </div>
            )}
            {step === 6 && (
              <div className="space-y-4 py-4 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background"><Check className="h-6 w-6" /></span>
                <h2 className="text-2xl font-bold">You&apos;re ready to take WhatsApp orders</h2>
                <p className="mx-auto max-w-md text-muted-foreground">Try the AI playground first: chat as a customer and watch orders land in your dashboard.</p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" asChild><Link href="/dashboard/playground" onClick={() => api("/api/onboarding", { method: "PATCH", body: { step: 6, complete: true } })}>Open AI playground</Link></Button>
                  <Button onClick={finish} loading={finishing}>Go to dashboard</Button>
                </div>
              </div>
            )}
            {step > 0 && step < 6 && (
              <div className="mt-6 flex justify-between border-t pt-4">
                <Button variant="ghost" onClick={() => go(step - 1)}><ArrowLeft /> Back</Button>
                <Button variant="ghost" onClick={next}>Skip this step <ArrowRight /></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
