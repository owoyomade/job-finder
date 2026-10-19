"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { Job } from "@/lib/types";
import { Button, ErrorNote, Field, cx, inputClass } from "./ui";
import { startKit } from "./PrepareSheet";

/** Add a job found somewhere else by pasting its description. */
export function AddJobForm() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", company: "", location: "", applyUrl: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [buildKit, setBuildKit] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { job } = await api<{ job: Job }>("/api/jobs/manual", { method: "POST", json: form });
      if (buildKit) {
        // The job is saved even if the kit can't start (e.g. no resume yet); the job page explains why.
        await startKit(job.id).catch(() => {});
      }
      router.push(`/jobs/${encodeURIComponent(job.id)}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={submit} className="mb-8 grid gap-4 rounded-lg border border-line bg-surface p-4 md:grid-cols-2 md:p-5">
      <Field label="Job title">
        <input className={inputClass} required value={form.title} onChange={set("title")} />
      </Field>
      <Field label="Company">
        <input className={inputClass} value={form.company} onChange={set("company")} />
      </Field>
      <Field label="Location">
        <input className={inputClass} value={form.location} onChange={set("location")} placeholder="e.g. Ottawa, ON or Remote" />
      </Field>
      <Field label="Posting link (optional)">
        <input className={inputClass} type="url" value={form.applyUrl} onChange={set("applyUrl")} />
      </Field>
      <Field label="Full job description" className="md:col-span-2">
        <textarea className={cx(inputClass, "min-h-48")} required value={form.description} onChange={set("description")} />
      </Field>
      <label className="flex items-start gap-2 text-sm md:col-span-2">
        <input type="checkbox" className="mt-1" checked={buildKit} onChange={(e) => setBuildKit(e.target.checked)} />
        <span>
          <span className="font-semibold">Build my application kit now</span>
          <span className="block text-muted">A tailored resume, a cover letter and interview questions with answers.</span>
        </span>
      </label>
      <div className="md:col-span-2">
        <ErrorNote message={error} />
        <Button type="submit" busy={busy} className="mt-2">
          Add job
        </Button>
      </div>
    </form>
  );
}
