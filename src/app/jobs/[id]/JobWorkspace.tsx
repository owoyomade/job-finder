"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { matchResume, profileToText, type MatchResult } from "@/lib/match";
import {
  LEVEL_LABELS,
  PICKABLE_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
  type PrepState,
  type CoverLetter,
  type InterviewSet,
  type Job,
  type StoredDocument,
  type TailoredResume,
} from "@/lib/types";
import { AgeStamp } from "@/components/JobRow";
import { InterviewViewer } from "@/components/InterviewViewer";
import { startKit } from "@/components/PrepareSheet";
import { Button, Empty, ErrorNote, LinkButton, Notice, Spinner, Tag, cx, inputClass } from "@/components/ui";

type JobView = Job & { saved: boolean; descriptionError?: string };
type Tab = "description" | "resume" | "cover" | "interview";

const TABS: { id: Tab; label: string }[] = [
  { id: "description", label: "Job description" },
  { id: "resume", label: "Tailored resume" },
  { id: "cover", label: "Cover letter" },
  { id: "interview", label: "Interview prep" },
];

export function JobWorkspace() {
  const { id } = useParams<{ id: string }>();
  const jobId = decodeURIComponent(id);
  const [job, setJob] = useState<JobView | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const initialTab = useSearchParams().get("tab");
  const [tab, setTab] = useState<Tab>(
    TABS.some((t) => t.id === initialTab) ? (initialTab as Tab) : "description",
  );
  const [status, setStatusState] = useState<ApplicationStatus | null>(null);
  const [prep, setPrep] = useState<PrepState>({ state: "idle" });
  const [kitError, setKitError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [check, setCheck] = useState<{ open: boolean | null; reason: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const loadDocs = useCallback(async () => {
    const r = await api<{ documents: StoredDocument[] }>(`/api/documents?jobId=${encodeURIComponent(jobId)}`);
    setDocs(r.documents);
  }, [jobId]);

  const loadJob = useCallback(
    () =>
      api<{ job: JobView; match: MatchResult | null }>(`/api/jobs/${encodeURIComponent(jobId)}`)
        .then((r) => {
          setJob(r.job);
          setMatch(r.match);
        })
        .catch((e) => setError(e.message)),
    [jobId],
  );
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    loadJob();
    api<{ documents: StoredDocument[] }>(`/api/documents?jobId=${encodeURIComponent(jobId)}`)
      .then((r) => setDocs(r.documents))
      .catch(() => {});
  }, [jobId, loadJob]);

  async function runCheck() {
    setChecking(true);
    try {
      const r = await api<{ open: boolean | null; reason: string }>(`/api/jobs/${encodeURIComponent(jobId)}/check`, {
        method: "POST",
      });
      setCheck(r);
      if (r.open === false) setJob((j) => j && { ...j, expired: true });
      return r;
    } finally {
      setChecking(false);
    }
  }

  // Load the application, and keep refreshing it (and the documents) while the kit builds.
  const preparing = prep.state === "preparing";
  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      Promise.all([
        api<{ application: { status: ApplicationStatus; prep: PrepState } | null }>(
          `/api/applications/${encodeURIComponent(jobId)}`,
        ),
        api<{ documents: StoredDocument[] }>(`/api/documents?jobId=${encodeURIComponent(jobId)}`),
      ])
        .then(([a, d]) => {
          if (cancelled) return;
          setStatusState(a.application?.status ?? null);
          setPrep(a.application?.prep ?? { state: "idle" });
          setDocs(d.documents);
        })
        .catch(() => {});
    refresh();
    const timer = preparing ? setInterval(refresh, 4000) : null;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [jobId, preparing]);

  async function buildKit() {
    setKitError(null);
    try {
      await startKit(jobId);
      setPrep({ state: "preparing" });
      setStatusState((s) => s ?? "interested");
    } catch (e) {
      setKitError((e as Error).message);
    }
  }

  async function setStatus(next: ApplicationStatus) {
    setStatusState(next);
    await api(`/api/applications/${encodeURIComponent(jobId)}`, { method: "PUT", json: { status: next } });
  }

  if (error && !job) {
    return (
      <Empty title="This job couldn't be loaded">
        <p>{error}</p>
        <Link href="/jobs" className="mt-2 inline-block font-semibold text-spruce underline">
          Back to search
        </Link>
      </Empty>
    );
  }
  if (!job)
    return (
      <p className="text-muted" role="status">
        Loading job… {jobId.startsWith("jobbank-") && "Getting the full description from Job Bank can take a few seconds."}
      </p>
    );

  const latest = (kind: StoredDocument["kind"]) => docs.find((d) => d.kind === kind) ?? null;

  return (
    <div>
      <Link href="/jobs" className="text-sm text-muted hover:text-ink">
        ← Back to results
      </Link>

      <header className="mt-3 flex flex-wrap items-start gap-4">
        <AgeStamp postedAt={job.postedAt} expired={job.expired} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl">{job.title}</h1>
          <p className="mt-1">
            {job.company} <span className="text-muted">— {job.location}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.government && <Tag tone="spruce">Government</Tag>}
            {job.detectedLevel && <Tag>{LEVEL_LABELS[job.detectedLevel]}</Tag>}
            {job.levelFit === "stretch" && <Tag tone="amber">Stretch for your level</Tag>}
            {job.levelFit === "match" && <Tag tone="spruce">Your level</Tag>}
            {job.salary && <Tag>{job.salary}</Tag>}
            {job.remote && <Tag>Remote</Tag>}
            {job.publisher && <Tag>via {job.publisher}</Tag>}
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          {job.applyUrl && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md bg-ink px-3.5 py-2 text-sm font-semibold text-paper hover:opacity-90"
            >
              Open posting
            </a>
          )}
          {status && status !== "skipped" ? (
            <label className="flex items-center">
              <span className="sr-only">Application status</span>
              <select
                className={cx(inputClass, "w-auto")}
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              >
                {PICKABLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <Button variant="secondary" onClick={() => setStatus("interested")}>
              I’m interested
            </Button>
          )}
          {job.applyUrl && (
            <Button variant="secondary" onClick={runCheck} busy={checking}>
              Check if still open
            </Button>
          )}
        </div>
      </header>

      <KitBanner
        prep={prep}
        hasDocs={docs.length > 0}
        error={kitError}
        onBuild={buildKit}
      />

      {check && (
        <p
          className={cx(
            "mt-3 text-sm",
            check.open === false ? "text-rust" : check.open ? "text-spruce" : "text-muted",
          )}
          role="status"
        >
          {check.open === false ? "Likely closed: " : check.open ? "Still open: " : ""}
          {check.reason}
        </p>
      )}

      {match && (
        <section className="mt-5 rounded-lg border border-line bg-surface p-4" aria-label="Resume match">
          <p className="text-sm">
            <span className="font-display text-2xl font-bold tabular-nums">{match.score}%</span>{" "}
            <span className="text-muted">of this posting’s keywords are already in your resume.</span>
          </p>
          {match.missing.length > 0 && (
            <p className="mt-2 text-sm">
              <span className="font-semibold">Missing: </span>
              <span className="text-muted">{match.missing.join(", ")}</span>
            </p>
          )}
        </section>
      )}

      <div role="tablist" aria-label="Job workspace" className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cx(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold",
              tab === t.id ? "border-spruce text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.id !== "description" && latest(t.id) && <span className="ml-1.5 text-spruce">●</span>}
          </button>
        ))}
      </div>

      <div className="pt-6" role="tabpanel">
        {tab === "description" &&
          (job.description ? (
            <div className="prose-measure whitespace-pre-line text-[15px] leading-relaxed">{job.description}</div>
          ) : job.descriptionError ? (
            <Notice>
              {job.descriptionError}{" "}
              <button
                type="button"
                className="font-semibold underline"
                disabled={reloading}
                onClick={async () => {
                  setReloading(true);
                  await loadJob();
                  setReloading(false);
                }}
              >
                {reloading ? "Trying again…" : "Try again"}
              </button>
            </Notice>
          ) : (
            <Notice>
              This listing didn’t include a description. Open the posting, copy the description, and add it on{" "}
              <Link className="font-semibold underline" href="/applications">
                Applications → Add a job
              </Link>
              .
            </Notice>
          ))}
        {tab === "resume" && (
          <ResumeTab key={latest("resume")?.id ?? "none"} job={job} doc={latest("resume")} onDone={loadDocs} runCheck={runCheck} />
        )}
        {tab === "cover" && <CoverTab key={latest("cover")?.id ?? "none"} job={job} doc={latest("cover")} onDone={loadDocs} />}
        {tab === "interview" && <InterviewTab job={job} doc={latest("interview")} onDone={loadDocs} />}
      </div>
    </div>
  );
}

