import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { getProfile, setJobSaved } from "@/lib/db";
import { ensureDescription, requireJob } from "@/lib/service";
import { matchResume, profileToText } from "@/lib/match";
import { detectLevel, levelFit } from "@/lib/jobs/level";

export const GET = handle(async (_req: NextRequest, ctx: RouteContext<"/api/jobs/[id]">) => {
  const { id } = await ctx.params;
  const job = await ensureDescription(requireJob(decodeURIComponent(id)));
  const profile = getProfile();
  const match = profile && job.description ? matchResume(profileToText(profile.profile), job.description) : null;
  const detectedLevel = detectLevel(job.title, job.description);
  return Response.json({
    job: { ...job, detectedLevel, levelFit: levelFit(profile?.targetLevel ?? "", detectedLevel) },
    match,
  });
});

export const PATCH = handle(async (req: NextRequest, ctx: RouteContext<"/api/jobs/[id]">) => {
  const { id } = await ctx.params;
  const job = requireJob(decodeURIComponent(id));
  const b = await req.json();
  if (typeof b.saved === "boolean") setJobSaved(job.id, b.saved);
  return Response.json({ ok: true });
});
