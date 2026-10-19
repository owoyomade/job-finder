import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { aiMockEnabled } from "@/lib/ai/client";
import { prepareApplication } from "@/lib/service";

export const POST = handle(async (_req: NextRequest, ctx: RouteContext<"/api/applications/[jobId]/prepare">) => {
  const jobId = decodeURIComponent((await ctx.params).jobId);
  return Response.json({ ...(await prepareApplication(jobId)), mock: aiMockEnabled() });
});
