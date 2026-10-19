import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { updateJob } from "@/lib/db";
import { requireJob } from "@/lib/service";
import { checkStillOpen } from "@/lib/jobs/freshness";

export const POST = handle(async (_req: NextRequest, ctx: RouteContext<"/api/jobs/[id]/check">) => {
  const { id } = await ctx.params;
  const job = requireJob(decodeURIComponent(id));
  const result = await checkStillOpen(job.applyUrl);
  if (result.open === false) updateJob({ ...job, expired: true });
  if (result.open === true && job.expired) updateJob({ ...job, expired: false });
  return Response.json(result);
});
