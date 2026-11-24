import { setupProblems } from "@/server/setup";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { Logo } from "@/components/brand";
import { MessageCircle, Languages, ClipboardCheck } from "lucide-react";

// Always render per request (auth, live data, and setup checks).
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if ((await setupProblems()).length) redirect("/setup");
  if (await getSession()) redirect("/dashboard");
  return (
    <div className="grid grid-cols-1 min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-10" markClassName="h-9 w-9" />
          {children}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 lg:flex lg:flex-col lg:justify-center lg:px-16 text-white">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />
        <h2 className="relative text-4xl font-bold leading-tight">Your restaurant&apos;s orders,<br />straight from WhatsApp.</h2>
        <p className="relative mt-4 max-w-md text-lg text-white/85">Customers text or send a voice note in their own language. MenuTexter understands it, confirms the order and drops it into your dashboard.</p>
        <ul className="relative mt-10 space-y-4 text-white/90">
          {[
            [MessageCircle, "Text and voice-note ordering, 24/7"],
            [Languages, "Replies in the customer's language"],
            [ClipboardCheck, "Only your real menu, prices and hours"],
          ].map(([Icon, text], i) => {
            const I = Icon as typeof MessageCircle;
            return (
              <li key={i} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15"><I className="h-5 w-5" /></span>
                {text as string}
              </li>
            );
          })}
        </ul>
        <p className="relative mt-12 text-sm text-white/70">No payment processing. Customers pay you directly, the way they always have.</p>
      </div>
    </div>
  );
}