// ---------- Tailored resume ----------

function ResumeTab({
  job,
  doc,
  onDone,
  runCheck,
}: {
  job: JobView;
  doc: StoredDocument | null;
  onDone: () => Promise<void>;
  runCheck: () => Promise<{ open: boolean | null }>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closedWarning, setClosedWarning] = useState(false);
  // Parent remounts this tab (key) when a new document arrives, so initial state is enough.
  const [draft, setDraft] = useState<TailoredResume | null>((doc?.data as TailoredResume | undefined) ?? null);
  const [savedMsg, setSavedMsg] = useState("");


  async function generate(skipCheck = false) {
    setError(null);
    setBusy(true);
    try {
      if (!skipCheck && job.applyUrl && !job.applyUrl.includes("example.com")) {
        const c = await runCheck().catch(() => ({ open: null }));
        if (c.open === false) {
          setClosedWarning(true);
          return;
        }
      }
      setClosedWarning(false);
      await api("/api/tailor", { method: "POST", json: { jobId: job.id } });
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!doc || !draft) return;
    await api(`/api/documents/${doc.id}`, { method: "PUT", json: { data: draft } });
    setSavedMsg("Changes saved");
    await onDone();
    setTimeout(() => setSavedMsg(""), 2500);
  }

  const after = draft && job.description ? matchResume(profileToText(draft.resume), job.description) : null;

  return (
    <div>
      <ErrorNote message={error} />
      {closedWarning && (
        <div className="mb-4">
          <Notice>
            This posting looks closed or expired.{" "}
            <button className="font-semibold underline" type="button" onClick={() => generate(true)}>
              Tailor anyway
            </button>
          </Notice>
        </div>
      )}
      {!draft && (
        <Empty title="No tailored resume yet">
          <p className="mb-4">
            Claude rewrites your summary, bullets and skills to use this posting’s keywords. It never invents
            experience.
          </p>
          <Button busy={busy} onClick={() => generate()}>
            {busy ? "Tailoring… (about 30–60 seconds)" : "Tailor my resume"}
          </Button>
        </Empty>
      )}
      {draft && doc && (
        <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <LinkButton variant="primary" href={`/api/documents/${doc.id}/export?format=docx`}>
                Download DOCX
              </LinkButton>
              <LinkButton href={`/api/documents/${doc.id}/export?format=pdf`}>Download PDF</LinkButton>
              <Button variant="secondary" onClick={save}>
                Save edits
              </Button>
              <Button variant="ghost" busy={busy} onClick={() => generate()}>
                Re-tailor
              </Button>
              {savedMsg && <span className="self-center text-sm text-spruce">{savedMsg}</span>}
            </div>

            <label className="block text-sm">
              <span className="font-semibold">Summary</span>
              <textarea
                className={cx(inputClass, "mt-1 min-h-28")}
                value={draft.resume.summary}
                onChange={(e) => setDraft({ ...draft, resume: { ...draft.resume, summary: e.target.value } })}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Skills</span> <span className="text-muted">(comma separated)</span>
              <textarea
                className={cx(inputClass, "mt-1 min-h-20")}
                value={draft.resume.skills.join(", ")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    resume: { ...draft.resume, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) },
                  })
                }
              />
            </label>
            {draft.resume.experience.map((x, i) => (
              <label key={i} className="block text-sm">
                <span className="font-semibold">
                  {x.title}, {x.company}
                </span>{" "}
                <span className="text-muted">(one bullet per line)</span>
                <textarea
                  className={cx(inputClass, "mt-1 min-h-32")}
                  value={x.bullets.join("\n")}
                  onChange={(e) => {
                    const experience = draft.resume.experience.map((ex, j) =>
                      j === i ? { ...ex, bullets: e.target.value.split("\n").filter((l) => l.trim()) } : ex,
                    );
                    setDraft({ ...draft, resume: { ...draft.resume, experience } });
                  }}
                />
              </label>
            ))}
            <p className="text-sm text-muted">
              Education, certifications and contact details come from your profile. The PDF preview shows the full
              document:{" "}
              <a className="font-semibold text-spruce underline" href={`/api/documents/${doc.id}/export?format=pdf&inline=1`} target="_blank" rel="noreferrer">
                open preview
              </a>
              .
            </p>
          </div>

          <aside className="space-y-5 text-sm">
            {after && (
              <div className="rounded-lg border border-line bg-surface p-4">
                <p className="font-semibold">Keyword coverage</p>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums text-spruce">{after.score}%</p>
                {after.missing.length > 0 && <p className="mt-1 text-muted">Still missing: {after.missing.join(", ")}</p>}
              </div>
            )}
            <div>
              <p className="font-semibold">Keywords Claude targeted</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {[...draft.keywords.hardSkills, ...draft.keywords.softSkills, ...draft.keywords.other].map((k) => (
                  <Tag key={k}>{k}</Tag>
                ))}
              </div>
            </div>
            {draft.keywordsNotAdded.length > 0 && (
              <div>
                <p className="font-semibold">Left out (not in your experience)</p>
                <p className="mt-1 text-muted">{draft.keywordsNotAdded.join(", ")}</p>
                <p className="mt-1 text-xs text-muted">If you do have these skills, add them to My resume and re-tailor.</p>
              </div>
            )}
            <div>
              <p className="font-semibold">What changed</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
                {draft.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// ---------- Cover letter ----------

function CoverTab({ job, doc, onDone }: { job: JobView; doc: StoredDocument | null; onDone: () => Promise<void> }) {
  const [tone, setTone] = useState("formal");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CoverLetter | null>((doc?.data as CoverLetter | undefined) ?? null);
  const [savedMsg, setSavedMsg] = useState("");

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/cover-letter", { method: "POST", json: { jobId: job.id, tone, notes } });
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!doc || !draft) return;
    await api(`/api/documents/${doc.id}`, { method: "PUT", json: { data: draft } });
    setSavedMsg("Changes saved");
    await onDone();
    setTimeout(() => setSavedMsg(""), 2500);
  }

  const options = (
    <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Tone</span>
        <select className={inputClass} value={tone} onChange={(e) => setTone(e.target.value)}>
          <option value="formal">Formal</option>
          <option value="warm">Warm</option>
          <option value="concise">Concise</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Anything to mention? (optional)</span>
        <input
          className={inputClass}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. I'm relocating to Ottawa in January; I use their product daily"
        />
      </label>
    </div>
  );

  return (
    <div className="space-y-5">
      <ErrorNote message={error} />
      {!draft ? (
        <Empty title="No cover letter yet">
          <div className="mx-auto max-w-xl space-y-4 text-left">
            {options}
            <div className="text-center">
              <Button busy={busy} onClick={generate}>
                {busy ? "Writing…" : "Write cover letter"}
              </Button>
            </div>
          </div>
        </Empty>
      ) : (
        doc && (
          <>
            <div className="flex flex-wrap gap-2">
              <LinkButton variant="primary" href={`/api/documents/${doc.id}/export?format=docx`}>
                Download DOCX
              </LinkButton>
              <LinkButton href={`/api/documents/${doc.id}/export?format=pdf`}>Download PDF</LinkButton>
              <Button variant="secondary" onClick={save}>
                Save edits
              </Button>
              {savedMsg && <span className="self-center text-sm text-spruce">{savedMsg}</span>}
            </div>
            <div className="prose-measure space-y-3">
              <input
                className={inputClass}
                aria-label="Greeting"
                value={draft.greeting}
                onChange={(e) => setDraft({ ...draft, greeting: e.target.value })}
              />
              <textarea
                aria-label="Letter body"
                className={cx(inputClass, "min-h-96 leading-relaxed")}
                value={draft.paragraphs.join("\n\n")}
                onChange={(e) =>
                  setDraft({ ...draft, paragraphs: e.target.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) })
                }
              />
              <input
                className={inputClass}
                aria-label="Closing"
                value={draft.closing}
                onChange={(e) => setDraft({ ...draft, closing: e.target.value })}
              />
              <p className="text-xs text-muted">
                {draft.paragraphs.join(" ").split(/\s+/).filter(Boolean).length} words. Your name, contact details and
                the date are added to the downloaded file.
              </p>
            </div>
            <details className="rounded-lg border border-line bg-surface p-4">
              <summary className="cursor-pointer text-sm font-semibold">Write a new version</summary>
              <div className="mt-4 space-y-4">
                {options}
                <Button busy={busy} onClick={generate}>
                  {busy ? "Writing…" : "Write new version"}
                </Button>
              </div>
            </details>
          </>
        )
      )}
    </div>
  );
}

