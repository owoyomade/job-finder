"use client";

import { useState } from "react";
import { Button, ErrorNote, inputClass } from "@/components/ui";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      return;
    }
    setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Sign-in failed.");
    setBusy(false);
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="font-display text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-1 text-muted">Enter your Job Finder password.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input
          type="password"
          autoComplete="current-password"
          aria-label="Password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
        />
        <ErrorNote message={error} />
        <Button type="submit" busy={busy} className="w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
}
