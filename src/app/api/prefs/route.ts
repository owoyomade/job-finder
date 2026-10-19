import { connection } from "next/server";
import { handle } from "@/lib/api";
import { setSetting } from "@/lib/db";
import { getPrefs } from "@/lib/service";
import { CANADIAN_TIMEZONES, type Prefs } from "@/lib/types";

export async function GET() {
  await connection();
  return Response.json({ prefs: getPrefs() });
}

export const PUT = handle(async (req: Request) => {
  const b = await req.json();
  const next: Partial<Prefs> = {};
  if (b.swipeAction === "ask" || b.swipeAction === "auto") next.swipeAction = b.swipeAction;
  if (typeof b.kitInterview === "boolean") next.kitInterview = b.kitInterview;
  if (typeof b.alertsEnabled === "boolean") next.alertsEnabled = b.alertsEnabled;
  if (Number.isInteger(b.alertHour) && b.alertHour >= 0 && b.alertHour <= 23) next.alertHour = b.alertHour;
  if (CANADIAN_TIMEZONES.some((t) => t.id === b.alertTimezone)) next.alertTimezone = b.alertTimezone;
  if (typeof b.onboarded === "boolean") next.onboarded = b.onboarded;
  const prefs = { ...getPrefs(), ...next };
  setSetting("prefs", prefs);
  return Response.json({ prefs });
});
