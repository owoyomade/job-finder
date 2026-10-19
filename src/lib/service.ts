/** Server-side operations shared by the API routes. */
import * as db from "./db";
import { HttpError } from "./api";
import { fetchJobBankDescription } from "./jobs/jobbank";
import type { Job, StoredProfile } from "./types";
import type { JobContext } from "./ai/tasks";

export function requireProfile(): StoredProfile {
  const p = db.getProfile();
  if (!p) throw new HttpError(400, "Add your resume on the Profile page first.");
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
