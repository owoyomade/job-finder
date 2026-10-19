"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { DEFAULT_PREFS, type Prefs } from "@/lib/types";
import { cx } from "./ui";

/** How the automatic application kit behaves. Saved as soon as you change it. */
export function AppSettings() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<{ prefs: Prefs }>("/api/prefs")
      .then((r) => setPrefs(r.prefs))
      .catch(() => setPrefs(DEFAULT_PREFS));
  }, []);

  async function update(patch: Partial<Prefs>) {
    setPrefs((p) => ({ ...(p ?? DEFAULT_PREFS), ...patch }));
    const r = await api<{ prefs: Prefs }>("/api/prefs", { method: "PUT", json: patch });
    setPrefs(r.prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!prefs) return null;

  const option = (value: Prefs["swipeAction"], title: string, body: string) => (
    <label
      className={cx(
        "flex cursor-pointer gap-3 rounded-lg border p-3 text-sm",
        prefs.swipeAction === value ? "border-spruce bg-spruce-soft" : "border-line",
      )}
    >
      <input
        type="radio"
        name="swipeAction"
        className="mt-1"
        checked={prefs.swipeAction === value}
        onChange={() => update({ swipeAction: value })}
      />
      <span>
        <span className="font-semibold">{title}</span>
        <span className="block text-muted">{body}</span>
      </span>
    </label>
  );

  return (
    <section id="settings" className="mb-8 scroll-mt-6 rounded-lg border border-line bg-surface p-4 md:p-5" aria-labelledby="settings-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="settings-title" className="font-display text-lg font-semibold">
          When I swipe right on a job
        </h2>
        {saved && (
          <span className="text-sm text-spruce" role="status">
            Saved
          </span>
        )}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {option("ask", "Ask me a few quick questions first", "More accurate: your answers add real details the posting asks for.")}
        {option("auto", "Build my application kit straight away", "Fastest: the resume, cover letter and interview prep start building as you swipe.")}
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={prefs.kitInterview} onChange={(e) => update({ kitInterview: e.target.checked })} />
        Include interview questions with answers in every kit
      </label>
    </section>
  );
}
