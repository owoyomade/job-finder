import { after, type NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { aiMockEnabled } from "@/lib/ai/client";
import { getApplication } from "@/lib/db";
import { runPrepare, startPrepare } from "@/lib/service";

/**
 * Start building the application kit. Replies straight away; the resume,
 * cover letter and interview prep are generated in the background and the
 * application's `prep.state` moves from "preparing" to "done" (or "error").
 */
export const POST = handle(async (_req: NextRequest, ctx: RouteContext<"/api/applications/[jobId]/prepare">) => {
  const jobId = decodeURIComponent((await ctx.params).jobId);
  if (await startPrepare(jobId)) {
    after(() => runPrepare(jobId).catch((err) => console.error("prepare failed", jobId, err)));
  }
  return Response.json({ application: getApplication(jobId), mock: aiMockEnabled() }, { status: 202 });
});
