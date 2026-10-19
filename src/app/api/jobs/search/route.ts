import { handle, HttpError } from "@/lib/api";
import { getProfile, getSavedJobIds, upsertJobs } from "@/lib/db";
import { searchJobs } from "@/lib/jobs";
import { profileToText } from "@/lib/match";
import { LEVELS, type SearchParams } from "@/lib/types";

const POSTED = ["1", "3", "7", "14", "30"];

export const POST = handle(async (req: Request) => {
  const b = await req.json();
  const params: SearchParams = {
    query: String(b.query ?? "").trim(),
    location: String(b.location ?? "").trim(),
    level: LEVELS.includes(b.level) ? b.level : "",
    remoteOnly: Boolean(b.remoteOnly),
    postedWithin: POSTED.includes(b.postedWithin) ? b.postedWithin : "14",
    employmentType: ["FULLTIME", "PARTTIME", "CONTRACTOR", "INTERN"].includes(b.employmentType) ? b.employmentType : "",
    governmentOnly: Boolean(b.governmentOnly),
    includeUnknownDate: Boolean(b.includeUnknownDate),
    sources: Array.isArray(b.sources) ? b.sources : [],
  };
  if (!params.query) throw new HttpError(400, "Enter a job title or keywords.");
  const profile = getProfile();
  const result = await searchJobs(params, profile ? profileToText(profile.profile) : null);
  upsertJobs(result.jobs);
  const saved = getSavedJobIds();
  return Response.json({ ...result, jobs: result.jobs.map((j) => ({ ...j, saved: saved.has(j.id) })) });
});
