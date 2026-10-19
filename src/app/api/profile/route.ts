import { connection } from "next/server";
import { getProfile, saveProfile } from "@/lib/db";
import { handle, HttpError } from "@/lib/api";
import { LEVELS, ProfileSchema } from "@/lib/types";

export async function GET() {
  await connection();
  return Response.json({ profile: getProfile() });
}

export const PUT = handle(async (req: Request) => {
  const body = await req.json();
  const parsed = ProfileSchema.safeParse(body.profile);
  if (!parsed.success) throw new HttpError(400, "Profile is missing required fields.");
  const level = LEVELS.includes(body.targetLevel) ? body.targetLevel : "";
  const existing = getProfile();
  const stored = saveProfile({
    profile: parsed.data,
    rawText: existing?.rawText ?? "",
    targetLevel: level,
    canadianSpelling: Boolean(body.canadianSpelling),
  });
  return Response.json({ profile: stored });
});
