"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { api } from "@/lib/api";

export function ChangePasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (f.newPassword !== f.confirm) return setError("The new passwords don't match");
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/password", { body: { currentPassword: f.currentPassword, newPassword: f.newPassword } });
      window.location.href = "/dashboard";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <Field label="Temporary password"><PasswordInput name="currentPassword" required autoComplete="current-password" /></Field>
      <Field label="New password" hint="At least 10 characters, with letters and numbers."><PasswordInput name="newPassword" required minLength={10} autoComplete="new-password" /></Field>
      <Field label="Repeat new password"><PasswordInput name="confirm" required minLength={10} autoComplete="new-password" /></Field>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <Button type="submit" className="w-full" loading={busy}>Save and continue</Button>
    </form>
  );
}
