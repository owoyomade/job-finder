"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { Job, JobQuestion } from "@/lib/types";
import { Button, ErrorNote, Spinner, cx, inputClass } from "./ui";

/** Start building the application kit for a job. Resolves once the build has started. */
export async function startKit(jobId: string) {
  await api(`/api/applications/${encodeURIComponent(jobId)}/prepare`, { method: "POST" });
}

/**
 * Bottom sheet shown after swiping right: a few quick questions, then one tap
 * to build the tailored resume, cover letter and interview prep in the background.
 */
export function PrepareSheet({
  job,
  onClose,
  onStarted,
}: {
  job: Job;
  onClose: () => void;
  onStarted?: (job: Job) => void;
}) {
  const [questions, setQuestions] = useState<JobQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ questions: JobQuestion[]; answers: { question: string; answer: string }[] }>(
      `/api/jobs/${encodeURIComponent(job.id)}/questions`,
    )
      .then((r) => {
        setQuestions(r.questions);
        setAnswers(
          Object.fromEntries(r.questions.map((q) => [q.id, r.answers.find((a) => a.question === q.question)?.answer ?? ""])),
        );
      })
      .catch((e) => setError(e.message));
    dialogRef.current?.focus();
  }, [job.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  async function saveAnswers() {
    if (!questions) return;
    await api(`/api/applications/${encodeURIComponent(job.id)}/answers`, {
      method: "PUT",
      json: { answers: questions.map((q) => ({ question: q.question, answer: answers[q.id] ?? "" })) },
    });
  }

  async function build() {
    setError(null);
    setBusy(true);
    try {
      await saveAnswers();
      await startKit(job.id);
      onStarted?.(job);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function later() {
    await saveAnswers().catch(() => {});
    onClose();
  }

  const needsResume = error?.includes("My resume");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => !busy && onClose()}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prepare-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl outline-none sm:rounded-2xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        <h2 id="prepare-title" className="font-display text-xl font-bold leading-tight">
          {job.title}
        </h2>
        <p className="text-sm text-muted">{job.company}</p>

        <p className="mt-4 text-sm">
          A few quick questions so your resume, cover letter and interview answers use real details. All optional.
        </p>
        {!questions && !error && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Spinner /> Reading the posting…
          </p>
        )}
        <div className="mt-4 space-y-4">
          {questions?.map((q) => (
            <label key={q.id} className="block text-sm">
              <span className="font-semibold">{q.question}</span>
              <textarea
                className={cx(inputClass, "mt-1 min-h-16")}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              />
              {q.hint && <span className="text-xs text-muted">{q.hint}</span>}
            </label>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <ErrorNote message={error} />
          {needsResume && (
            <Link href="/profile" className="text-sm font-semibold text-spruce underline">
              Add my resume
            </Link>
          )}
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <Button onClick={build} busy={busy} disabled={!questions} className="sm:flex-1">
            Build my application kit
          </Button>
          <Button variant="secondary" onClick={later} disabled={busy}>
            Save for later
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Builds a tailored resume, a cover letter and interview questions with answers in the background, so you can
          keep swiping.
        </p>
      </div>
    </div>
  );
}
