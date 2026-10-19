"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { Job, JobQuestion, StoredDocument } from "@/lib/types";
import { Button, ErrorNote, LinkButton, Spinner, cx, inputClass } from "./ui";

type Phase = "questions" | "preparing" | "done";

/**
 * Bottom sheet shown after swiping right: a few quick questions, then one tap
 * to generate a tailored resume and cover letter.
 */
export function PrepareSheet({ job, onClose }: { job: Job; onClose: () => void }) {
  const [questions, setQuestions] = useState<JobQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("questions");
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<{ resume: StoredDocument; cover: StoredDocument } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ questions: JobQuestion[]; answers: { question: string; answer: string }[] }>(
      `/api/jobs/${encodeURIComponent(job.id)}/questions`,
    )
      .then((r) => {
        setQuestions(r.questions);
        setAnswers(Object.fromEntries(r.questions.map((q) => [q.id, r.answers.find((a) => a.question === q.question)?.answer ?? ""])));
      })
      .catch((e) => setError(e.message));
    dialogRef.current?.focus();
  }, [job.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && phase !== "preparing" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  async function saveAnswers() {
    if (!questions) return;
    await api(`/api/applications/${encodeURIComponent(job.id)}/answers`, {
      method: "PUT",
      json: { answers: questions.map((q) => ({ question: q.question, answer: answers[q.id] ?? "" })) },
    });
  }

  async function prepare() {
    setError(null);
    setPhase("preparing");
    try {
      await saveAnswers();
      const r = await api<{ resume: StoredDocument; cover: StoredDocument }>(
        `/api/applications/${encodeURIComponent(job.id)}/prepare`,
        { method: "POST" },
      );
      setDocs(r);
      setPhase("done");
    } catch (e) {
      setError((e as Error).message);
      setPhase("questions");
    }
  }

  async function later() {
    await saveAnswers().catch(() => {});
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => phase !== "preparing" && onClose()}>
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
          {phase === "done" ? "Ready to apply" : job.title}
        </h2>
        <p className="text-sm text-muted">{job.company}</p>

        {phase === "questions" && (
          <>
            <p className="mt-4 text-sm">
              A few quick questions so your resume and cover letter use real details. All optional.
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
            <div className="mt-4">
              <ErrorNote message={error} />
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <Button onClick={prepare} disabled={!questions} className="sm:flex-1">
                Prepare resume + cover letter
              </Button>
              <Button variant="secondary" onClick={later}>
                Save for later
              </Button>
            </div>
          </>
        )}

        {phase === "preparing" && (
          <div className="py-10 text-center" role="status">
            <Spinner />
            <p className="mt-3 font-semibold">Tailoring your resume and writing your cover letter…</p>
            <p className="mt-1 text-sm text-muted">This usually takes under a minute.</p>
          </div>
        )}

        {phase === "done" && docs && (
          <div className="mt-4 space-y-4">
            <p className="text-sm">Both documents are ready. Open the application, upload them, then mark it as applied.</p>
            <div className="grid grid-cols-2 gap-2">
              <LinkButton href={`/api/documents/${docs.resume.id}/export?format=pdf`}>Resume PDF</LinkButton>
              <LinkButton href={`/api/documents/${docs.resume.id}/export?format=docx`}>Resume DOCX</LinkButton>
              <LinkButton href={`/api/documents/${docs.cover.id}/export?format=pdf`}>Cover letter PDF</LinkButton>
              <LinkButton href={`/api/documents/${docs.cover.id}/export?format=docx`}>Cover letter DOCX</LinkButton>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/jobs/${encodeURIComponent(job.id)}`}
                className="inline-flex flex-1 items-center justify-center rounded-md bg-spruce px-3.5 py-2 text-sm font-semibold text-white dark:text-[#0f1a23]"
              >
                Review and apply
              </Link>
              <Button variant="secondary" onClick={onClose}>
                Keep swiping
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
