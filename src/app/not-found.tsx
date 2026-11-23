import Link from "next/link";
import { LogoMark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <LogoMark className="h-14 w-14" />
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">That page doesn&apos;t exist or you don&apos;t have access to it.</p>
      <Button asChild><Link href="/dashboard">Back to dashboard</Link></Button>
    </div>
  );
}
