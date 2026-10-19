import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { getApplication, getProfile } from "@/lib/db";
import { ensureDescription, requireJob } from "@/lib/service";
import { buildJobQuestions } from "@/lib/questions";
import { profileToText } from "@/lib/match";
import { detectLevel, levelFit } from "@/lib/jobs/level";

export const GET = handle(async (_req: NextRequest, ctx: RouteContext<"/api/jobs/[id]/questions">) => {
  const job = await ensureDescription(requireJob(decodeURIComponent((await ctx.params).id)));
  const profile = getProfile();
  const fit = levelFit(profile?.targetLevel ?? "", detectLevel(job.title, job.description));
  const questions = buildJobQuestions({ ...job, levelFit: fit === "out" ? "stretch" : fit }, profile ? profileToText(profile.profile) : null);
  return Response.json({ questions, answers: getApplication(job.id)?.answers ?? [] });
});
