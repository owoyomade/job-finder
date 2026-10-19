"use client";

import { useState } from "react";
import { INTERVIEW_CATEGORIES, type InterviewSet } from "@/lib/types";
import { Button, LinkButton, Tag, cx, inputClass } from "./ui";

const DIFF_TONE = { easy: "spruce", medium: "amber", hard: "rust" } as const;

export function InterviewViewer({
  docId,
  set,
  onMore,
  busy,
}: {
  docId: number;
  set: InterviewSet;
  onMore?: (count: number, focus: string) => void;
  busy?: boolean;
}) {
  const [cat, setCat] = useState<string>("All");
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [moreCount, setMoreCount] = useState(20);
  const [focus, setFocus] = useState("");

  const counts = Object.fromEntries(
    INTERVIEW_CATEGORIES.map((c) => [c, set.questions.filter((q) => q.category === c).length]),
  );
  const shown = set.questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => cat === "All" || q.category === cat)
    .filter(({ q }) => !query || `${q.question} ${q.answer}`.toLowerCase().includes(query.toLowerCase()));

  const toggle = (i: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{set.questions.length} questions with model answers</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" type="button" onClick={() => setOpen(new Set(shown.map((s) => s.i)))}>
            Show all answers
          </Button>
          <LinkButton href={`/api/documents/${docId}/export?format=pdf`}>Download PDF</LinkButton>
          <LinkButton href={`/api/documents/${docId}/export?format=md`}>Download Markdown</LinkButton>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Question categories">
        {["All", ...INTERVIEW_CATEGORIES].map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={cat === c}
            type="button"
            onClick={() => setCat(c)}
            className={cx(
              "rounded-md border px-2.5 py-1 text-sm",
              cat === c ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:bg-sunken",
            )}
          >
            {c} <span className="tabular-nums opacity-70">{c === "All" ? set.questions.length : counts[c]}</span>
          </button>
        ))}
      </div>

      <input
        className={cx(inputClass, "mb-4 max-w-sm")}
        placeholder="Search questions and answers"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search questions"
      />

      <ol className="divide-y divide-line rounded-lg border border-line bg-surface">
        {shown.map(({ q, i }) => {
          const isOpen = open.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-sunken/60"
              >
                <span className="mt-0.5 w-7 shrink-0 text-sm tabular-nums text-muted">{i + 1}.</span>
                <span className="flex-1">
                  <span className="font-medium">{q.question}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <Tag>{q.category}</Tag>
                    <Tag tone={DIFF_TONE[q.difficulty]}>{q.difficulty}</Tag>
                  </span>
                </span>
                <span aria-hidden className="text-muted">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <div className="prose-measure space-y-3 px-4 pb-4 pl-14 text-sm">
                  <p className="text-muted">
                    <span className="font-semibold text-ink">Why they ask: </span>
                    {q.whyAsked}
                  </p>
                  <div className="whitespace-pre-line rounded-md border-l-4 border-spruce bg-spruce-soft/50 px-3 py-2 leading-relaxed">
                    {q.answer}
                  </div>
                  {q.keyPoints.length > 0 && (
                    <ul className="list-disc space-y-0.5 pl-5">
                      {q.keyPoints.map((k) => (
                        <li key={k}>{k}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {onMore && (
        <form
          className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            onMore(moreCount, focus);
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">More questions</span>
            <select className={inputClass} value={moreCount} onChange={(e) => setMoreCount(Number(e.target.value))}>
              {[10, 20, 30, 40].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
            <span className="font-semibold">Focus on (optional)</span>
            <input
              className={inputClass}
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. SQL technical questions, conflict, leadership"
            />
          </label>
          <Button type="submit" busy={busy}>
            {busy ? "Generating…" : "Generate more"}
          </Button>
        </form>
      )}
    </div>
  );
}