// ---------- Interview prep ----------

function InterviewTab({ job, doc, onDone }: { job: JobView; doc: StoredDocument | null; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(40);

  async function generate(n: number, focus = "", appendTo?: number) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/interview", { method: "POST", json: { jobId: job.id, count: n, focus, appendTo } });
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ErrorNote message={error} />
      {!doc ? (
        <Empty title="No interview questions yet">
          <p className="mb-4">
            Behavioural, technical, situational and company questions for this role, each with a model answer based
            on your resume.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <select
              className={cx(inputClass, "w-auto")}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              aria-label="Number of questions"
            >
              {[20, 40, 60].map((n) => (
                <option key={n} value={n}>
                  {n} questions
                </option>
              ))}
            </select>
            <Button busy={busy} onClick={() => generate(count)}>
              {busy ? "Generating… (1–3 minutes)" : "Generate questions"}
            </Button>
          </div>
        </Empty>
      ) : (
        <InterviewViewer
          docId={doc.id}
          set={doc.data as InterviewSet}
          busy={busy}
          onMore={(n, focus) => generate(n, focus, doc.id)}
        />
      )}
    </div>
  );
}

// ---------- Application kit banner ----------

function KitBanner({
  prep,
  hasDocs,
  error,
  onBuild,
}: {
  prep: PrepState;
  hasDocs: boolean;
  error: string | null;
  onBuild: () => void;
}) {
  if (prep.state === "preparing") {
    return (
      <p className="mt-5 flex items-center gap-2 rounded-lg border border-line bg-sunken px-4 py-3 text-sm" role="status">
        <Spinner /> Building your application kit: tailored resume, cover letter and interview prep. The tabs below fill in
        when it’s done.
      </p>
    );
  }
  if (error || prep.state === "error") {
    return (
      <div className="mt-5 rounded-lg border border-rust/40 bg-rust-soft px-4 py-3 text-sm text-rust" role="alert">
        Couldn’t build the kit: {error ?? prep.error}{" "}
        {(error ?? prep.error ?? "").includes("My resume") ? (
          <Link href="/profile" className="font-semibold underline">
            Add my resume
          </Link>
        ) : (
          <button type="button" className="font-semibold underline" onClick={onBuild}>
            Try again
          </button>
        )}
      </div>
    );
  }
  if (!hasDocs) {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-spruce/40 bg-spruce-soft px-4 py-3">
        <p className="text-sm">
          <span className="font-semibold">One tap for everything:</span> a tailored ATS resume, a cover letter and
          interview questions with answers, all from this job description.
        </p>
        <Button onClick={onBuild}>Build application kit</Button>
      </div>
    );
  }
  if (prep.state === "done" && prep.failed?.length) {
    return (
      <p className="mt-5 text-sm text-amber">
        Some parts didn’t finish ({prep.failed.join(", ")}).{" "}
        <button type="button" className="font-semibold underline" onClick={onBuild}>
          Rebuild kit
        </button>
      </p>
    );
  }
  return null;
}
