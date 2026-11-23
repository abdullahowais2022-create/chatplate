import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { setupProblems } from "@/server/setup";
import { Logo } from "@/components/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Setup needed" };

export default async function SetupPage() {
  const problems = await setupProblems();
  if (problems.length === 0) redirect("/login");
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Logo markClassName="h-9 w-9" />
      <h1 className="mt-8 text-2xl font-bold">Almost there: a few settings are needed</h1>
      <p className="mt-2 text-muted-foreground">The app is deployed, but it can&apos;t start until these are fixed. After changing environment variables in Vercel, redeploy (Deployments → ⋯ → Redeploy).</p>
      <ul className="mt-8 space-y-3">
        {problems.map((p) => (
          <li key={p.key + p.title} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-center gap-2 font-semibold text-amber-900"><AlertTriangle className="h-4 w-4" /> {p.title}</p>
            <p className="mt-1 text-sm text-amber-900/90">{p.fix}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4" /> This page disappears automatically once everything is configured.</p>
    </div>
  );
}
