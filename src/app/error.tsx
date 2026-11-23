"use client";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">We couldn&apos;t load this page. Please try again. If it keeps happening, contact support{error.digest ? ` (ref ${error.digest})` : ""}.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
