import { handle } from "@/lib/api";
import { aiMockEnabled } from "@/lib/ai/client";
import { tailorForJob } from "@/lib/service";

export const POST = handle(async (req: Request) => {
  const { jobId } = await req.json();
  return Response.json({ ...(await tailorForJob(String(jobId))), mock: aiMockEnabled() });
});
