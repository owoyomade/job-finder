import { connection } from "next/server";
import { aiMockEnabled } from "@/lib/ai/client";
import { jobsMockEnabled, sourceAvailability } from "@/lib/jobs";

export async function GET() {
  await connection();
  return Response.json({
    aiMock: aiMockEnabled(),
    jobsMock: jobsMockEnabled(),
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    sources: sourceAvailability(),
  });
}
