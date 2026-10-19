"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import {
  STATUS_LABELS,
  type Application,
  type ApplicationStatus,
  type Job,
  type StoredDocument,
} from "@/lib/types";
import { AgeStamp } from "@/components/JobRow";
import { PrepareSheet } from "@/components/PrepareSheet";
import { AddJobForm } from "@/components/AddJobForm";
import { Button, Empty, PageHeader, Tag, cx, inputClass } from "@/components/ui";

type Row = Application & { job: Job | null };

const GROUPS: { id: string; label: string; statuses: ApplicationStatus[] }[] = [
  { id: "todo", label: "To do", statuses: ["interested", "ready"] },
  { id: "applied", label: "Applied", statuses: ["applied", "interview", "offer"] },
  { id: "closed", label: "Closed", statuses: ["rejected"] },
];

const TONE: Partial<Record<ApplicationStatus, "spruce" | "amber" | "rust" | "plain">> = {
  interested: "plain",
  ready: "amber",
  applied: "spruce",
  interview: "spruce",
  offer: "spruce",
  rejected: "rust",
};

export default function ApplicationsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [group, setGroup] = useState("todo");
  const [preparing, setPreparing] = useState<Job | null>(null);
  const [confirmApplied, setConfirmApplied] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function load() {
    const [a, d] = await Promise.all([
      api<{ applications: Row[] }>("/api/applications"),
      api<{ documents: StoredDocument[] }>("/api/documents"),
    ]);
    setRows(a.applications);
    setDocs(d.documents);
  }

  useEffect(() => {
    Promise.all([
      api<{ applications: Row[] }>("/api/applications"),
      api<{ documents: StoredDocument[] }>("/api/documents"),
    ]).then(([a, d]) => {
      setRows(a.applications);
      setDocs(d.documents);
    });
  }, []);

  async function setStatus(jobId: string, status: ApplicationStatus) {
    setRows((rs) => rs?.map((r) => (r.jobId === jobId ? { ...r, status } : r)) ?? null);
    await api(`/api/applications/${encodeURIComponent(jobId)}`, { method: "PUT", json: { status } });
    await load();
  }

  async function remove(jobId: string) {
    await api(`/api/applications/${encodeURIComponent(jobId)}`, { method: "DELETE" });
    setRows((rs) => rs?.filter((r) => r.jobId !== jobId) ?? null);
  }

  const counts = Object.fromEntries(
    GROUPS.map((g) => [g.id, rows?.filter((r) => g.statuses.includes(r.status)).length ?? 0]),
  );
  const shown = rows?.filter((r) => GROUPS.find((g) => g.id === group)!.statuses.includes(r.status)) ?? [];
  const latestDoc = (jobId: string, kind: StoredDocument["kind"]) => docs.find((d) => d.jobId === jobId && d.kind === kind);

  return (
    <>
      <PageHeader
        title="Applications"
        intro="Every job you swiped right on, from interested to offer. Found one elsewhere? Add it here."
        actions={
          <Button variant={adding ? "secondary" : "primary"} onClick={() => setAdding((a) => !a)}>
            {adding ? "Close" : "Add a job"}
          </Button>
        }
      />
      {adding && <AddJobForm />}

      <div className="mb-5 flex gap-1.5" role="tablist" aria-label="Application stage">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={group === g.id}
            type="button"
            onClick={() => setGroup(g.id)}
            className={cx(
              "rounded-md border px-3 py-1.5 text-sm font-medium",
              group === g.id ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:bg-sunken",
            )}
          >
            {g.label} <span className="tabular-nums opacity-70">{counts[g.id]}</span>
          </button>
        ))}
      </div>

      {rows === null ? (
        <p className="text-muted">Loading…</p>
      ) : shown.length === 0 ? (
        <Empty title={group === "todo" ? "Nothing waiting" : group === "applied" ? "No applications sent yet" : "Nothing closed"}>
          {group === "todo" && (
            <Link href="/discover" className="font-semibold text-spruce underline">
              Swipe through new jobs
            </Link>
          )}
        </Empty>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => {
            const job = r.job;
            const resume = latestDoc(r.jobId, "resume");
            const cover = latestDoc(r.jobId, "cover");
            const appliedAt = [...r.history].reverse().find((h) => h.status === "applied")?.at;
            return (
              <li key={r.jobId} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex gap-4">
                  {job && <AgeStamp postedAt={job.postedAt} expired={job.expired} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        href={`/jobs/${encodeURIComponent(r.jobId)}`}
                        className="font-display text-lg font-semibold leading-snug hover:underline"
                      >
                        {job?.title ?? "Job no longer available"}
                      </Link>
                      <Tag tone={TONE[r.status]}>{STATUS_LABELS[r.status]}</Tag>
                    </div>
                    {job && (
                      <p className="text-sm">
                        {job.company} <span className="text-muted">— {job.location}</span>
                      </p>
                    )}
                    {appliedAt && (
                      <p className="mt-1 text-xs text-muted">
                        Applied {new Date(appliedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {r.status === "interested" && job && (
                    <Button onClick={() => setPreparing(job)}>Prepare application</Button>
                  )}
                  {(r.status === "ready" || r.status === "interested") && job?.applyUrl && (
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setConfirmApplied(r.jobId)}
                      className={cx(
                        "inline-flex items-center rounded-md px-3.5 py-2 text-sm font-semibold",
                        r.status === "ready" ? "bg-spruce text-white dark:text-[#0f1a23]" : "border border-line hover:bg-sunken",
                      )}
                    >
                      Open application
                    </a>
                  )}
                  {resume && (
                    <a className="text-sm font-semibold text-spruce hover:underline" href={`/api/documents/${resume.id}/export?format=pdf`}>
                      Resume PDF
                    </a>
                  )}
                  {cover && (
                    <a className="text-sm font-semibold text-spruce hover:underline" href={`/api/documents/${cover.id}/export?format=pdf`}>
                      Cover letter PDF
                    </a>
                  )}
                  {(r.status === "applied" || r.status === "interview") && (
                    <Link
                      href={`/jobs/${encodeURIComponent(r.jobId)}?tab=interview`}
                      className="text-sm font-semibold text-spruce hover:underline"
                    >
                      Interview prep
                    </Link>
                  )}
                  <label className="ml-auto flex items-center gap-2 text-sm">
                    <span className="sr-only">Status</span>
                    <select
                      className={cx(inputClass, "w-auto py-1.5")}
                      value={r.status}
                      onChange={(e) => setStatus(r.jobId, e.target.value as ApplicationStatus)}
                    >
                      {(["interested", "ready", "applied", "interview", "offer", "rejected"] as const).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="text-sm text-muted hover:text-rust" onClick={() => remove(r.jobId)}>
                    Remove
                  </button>
                </div>

                {confirmApplied === r.jobId && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-spruce-soft px-3 py-2 text-sm" role="status">
                    <span>Did you send the application?</span>
                    <Button
                      className="py-1"
                      onClick={() => {
                        setConfirmApplied(null);
                        setStatus(r.jobId, "applied");
                      }}
                    >
                      Yes, mark as applied
                    </Button>
                    <Button variant="ghost" className="py-1" onClick={() => setConfirmApplied(null)}>
                      Not yet
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {preparing && (
        <PrepareSheet
          job={preparing}
          onClose={() => {
            setPreparing(null);
            load();
          }}
        />
      )}
    </>
  );
}
