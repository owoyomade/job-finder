import { getProfile, saveProfile } from "@/lib/db";
import { handle, HttpError } from "@/lib/api";
import { parseResume } from "@/lib/ai/tasks";
import { aiMockEnabled } from "@/lib/ai/client";
import { fileToText } from "@/lib/resumeText";

/** Accepts a resume file (multipart "file") or pasted text (multipart "text"), parses and saves it. */
export const POST = handle(async (req: Request) => {
  const form = await req.formData();
  const file = form.get("file");
  let text = String(form.get("text") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) throw new HttpError(400, "File is too large (max 5 MB).");
    text = await fileToText(file);
  }
  text = text.trim();
  if (text.length < 100) {
    throw new HttpError(400, "Couldn't read enough text from that resume. If it's a scanned PDF, paste the text instead.");
  }
  const profile = await parseResume(text);
  const existing = getProfile();
  const stored = saveProfile({
    profile,
    rawText: text,
    targetLevel: existing?.targetLevel ?? "",
    canadianSpelling: existing?.canadianSpelling ?? true,
  });
  return Response.json({ profile: stored, mock: aiMockEnabled() });
});
