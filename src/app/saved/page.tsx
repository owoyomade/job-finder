"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { Job } from "@/lib/types";
import { JobRow } from "@/components/JobRow";
import { Button, Empty, ErrorNote, Field, PageHeader, cx, inputClass } from "@/components/ui";

type Row = Job & { saved?: boolean };

export default function SavedPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Row[] | null>(null);
  const [form, setForm] = useState({ title: "", company: "", location: "", applyUrl: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);

  useEffect(() => {
    api<{ jobs: Row[] }>("/api/jobs/saved").then((r) => setJobs(r.jobs));
  }, []);

  async function unsave(job: Row) {
    await api(`/api/jobs/${encodeURIComponent(job.id)}`, { method: "PATCH", json: { saved: false } });
    setJobs((js) => js?.filter((j) => j.id !== job.id) ?? null);
  }

  async function addPasted(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { job } = await api<{ job: Job }>("/api/jobs/manual", { method: "POST", json: form });
      router.push(`/jobs/${encodeURIComponent(job.id)}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader
        title="Saved jobs"
        intro="Jobs you’re applying to. Found one elsewhere? Paste it in to tailor your resume and prepare for it."
        actions={
          <Button variant={showPaste ? "secondary" : "primary"} onClick={() => setShowPaste((s) => !s)}>
            {showPaste ? "Close" : "Paste a job"}
          </Button>
        }
      />

      {showPaste && (
        <form onSubmit={addPasted} className="mb-8 grid gap-4 rounded-lg border border-line bg-surface p-4 md:grid-cols-2 md:p-5">
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
            <textarea
              className={cx(inputClass, "min-h-48")}
              required
              value={form.description}
              onChange={set("description")}
            />
          </Field>
          <div className="md:col-span-2">
            <ErrorNote message={error} />
            <Button type="submit" busy={busy} className="mt-2">
              Add job
            </Button>
          </div>
        </form>
      )}

      {jobs === null ? (
        <p className="text-muted">Loading…</p>
      ) : jobs.length ? (
        <ul className="rounded-lg border border-line bg-surface px-4">
          {jobs.map((j) => (
            <JobRow key={j.id} job={j} onToggleSave={unsave} />
          ))}
        </ul>
      ) : (
        <Empty title="No saved jobs yet">Save jobs from your search results, or paste one in.</Empty>
      )}
    </>
  );
}
