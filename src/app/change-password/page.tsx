import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { Logo } from "@/components/brand";
import { ThemeSwitch } from "@/components/theme";
import { ChangePasswordForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose a new password" };

/** Staff accounts start with a temporary password set by the owner; it must be replaced before anything else. */
export default async function ChangePasswordPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.mustChangePassword) redirect("/dashboard");
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <ThemeSwitch className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <Logo className="mb-10" markClassName="h-9 w-9" />
        <h1 className="text-2xl font-bold tracking-tight">Choose your own password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Hi {s.name.split(" ")[0]}, you signed in with a temporary password from {s.restaurantName}. Pick a new one only you know.</p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
