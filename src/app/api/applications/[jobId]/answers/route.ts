import type { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { saveApplicationAnswers } from "@/lib/db";
import { requireJob } from "@/lib/service";

export const PUT = handle(async (req: NextRequest, ctx: RouteContext<"/api/applications/[jobId]/answers">) => {
  const jobId = decodeURIComponent((await ctx.params).jobId);
  requireJob(jobId);
  const { answers } = (await req.json()) as { answers?: { question: string; answer: string }[] };
  if (!Array.isArray(answers)) throw new HttpError(400, "Answers missing.");
  const clean = answers
    .filter((a) => typeof a?.question === "string" && typeof a?.answer === "string")
    .map((a) => ({ question: a.question.slice(0, 300), answer: a.answer.slice(0, 1500) }));
  return Response.json({ application: saveApplicationAnswers(jobId, clean) });
});
