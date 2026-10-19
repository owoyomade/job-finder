/** Server-side operations shared by the API routes. */
import * as db from "./db";
import { HttpError } from "./api";
import { fetchJobBankDescription } from "./jobs/jobbank";
import {
  DEFAULT_PREFS,
  LEVELS,
  type Job,
  type JobSource,
  type Level,
  type Prefs,
  type SearchParams,
  type StoredProfile,
} from "./types";
import { searchJobs } from "./jobs";
import {
  generateInterviewQuestions,
  tailorResume,
  writeCoverLetter,
  type CoverTone,
  type JobContext,
} from "./ai/tasks";
import { answersBlock } from "./questions";
import { matchResume, profileToText } from "./match";

export function requireProfile(): StoredProfile {
  const p = db.getProfile();
  if (!p) throw new HttpError(400, "Add your resume on the My resume tab first.");
  return p;
}

export function requireJob(id: string): Job & { saved: boolean } {
  const job = db.getJob(id);
  if (!job) throw new HttpError(404, "Job not found. Run the search again.");
  return job;
}

/** Job Bank results don't include descriptions; fetch it the first time the job is opened. */
export async function ensureDescription(
  job: Job & { saved: boolean },
): Promise<Job & { saved: boolean; descriptionError?: string }> {
  if (job.description || job.source !== "jobbank") return job;
  try {
    const description = await fetchJobBankDescription(job.applyUrl);
    const updated = { ...job, description };
    db.updateJob(updated);
    return updated;
  } catch {
    return { ...job, descriptionError: "Job Bank didn’t respond in time." };
  }
}

export function jobContext(job: Job): JobContext {
  if (!job.description.trim()) {
    throw new HttpError(
      400,
      "This job has no description yet. Open the posting, copy the description, and use 'Paste a job' instead.",
    );
  }
  return { title: job.title, company: job.company, location: job.location, description: job.description };
}

// ---------- Generating application documents ----------

export async function tailorForJob(jobId: string) {
  const stored = requireProfile();
  const job = await ensureDescription(requireJob(jobId));
  const ctx = jobContext(job);
  const result = await tailorResume({
    profile: stored.profile,
    job: ctx,
    level: stored.targetLevel,
    canadianSpelling: stored.canadianSpelling,
    answers: answersBlock(db.getApplication(job.id)?.answers),
  });
  const document = db.saveDocument(job.id, "resume", `Resume – ${job.title} at ${job.company}`, result);
  return {
    document,
    before: matchResume(profileToText(stored.profile), ctx.description),
    after: matchResume(profileToText(result.resume), ctx.description),
  };
}

export async function coverLetterForJob(jobId: string, tone: CoverTone = "formal", notes?: string) {
  const stored = requireProfile();
  const job = await ensureDescription(requireJob(jobId));
  const letter = await writeCoverLetter({
    profile: stored.profile,
    job: jobContext(job),
    level: stored.targetLevel,
    tone,
    canadianSpelling: stored.canadianSpelling,
    extraNotes: notes,
    answers: answersBlock(db.getApplication(job.id)?.answers),
  });
  return db.saveDocument(job.id, "cover", `Cover letter – ${job.title} at ${job.company}`, letter);
}

export async function interviewForJob(jobId: string, count = 30) {
  const stored = db.getProfile();
  const job = await ensureDescription(requireJob(jobId));
  const set = await generateInterviewQuestions({
    profile: stored?.profile ?? null,
    job: jobContext(job),
    level: stored?.targetLevel ?? "",
    count,
  });
  return db.saveDocument(job.id, "interview", `Interview prep – ${job.title} at ${job.company}`, set);
}

// ---------- Automatic application kit ----------

const STALE_MS = 15 * 60 * 1000;

export function getPrefs(): Prefs {
  return { ...DEFAULT_PREFS, ...(db.getSetting<Partial<Prefs>>("prefs") ?? {}) };
}

/**
 * Check the kit can be built (resume on file, job has a description), then mark
 * it as preparing. Returns false if a build is already running for this job.
 */
export async function startPrepare(jobId: string): Promise<boolean> {
  requireProfile();
  const job = await ensureDescription(requireJob(jobId));
  jobContext(job); // throws a clear message if there's no description
  const current = db.getApplication(job.id)?.prep;
  if (current?.state === "preparing" && current.startedAt && Date.now() - Date.parse(current.startedAt) < STALE_MS) {
    return false;
  }
  db.setApplicationPrep(job.id, { state: "preparing", startedAt: new Date().toISOString() });
  return true;
}

/** Build the tailored resume, cover letter and (optionally) interview prep in parallel. */
export async function runPrepare(jobId: string) {
  const prefs = getPrefs();
  const startedAt = db.getApplication(jobId)?.prep.startedAt;
  const parts: ["resume" | "cover" | "interview", () => Promise<unknown>][] = [
    ["resume", () => tailorForJob(jobId)],
    ["cover", () => coverLetterForJob(jobId)],
  ];
  if (prefs.kitInterview) parts.push(["interview", () => interviewForJob(jobId)]);

  const results = await Promise.allSettled(parts.map(([, run]) => run()));
  const failed = parts.filter((_, i) => results[i].status === "rejected").map(([name]) => name);
  const firstError = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
  const finishedAt = new Date().toISOString();

  if (failed.length === parts.length) {
    db.setApplicationPrep(jobId, {
      state: "error",
      startedAt,
      finishedAt,
      error: firstError?.reason instanceof Error ? firstError.reason.message : "Something went wrong.",
    });
    return;
  }
  db.setApplicationPrep(jobId, { state: "done", startedAt, finishedAt, failed: failed.length ? failed : undefined });
  const status = db.getApplication(jobId)?.status;
  if (!status || status === "interested" || status === "skipped") db.setApplicationStatus(jobId, "ready");
}

// ---------- Search ----------

const POSTED = ["1", "3", "7", "14", "30"];

export function normalizeSearchParams(b: Record<string, unknown>): SearchParams {
  const params: SearchParams = {
    query: String(b.query ?? "").trim(),
    location: String(b.location ?? "").trim(),
    level: LEVELS.includes(b.level as Level) ? (b.level as Level) : "",
    remoteOnly: Boolean(b.remoteOnly),
    postedWithin: POSTED.includes(String(b.postedWithin)) ? (b.postedWithin as SearchParams["postedWithin"]) : "14",
    employmentType: ["FULLTIME", "PARTTIME", "CONTRACTOR", "INTERN"].includes(String(b.employmentType))
      ? (b.employmentType as SearchParams["employmentType"])
      : "",
    governmentOnly: Boolean(b.governmentOnly),
    includeUnknownDate: Boolean(b.includeUnknownDate),
    sources: Array.isArray(b.sources) ? (b.sources as JobSource[]) : [],
  };
  if (!params.query) throw new HttpError(400, "Enter a job title or keywords.");
  return params;
}

/** Run a search, remember it for the swipe deck, and attach each job's application status. */
export async function runSearch(params: SearchParams) {
  const profile = db.getProfile();
  const result = await searchJobs(params, profile ? profileToText(profile.profile) : null);
  db.upsertJobs(result.jobs);
  db.setSetting("lastSearch", params);
  const statuses = db.applicationStatuses(result.jobs.map((j) => j.id));
  return {
    ...result,
    jobs: result.jobs.map((j) => ({
      ...j,
      saved: Boolean(statuses.get(j.id) && statuses.get(j.id) !== "skipped"),
      applicationStatus: statuses.get(j.id) ?? null,
    })),
  };
}
