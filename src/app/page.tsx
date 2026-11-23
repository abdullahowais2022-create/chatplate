import { setupProblems } from "@/server/setup";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";

// Always render per request (auth, live data, and setup checks).
export const dynamic = "force-dynamic";

export default async function Home() {
  if ((await setupProblems()).length) redirect("/setup");
  const s = await getSession();
  redirect(!s ? "/login" : s.onboardingCompleted ? "/dashboard" : "/onboarding");
}
