"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { api } from "@/lib/api";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ redirect: string }>("/api/auth/signup", { body: f });
      window.location.href = r.redirect;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Create your restaurant account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Set up takes about 10 minutes. You&apos;ll connect WhatsApp in the next steps.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Restaurant name"><Input name="restaurantName" required minLength={2} placeholder="e.g. Saffron & Slice" /></Field>
        <Field label="Your name"><Input name="name" required minLength={2} autoComplete="name" /></Field>
        <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Password" hint="At least 10 characters, with letters and numbers."><Input name="password" type="password" required minLength={10} autoComplete="new-password" /></Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </>
  );
}
