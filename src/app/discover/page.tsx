"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { LEVEL_LABELS, type Job, type SearchParams } from "@/lib/types";
import { AgeStamp } from "@/components/JobRow";
import { PrepareSheet } from "@/components/PrepareSheet";
import { Button, Empty, ErrorNote, Field, Tag, cx, inputClass } from "@/components/ui";
import { LevelSelect } from "@/components/LevelSelect";

type Deck = { params: SearchParams | null; jobs: Job[]; seen?: number };
const THRESHOLD = 110;

export default function DiscoverPage() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [preparing, setPreparing] = useState<Job | null>(null);
  const [lastSkipped, setLastSkipped] = useState<Job | null>(null);

  const load = useCallback(() => {
    api<Deck>("/api/deck")
      .then((d) => {
        setError(null);
        setDeck(d);
        setIndex(0);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const job = deck?.jobs[index] ?? null;

  const decide = useCallback(
    async (j: Job, liked: boolean) => {
      setIndex((i) => i + 1);
      setLastSkipped(liked ? null : j);
      await api(`/api/applications/${encodeURIComponent(j.id)}`, {
        method: "PUT",
        json: { status: liked ? "interested" : "skipped" },
      }).catch(() => {});
      if (liked) setPreparing(j);
    },
    [],
  );

  async function undo() {
    if (!lastSkipped) return;
    await api(`/api/applications/${encodeURIComponent(lastSkipped.id)}`, { method: "DELETE" }).catch(() => {});
    setIndex((i) => Math.max(0, i - 1));
    setLastSkipped(null);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!job || preparing || (e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") decide(job, true);
      if (e.key === "ArrowLeft") decide(job, false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [job, preparing, decide]);

  if (error) return <ErrorNote message={error} />;
  if (!deck) return <p className="text-muted">Finding jobs…</p>;
  if (!deck.params) return <FirstSearch onDone={load} />;

  const remaining = deck.jobs.length - index;

  return (
    <div className="mx-auto max-w-md">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight">Discover</h1>
          <p className="truncate text-sm text-muted">
            {deck.params.query}
            {deck.params.location ? ` · ${deck.params.location}` : " · Canada"}
            {deck.params.level ? ` · ${LEVEL_LABELS[deck.params.level]}` : ""}
          </p>
        </div>
        <Link href="/jobs" className="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-sunken">
          Change search
        </Link>
      </header>

      {job ? (
        <>
          <SwipeCard key={job.id} job={job} onDecide={(liked) => decide(job, liked)} />
          <div className="mt-5 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => decide(job, false)}
              aria-label="Skip this job"
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-rust text-2xl font-bold text-rust hover:bg-rust-soft"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={!lastSkipped}
              aria-label="Undo last skip"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-muted hover:bg-sunken disabled:opacity-30"
            >
              ↺
            </button>
            <button
              type="button"
              onClick={() => decide(job, true)}
              aria-label="Interested in this job"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-spruce text-2xl font-bold text-white hover:brightness-110 dark:text-[#0f1a23]"
            >
              ✓
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-muted">
            {remaining} left · swipe right or press → if interested, left or ← to skip
          </p>
        </>
      ) : (
        <Empty title="You’ve seen every job in this search">
          <p>Try a wider date range, another title, or check back tomorrow for new postings.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/applications" className="font-semibold text-spruce underline">
              Go to my applications
            </Link>
            <span aria-hidden>·</span>
            <Link href="/jobs" className="font-semibold text-spruce underline">
              Change search
            </Link>
          </div>
        </Empty>
      )}

      {preparing && <PrepareSheet job={preparing} onClose={() => setPreparing(null)} />}
    </div>
  );
}

function SwipeCard({ job, onDecide }: { job: Job; onDecide: (liked: boolean) => void }) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<null | "left" | "right">(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  function release() {
    if (Math.abs(dx) > THRESHOLD) {
      const dir = dx > 0 ? "right" : "left";
      setLeaving(dir);
      setTimeout(() => onDecide(dir === "right"), 180);
    } else setDx(0);
    start.current = null;
    setDragging(false);
  }

  const x = leaving === "right" ? 600 : leaving === "left" ? -600 : dx;
  const tilt = x / 25;
  const hint = dx > 40 ? "interested" : dx < -40 ? "skip" : null;
  const keywords = job.missingKeywords ?? [];

  return (
    <article
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return;
        start.current = { x: e.clientX, y: e.clientY };
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => start.current && setDx(e.clientX - start.current.x)}
      onPointerUp={release}
      onPointerCancel={release}
      style={{
        transform: `translateX(${x}px) rotate(${tilt}deg)`,
        transition: dragging ? "none" : "transform 180ms ease-out",
        touchAction: "pan-y",
      }}
      className={cx(
        "relative select-none overflow-hidden rounded-2xl border bg-surface p-5 shadow-lg",
        hint === "interested" ? "border-spruce" : hint === "skip" ? "border-rust" : "border-line",
      )}
      aria-label={`${job.title} at ${job.company}`}
    >
      {hint && (
        <span
          className={cx(
            "absolute right-4 top-4 rounded-md border-2 px-2 py-0.5 font-display text-sm font-extrabold uppercase",
            hint === "interested" ? "border-spruce text-spruce" : "border-rust text-rust",
          )}
          aria-hidden
        >
          {hint === "interested" ? "Interested" : "Skip"}
        </span>
      )}
      <div className="flex gap-4">
        <AgeStamp postedAt={job.postedAt} expired={job.expired} />
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold leading-tight">{job.title}</h2>
          <p className="mt-1">{job.company}</p>
          <p className="text-sm text-muted">{job.location}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {job.government && <Tag tone="spruce">Government</Tag>}
        {job.levelFit === "match" && <Tag tone="spruce">Your level</Tag>}
        {job.levelFit === "stretch" && <Tag tone="amber">Stretch</Tag>}
        {job.detectedLevel && <Tag>{LEVEL_LABELS[job.detectedLevel]}</Tag>}
        {job.remote && <Tag>Remote</Tag>}
        {job.salary && <Tag>{job.salary}</Tag>}
      </div>

      {typeof job.matchScore === "number" && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">Resume match</span>
            <span className="font-display text-xl font-bold tabular-nums">{job.matchScore}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
            <div
              className={cx("h-full rounded-full", job.matchScore >= 60 ? "bg-spruce" : job.matchScore >= 35 ? "bg-amber" : "bg-slate")}
              style={{ width: `${job.matchScore}%` }}
            />
          </div>
          {keywords.length > 0 && <p className="mt-2 text-xs text-muted">To work in: {keywords.slice(0, 5).join(", ")}</p>}
        </div>
      )}

      {job.description && (
        <p className="mt-5 line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-muted">{job.description}</p>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-xs text-muted">via {job.publisher ?? job.source}</span>
        <Link href={`/jobs/${encodeURIComponent(job.id)}`} className="font-semibold text-spruce hover:underline">
          Full details
        </Link>
      </div>
    </article>
  );
}

function FirstSearch({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [level, setLevel] = useState<SearchParams["level"]>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/jobs/search", {
        method: "POST",
        json: { query, location, level, postedWithin: "14", sources: ["jsearch", "jobbank", "adzuna", "remotive"] },
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-bold tracking-tight">What are you looking for?</h1>
      <p className="mt-1 text-muted">Tell us the role and we’ll line up fresh jobs to swipe through.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Job title">
          <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Data Analyst" required />
        </Field>
        <Field label="City or province" hint="Leave blank for all of Canada">
          <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Toronto, ON" />
        </Field>
        <Field label="What level are you applying for?">
          <LevelSelect value={level} onChange={setLevel} />
        </Field>
        <ErrorNote message={error} />
        <Button type="submit" busy={busy} className="w-full">
          {busy ? "Finding jobs…" : "Start swiping"}
        </Button>
      </form>
    </div>
  );
}
