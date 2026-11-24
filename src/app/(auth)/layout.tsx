import Link from "next/link";
import { setupProblems } from "@/server/setup";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { Logo } from "@/components/brand";
import { ThemeSwitch } from "@/components/theme";

// Always render per request (auth, live data, and setup checks).
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if ((await setupProblems()).length) redirect("/setup");
  if (await getSession()) redirect("/dashboard");
  return (
    <div className="grid grid-cols-1 min-h-screen lg:grid-cols-2">
      <div className="relative flex flex-col justify-center px-6 py-12 sm:px-12">
        <ThemeSwitch className="absolute right-4 top-4" />
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-10" markClassName="h-9 w-9" />
          {children}
          <p className="mt-10 flex gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/data-deletion" className="hover:text-foreground">Data deletion</Link>
          </p>
        </div>
      </div>
      <div className="relative hidden flex-col justify-between bg-[#141210] p-12 text-[#efece6] lg:flex">
        <p className="label-caps !text-[#9b958c]">WhatsApp ordering for local businesses</p>
        <div className="mx-auto w-full max-w-md">
          <p className="max-w-sm text-[28px] font-semibold leading-tight tracking-tight">Customers text you like a friend. You get a clean order ticket.</p>
          <div className="mt-10 grid grid-cols-[1fr_1.05fr] items-start gap-4">
            <div className="space-y-2 text-[13px] leading-snug">
              <p className="w-fit max-w-[95%] rounded-lg rounded-tl-sm bg-[#25231f] px-3 py-2" dir="auto">Hola! 2 pizzas pepperoni grandes y una coca para recoger 🙏</p>
              <p className="ml-auto w-fit max-w-[95%] rounded-lg rounded-tr-sm bg-[#2f3b2f] px-3 py-2">¡Listo! Total $38.50. ¿Confirmo tu pedido?</p>
              <p className="w-fit rounded-lg rounded-tl-sm bg-[#25231f] px-3 py-2">Sí ✅</p>
            </div>
            <div className="rotate-1 rounded-sm bg-[#faf8f3] px-4 pb-5 pt-4 font-mono text-[11.5px] leading-relaxed text-[#1c1a17] shadow-2xl">
              <p className="text-center font-semibold tracking-wider">ORDER 1036</p>
              <p className="text-center text-[10px] text-[#6b665e]">PICKUP · 12:41</p>
              <p className="my-2 border-t border-dashed border-[#bdb7ac]" />
              <p className="flex justify-between"><span>2× Pepperoni (L)</span><span>36.00</span></p>
              <p className="flex justify-between"><span>1× Coca-Cola</span><span>2.50</span></p>
              <p className="my-2 border-t border-dashed border-[#bdb7ac]" />
              <p className="flex justify-between font-semibold"><span>TOTAL</span><span>38.50</span></p>
              <p className="mt-2 text-[10px] text-[#6b665e]">Lucía F. · Spanish · pays at pickup</p>
            </div>
          </div>
        </div>
        <ul className="grid grid-cols-3 gap-6 border-t border-[#2a2723] pt-6 text-[13px] text-[#b9b3a9]">
          <li><span className="block font-medium text-[#efece6]">Any language</span>Text or voice notes</li>
          <li><span className="block font-medium text-[#efece6]">Your real prices</span>Never invented by AI</li>
          <li><span className="block font-medium text-[#efece6]">No payments taken</span>Customers pay you</li>
        </ul>
      </div>
    </div>
  );
}
