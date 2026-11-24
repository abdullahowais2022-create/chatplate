"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { api } from "@/lib/api";

export function LoginForm({ demo }: { demo: boolean }) {
  const [loading, setLoading] = useState<"login" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading("login");
    setError(null);
    try {
      const r = await api<{ redirect: string }>("/api/auth/login", { body: { email: f.get("email"), password: f.get("password") } });
      window.location.href = r.redirect;
    } catch (err) {
      setError((err as Error).message);
      setLoading(null);
    }
  }

  async function tryDemo() {
    setLoading("demo");
    try {
      const r = await api<{ redirect: string }>("/api/auth/demo", { method: "POST" });
      window.location.href = r.redirect;
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(null);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required placeholder="you@yourbusiness.com" /></Field>
        <Field label="Password"><PasswordInput name="password" autoComplete="current-password" required /></Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        <Button type="submit" className="w-full" loading={loading === "login"}>Sign in</Button>
      </form>
      {demo && (
        <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50 p-4">
          <p className="text-sm font-medium text-brand-800">Just looking around?</p>
          <p className="mt-0.5 text-xs text-brand-700">Explore a fully loaded demo business (a restaurant) with sample conversations, orders and products.</p>
          <Button variant="outline" className="mt-3 w-full" onClick={tryDemo} loading={loading === "demo"}><Sparkles /> Try the demo</Button>
        </div>
      )}
    </div>
  );
}
