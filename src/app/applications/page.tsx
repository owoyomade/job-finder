"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import {
  PICKABLE_STATUSES,
  STATUS_LABELS,
  COULDNT_APPLY_REASONS,
  type Application,
  type ApplicationStatus,
  type Job,
  type StoredDocument,
} from "@/lib/types";
import { AgeStamp } from "@/components/JobRow";
import { PrepareSheet, startKit } from "@/components/PrepareSheet";
import { AddJobForm } from "@/components/AddJobForm";
import { Button, Empty, PageHeader, Spinner, Tag, cx, inputClass } from "@/components/ui";

type Row = Application & { job: Job | null };

const GROUPS: { id: string; label: string; statuses: ApplicationStatus[] }[] = [
  { id: "todo", label: "To do", statuses: ["interested", "ready", "couldnt_apply"] },
  { id: "applied", label: "Applied", statuses: ["applied", "interview", "offer"] },
  { id: "closed", label: "Closed", statuses: ["rejected"] },
];

const TONE: Partial<Record<ApplicationStatus, "spruce" | "amber" | "rust" | "plain">> = {
  interested: "plain",
  ready: "amber",
  couldnt_apply: "rust",
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
  const [askReason, setAskReason] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function load() {
    const [a, d] = await Promise.all([
      api<{ applications: Row[] }>("/api/applications"),
      api<{ documents: StoredDocument[] }>("/api/documents"),
    ]);
    setRows(a.applications);
    setDocs(d.documents);
  }

  const anyPreparing = rows?.some((r) => r.prep?.state === "preparing") ?? false;

  // Load once, then keep refreshing while any application kit is being built.
  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      Promise.all([
        api<{ applications: Row[] }>("/api/applications"),
        api<{ documents: StoredDocument[] }>("/api/documents"),
      ])
        .then(([a, d]) => {
          if (cancelled) return;
          setRows(a.applications);
          setDocs(d.documents);
        })
        .catch(() => {});
    if (rows === null) refresh();
    const timer = anyPreparing ? setInterval(refresh, 4000) : null;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [anyPreparing]); // eslint-disable-line react-hooks/exhaustive-deps

  async function retry(jobId: string) {
    setRows((rs) => rs?.map((r) => (r.jobId === jobId ? { ...r, prep: { state: "preparing" } } : r)) ?? null);
    await startKit(jobId).catch(() => {});
    await load();
  }

  async function setStatus(jobId: string, status: ApplicationStatus, note?: string) {
    setRows((rs) => rs?.map((r) => (r.jobId === jobId ? { ...r, status } : r)) ?? null);
    await api(`/api/applications/${encodeURIComponent(jobId)}`, { method: "PUT", json: { status, note } });
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
            const interview = latestDoc(r.jobId, "interview");
            const prep = r.prep ?? { state: "idle" };
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
                    {r.status === "couldnt_apply" && (
                      <p className="mt-1 text-xs text-rust">
                        {[...r.history].reverse().find((h) => h.status === "couldnt_apply")?.note ?? "Not finished yet"}.
                        {(resume || cover) && " Your documents are ready below when you try again."}
                      </p>
                    )}
                    {appliedAt && (
                      <p className="mt-1 text-xs text-muted">
                        Applied {new Date(appliedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>

                {prep.state === "preparing" && (
                  <p className="mt-3 flex items-center gap-2 rounded-md bg-sunken px-3 py-2 text-sm" role="status">
                    <Spinner /> Building your resume, cover letter and interview prep…
                  </p>
                )}
                {prep.state === "error" && (
                  <p className="mt-3 rounded-md bg-rust-soft px-3 py-2 text-sm text-rust" role="alert">
                    Couldn’t build the kit: {prep.error}{" "}
                    <button type="button" className="font-semibold underline" onClick={() => retry(r.jobId)}>
                      Try again
                    </button>
                  </p>
                )}
                {prep.state === "done" && prep.failed?.length ? (
                  <p className="mt-3 text-sm text-amber">
                    Some parts didn’t finish ({prep.failed.join(", ")}).{" "}
                    <button type="button" className="font-semibold underline" onClick={() => retry(r.jobId)}>
                      Rebuild kit
                    </button>
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {r.status === "interested" && job && prep.state !== "preparing" && (
                    <Button onClick={() => setPreparing(job)}>Build application kit</Button>
                  )}
                  {(r.status === "ready" || r.status === "interested" || r.status === "couldnt_apply") && job?.applyUrl && (
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        setAskReason(null);
                        setConfirmApplied(r.jobId);
                      }}
                      className={cx(
                        "inline-flex items-center rounded-md px-3.5 py-2 text-sm font-semibold",
                        r.status === "interested" ? "border border-line hover:bg-sunken" : "bg-spruce text-white dark:text-[#0f1a23]",
                      )}
                    >
                      {r.status === "couldnt_apply" ? "Try again" : "Open application"}
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
                  {(interview || r.status === "applied" || r.status === "interview") && (
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
                      {PICKABLE_STATUSES.map((s) => (
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
                  <div className="mt-3 rounded-md bg-spruce-soft px-3 py-2 text-sm" role="status">
                    {askReason !== r.jobId ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span>Did you send the application?</span>
                        <Button
                          className="py-1"
                          onClick={() => {
                            setConfirmApplied(null);
                            setStatus(r.jobId, "applied");
                          }}
                        >
                          Yes, I applied
                        </Button>
                        <Button variant="secondary" className="py-1" onClick={() => setAskReason(r.jobId)}>
                          Couldn’t apply
                        </Button>
                        <Button variant="ghost" className="py-1" onClick={() => setConfirmApplied(null)}>
                          Not yet
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-2">What got in the way? We’ll keep it in To do so you can finish later.</p>
                        <div className="flex flex-wrap gap-2">
                          {COULDNT_APPLY_REASONS.map((reason) => (
                            <button
                              key={reason}
                              type="button"
                              className="rounded-md border border-line bg-surface px-2.5 py-1 hover:bg-sunken"
                              onClick={() => {
                                setConfirmApplied(null);
                                setAskReason(null);
                                setStatus(r.jobId, "couldnt_apply", reason);
                              }}
                            >
                              {reason}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
          onStarted={(j) =>
            setRows((rs) => rs?.map((r) => (r.jobId === j.id ? { ...r, prep: { state: "preparing" } } : r)) ?? null)
          }
        />
      )}
    </>
  );
}
