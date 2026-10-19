import { handle } from "@/lib/api";
import { saveDocument } from "@/lib/db";
import { tailorResume } from "@/lib/ai/tasks";
import { aiMockEnabled } from "@/lib/ai/client";
import { ensureDescription, jobContext, requireJob, requireProfile } from "@/lib/service";
import { matchResume, profileToText } from "@/lib/match";

export const POST = handle(async (req: Request) => {
  const { jobId } = await req.json();
  const stored = requireProfile();
  const job = await ensureDescription(requireJob(String(jobId)));
  const ctx = jobContext(job);
  const result = await tailorResume({
    profile: stored.profile,
    job: ctx,
    level: stored.targetLevel,
    canadianSpelling: stored.canadianSpelling,
  });
  const doc = saveDocument(job.id, "resume", `Resume – ${job.title} at ${job.company}`, result);
  return Response.json({
    document: doc,
    before: matchResume(profileToText(stored.profile), ctx.description),
    after: matchResume(profileToText(result.resume), ctx.description),
    mock: aiMockEnabled(),
  });
});
