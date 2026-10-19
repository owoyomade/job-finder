import { after, connection } from "next/server";
import { handle } from "@/lib/api";
import { getAlertState, runDailyAlert, seedSeenJobs } from "@/lib/alerts";

export async function GET() {
  await connection();
  return Response.json({ state: getAlertState() });
}

/** Body: { action: "run" } to check for new jobs now, or { action: "seed" } when alerts are switched on. */
export const POST = handle(async (req: Request) => {
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  if (action === "seed") {
    after(() => seedSeenJobs().catch((err) => console.error("seed failed", err)));
    return Response.json({ ok: true });
  }
  return Response.json({ state: await runDailyAlert() });
});
