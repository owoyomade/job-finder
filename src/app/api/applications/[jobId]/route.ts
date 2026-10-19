import type { NextRequest } from "next/server";
import { handle, HttpError } from "@/lib/api";
import { deleteApplication, getApplication, setApplicationStatus } from "@/lib/db";
import { requireJob } from "@/lib/service";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

type Ctx = RouteContext<"/api/applications/[jobId]">;
const idOf = async (ctx: Ctx) => decodeURIComponent((await ctx.params).jobId);

export const GET = handle(async (_req: NextRequest, ctx: Ctx) => {
  return Response.json({ application: getApplication(await idOf(ctx)) });
});

/** Body: { status } — creates the application if needed. */
export const PUT = handle(async (req: NextRequest, ctx: Ctx) => {
  const jobId = await idOf(ctx);
  requireJob(jobId);
  const { status } = (await req.json()) as { status?: ApplicationStatus };
  if (!status || !APPLICATION_STATUSES.includes(status)) throw new HttpError(400, "Unknown status.");
  return Response.json({ application: setApplicationStatus(jobId, status) });
});

export const DELETE = handle(async (_req: NextRequest, ctx: Ctx) => {
  deleteApplication(await idOf(ctx));
  return Response.json({ ok: true });
});
