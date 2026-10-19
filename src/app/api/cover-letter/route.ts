import { handle } from "@/lib/api";
import { saveDocument } from "@/lib/db";
import { writeCoverLetter, type CoverTone } from "@/lib/ai/tasks";
import { aiMockEnabled } from "@/lib/ai/client";
import { ensureDescription, jobContext, requireJob, requireProfile } from "@/lib/service";

export const POST = handle(async (req: Request) => {
  const b = await req.json();
  const stored = requireProfile();
  const job = await ensureDescription(requireJob(String(b.jobId)));
  const tone: CoverTone = ["formal", "warm", "concise"].includes(b.tone) ? b.tone : "formal";
  const letter = await writeCoverLetter({
    profile: stored.profile,
    job: jobContext(job),
    level: stored.targetLevel,
    tone,
    canadianSpelling: stored.canadianSpelling,
    extraNotes: typeof b.notes === "string" ? b.notes.slice(0, 2000) : undefined,
  });
  const doc = saveDocument(job.id, "cover", `Cover letter – ${job.title} at ${job.company}`, letter);
  return Response.json({ document: doc, mock: aiMockEnabled() });
});
