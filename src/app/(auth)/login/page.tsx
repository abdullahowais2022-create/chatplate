import Link from "next/link";
import { LoginForm } from "./login-form";
import { isDemoMode } from "@/server/env";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to your restaurant dashboard.</p>
      <LoginForm demo={isDemoMode()} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to MenuTexter? <Link href="/signup" className="font-medium text-primary hover:underline">Create a restaurant account</Link>
      </p>
    </>
  );
}
