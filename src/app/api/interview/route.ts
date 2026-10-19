import { handle, HttpError } from "@/lib/api";
import { createManualJob, getDocument, getProfile, saveDocument, updateDocument } from "@/lib/db";
import { generateInterviewQuestions } from "@/lib/ai/tasks";
import { aiMockEnabled } from "@/lib/ai/client";
import { ensureDescription, jobContext, requireJob } from "@/lib/service";
import { LEVELS, type InterviewSet } from "@/lib/types";

/**
 * Generate interview questions for a saved job (`jobId`) or a pasted posting
 * (`title` + `description`). Pass `appendTo` (document id) to add more questions
 * to an existing set without repeats.
 */
export const POST = handle(async (req: Request) => {
  const b = await req.json();
  const stored = getProfile();
  let job;
  if (b.jobId) {
    job = await ensureDescription(requireJob(String(b.jobId)));
  } else {
    const title = String(b.title ?? "").trim();
    const description = String(b.description ?? "").trim();
    if (!title || description.length < 50) throw new HttpError(400, "Add a job title and paste the job description.");
    job = { ...createManualJob({ title, company: String(b.company ?? ""), location: String(b.location ?? ""), description, applyUrl: "" }), saved: true };
  }
  const level = LEVELS.includes(b.level) ? b.level : (stored?.targetLevel ?? "");
  const count = Math.min(Math.max(Number(b.count) || 40, 5), 80);

  const existing = b.appendTo ? getDocument(Number(b.appendTo)) : null;
  const prior = existing?.kind === "interview" ? (existing.data as InterviewSet) : null;

  const set = await generateInterviewQuestions({
    profile: b.useProfile === false ? null : (stored?.profile ?? null),
    job: jobContext(job),
    level,
    count,
    focus: typeof b.focus === "string" ? b.focus.slice(0, 500) : undefined,
    avoid: prior?.questions.map((q) => q.question),
  });

  if (existing && prior) {
    const merged: InterviewSet = { questions: [...prior.questions, ...set.questions] };
    updateDocument(existing.id, merged);
    return Response.json({ document: { ...existing, data: merged }, jobId: job.id, mock: aiMockEnabled() });
  }
  const doc = saveDocument(job.id, "interview", `Interview prep – ${job.title} at ${job.company}`, set);
  return Response.json({ document: doc, jobId: job.id, mock: aiMockEnabled() });
});
