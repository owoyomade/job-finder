"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { InterviewSet, Level, StoredDocument, StoredProfile } from "@/lib/types";
import { InterviewViewer } from "@/components/InterviewViewer";
import { LevelSelect } from "@/components/LevelSelect";
import { Button, ErrorNote, Field, PageHeader, cx, inputClass } from "@/components/ui";

export default function InterviewPage() {
  const [form, setForm] = useState({ title: "", company: "", description: "", focus: "" });
  const [level, setLevel] = useState<Level | "">("");
  const [count, setCount] = useState(40);
  const [useProfile, setUseProfile] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [doc, setDoc] = useState<StoredDocument | null>(null);
  const [past, setPast] = useState<StoredDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ profile: StoredProfile | null }>("/api/profile").then(({ profile }) => {
      setHasProfile(Boolean(profile));
      if (profile?.targetLevel) setLevel(profile.targetLevel);
    });
    api<{ documents: StoredDocument[] }>("/api/documents?kind=interview").then((r) => setPast(r.documents));
  }, []);

  async function generate(e?: React.FormEvent, more?: { count: number; focus: string }) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = more
        ? { jobId: doc!.jobId, appendTo: doc!.id, count: more.count, focus: more.focus, level, useProfile }
        : { ...form, level, count, useProfile };
      const r = await api<{ document: StoredDocument }>("/api/interview", { method: "POST", json: body });
      setDoc(r.document);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader
        title="Interview prep"
        intro="Paste any job posting to get likely interview questions with model answers. For a saved job, use its Interview prep tab instead."
      />

      {!doc && (
        <form onSubmit={generate} className="grid gap-4 rounded-lg border border-line bg-surface p-4 md:grid-cols-2 md:p-5">
          <Field label="Job title">
            <input className={inputClass} required value={form.title} onChange={set("title")} placeholder="e.g. Welder, Early Childhood Educator, Policy Analyst" />
          </Field>
          <Field label="Company or department">
            <input className={inputClass} value={form.company} onChange={set("company")} placeholder="e.g. Health Canada" />
          </Field>
          <Field label="Job description" className="md:col-span-2">
            <textarea className={cx(inputClass, "min-h-48")} required value={form.description} onChange={set("description")} />
          </Field>
          <Field label="Level">
            <LevelSelect value={level} onChange={setLevel} />
          </Field>
          <Field label="Number of questions">
            <select className={inputClass} value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[20, 40, 60, 80].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Focus on (optional)" className="md:col-span-2">
            <input
              className={inputClass}
              value={form.focus}
              onChange={set("focus")}
              placeholder="e.g. behavioural questions using the STAR method, Excel technical questions"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={useProfile && hasProfile}
              disabled={!hasProfile}
              onChange={(e) => setUseProfile(e.target.checked)}
            />
            {hasProfile
              ? "Base answers on my resume"
              : "Add your resume on My resume to get answers built from your own experience"}
          </label>
          <div className="md:col-span-2">
            <ErrorNote message={error} />
            <Button type="submit" busy={busy} className="mt-2">
              {busy ? "Generating… (1–3 minutes)" : "Generate questions"}
            </Button>
          </div>
        </form>
      )}

      {doc && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">{doc.title}</h2>
            <Button variant="secondary" onClick={() => setDoc(null)}>
              Start a new set
            </Button>
          </div>
          <ErrorNote message={error} />
          <InterviewViewer
            docId={doc.id}
            set={doc.data as InterviewSet}
            busy={busy}
            onMore={(n, focus) => generate(undefined, { count: n, focus })}
          />
        </>
      )}

      {!doc && past.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-muted">Earlier sets</h2>
          <ul className="space-y-1">
            {past.map((d) => (
              <li key={d.id}>
                <button type="button" className="text-sm font-medium text-spruce hover:underline" onClick={() => setDoc(d)}>
                  {d.title}
                </button>
                <span className="ml-2 text-xs text-muted">
                  {(d.data as InterviewSet).questions.length} questions · {new Date(d.createdAt).toLocaleDateString("en-CA")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
