import Link from "next/link";
import { Logo } from "@/components/brand";

/** Contact address shown on the public legal pages. Set LEGAL_CONTACT_EMAIL in Vercel. */
export function legalContact() {
  return process.env.LEGAL_CONTACT_EMAIL?.trim() || null;
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const contact = legalContact();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link href="/" aria-label="TillText home"><Logo markClassName="h-7 w-7" /></Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/data-deletion" className="hover:text-foreground">Data deletion</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="legal mt-8 space-y-4 text-[15px] leading-relaxed [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5 [&_a]:underline [&_a]:underline-offset-2">
          {children}
        </div>
        <p className="mt-12 border-t pt-6 text-sm text-muted-foreground">
          Questions: {contact ? <a className="underline underline-offset-2" href={`mailto:${contact}`}>{contact}</a> : "use the contact details of the business you ordered from, or the TillText account owner."}
        </p>
      </main>
    </div>
  );
}
