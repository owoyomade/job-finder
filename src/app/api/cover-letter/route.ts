import { handle } from "@/lib/api";
import { aiMockEnabled } from "@/lib/ai/client";
import type { CoverTone } from "@/lib/ai/tasks";
import { coverLetterForJob } from "@/lib/service";

export const POST = handle(async (req: Request) => {
  const b = await req.json();
  const tone: CoverTone = ["formal", "warm", "concise"].includes(b.tone) ? b.tone : "formal";
  const notes = typeof b.notes === "string" ? b.notes.slice(0, 2000) : undefined;
  const document = await coverLetterForJob(String(b.jobId), tone, notes);
  return Response.json({ document, mock: aiMockEnabled() });
});
