import { connection } from "next/server";
import { handle } from "@/lib/api";
import { setSetting } from "@/lib/db";
import { getPrefs } from "@/lib/service";

export async function GET() {
  await connection();
  return Response.json({ prefs: getPrefs() });
}

export const PUT = handle(async (req: Request) => {
  const b = await req.json();
  const prefs = {
    ...getPrefs(),
    ...(b.swipeAction === "ask" || b.swipeAction === "auto" ? { swipeAction: b.swipeAction } : {}),
    ...(typeof b.kitInterview === "boolean" ? { kitInterview: b.kitInterview } : {}),
  };
  setSetting("prefs", prefs);
  return Response.json({ prefs });
});
