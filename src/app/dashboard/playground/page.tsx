import { requirePageSession } from "@/server/auth/session";
import { hasOpenAI } from "@/server/env";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/misc";
import { Playground } from "./playground";

export const metadata = { title: "AI playground" };

export default async function PlaygroundPage() {
  const s = await requirePageSession("playground:use");
  const r = await db.restaurant.findUniqueOrThrow({ where: { id: s.restaurantId }, select: { latitude: true, longitude: true } });
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="AI playground" description="Test how the assistant understands customers before going live. Uses your real menu, prices, hours and delivery zones." />
      <Playground openai={hasOpenAI()} restaurantLocation={r.latitude != null && r.longitude != null ? { lat: r.latitude, lng: r.longitude } : null} />
    </div>
  );
}
