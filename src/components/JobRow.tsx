"use client";

import Link from "next/link";
import { ageBucket, ageInDays } from "@/lib/jobs/freshness";
import { LEVEL_LABELS, SOURCE_LABELS, type Job } from "@/lib/types";
import { Tag, cx } from "./ui";

const STAMP: Record<ReturnType<typeof ageBucket>, string> = {
  fresh: "border-spruce text-spruce",
  aging: "border-amber text-amber",
  old: "border-rust text-rust",
  unknown: "border-slate text-slate",
};

export function AgeStamp({ postedAt, expired }: { postedAt: string | null; expired?: boolean }) {
  const days = ageInDays(postedAt);
  const bucket = expired ? "old" : ageBucket(postedAt);
  const big = expired ? "×" : days === null ? "?" : days === 0 ? "New" : `${days}d`;
  const label = expired
    ? "Posting expired"
    : days === null
      ? "Posting date unknown"
      : days === 0
        ? "Posted today"
        : `Posted ${days} day${days === 1 ? "" : "s"} ago`;
  return (
    <div className={cx("flex w-16 shrink-0 flex-col justify-center border-l-4 pl-3", STAMP[bucket])} title={label}>
      <span className="font-display text-2xl font-extrabold leading-none tabular-nums">{big}</span>
      <span className="sr-only">{label}</span>
      <span aria-hidden className="mt-1 text-[11px] leading-tight text-muted">
        {expired ? "expired" : days === null ? "no date" : "ago"}
      </span>
    </div>
  );
}

const FIT: Record<string, { text: string; tone: "spruce" | "amber" | "plain" }> = {
  match: { text: "Your level", tone: "spruce" },
  stretch: { text: "Stretch", tone: "amber" },
  below: { text: "Below your level", tone: "plain" },
};

export function JobRow({
  job,
  onToggleSave,
}: {
  job: Job & { saved?: boolean };
  onToggleSave?: (job: Job & { saved?: boolean }) => void;
}) {
  const fit = job.levelFit ? FIT[job.levelFit] : undefined;
  return (
    <li className="flex gap-4 border-b border-line py-4 last:border-b-0">
      <AgeStamp postedAt={job.postedAt} expired={job.expired} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <Link
            href={`/jobs/${encodeURIComponent(job.id)}`}
            className="font-display text-lg font-semibold leading-snug hover:underline"
          >
            {job.title}
          </Link>
          {typeof job.matchScore === "number" && (
            <span
              className={cx(
                "shrink-0 text-sm font-semibold tabular-nums",
                job.matchScore >= 60 ? "text-spruce" : job.matchScore >= 35 ? "text-amber" : "text-muted",
              )}
              title="Share of the posting's keywords already in your resume"
            >
              {job.matchScore}% match
            </span>
          )}
        </div>
        <p className="text-sm">
          {job.company} <span className="text-muted">— {job.location}</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {job.government && <Tag tone="spruce">Government</Tag>}
          {fit && <Tag tone={fit.tone}>{fit.text}</Tag>}
          {job.detectedLevel && <Tag>{LEVEL_LABELS[job.detectedLevel]}</Tag>}
          {job.remote && <Tag>Remote</Tag>}
          {job.salary && <Tag>{job.salary}</Tag>}
          <span className="text-xs text-muted">
            via {job.publisher || SOURCE_LABELS[job.source]}
            {job.publisher && job.source !== "mock" && job.publisher !== SOURCE_LABELS[job.source]
              ? ` (${SOURCE_LABELS[job.source]})`
              : ""}
          </span>
        </div>
        {job.missingKeywords && job.missingKeywords.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            Missing from your resume: {job.missingKeywords.slice(0, 6).join(", ")}
          </p>
        )}
      </div>
      {onToggleSave && (
        <button
          type="button"
          onClick={() => onToggleSave(job)}
          aria-pressed={Boolean(job.saved)}
          className={cx(
            "h-fit shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold",
            job.saved ? "border-spruce bg-spruce-soft text-spruce" : "border-line text-muted hover:bg-sunken",
          )}
        >
          {job.saved ? "Saved" : "Save"}
        </button>
      )}
    </li>
  );
}
