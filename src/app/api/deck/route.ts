import { connection } from "next/server";
import { handle } from "@/lib/api";
import { getSetting } from "@/lib/db";
import { runSearch } from "@/lib/service";
import type { SearchParams } from "@/lib/types";

/** Jobs to swipe through: the last search, minus anything already swiped. */
export const GET = handle(async () => {
  await connection();
  const params = getSetting<SearchParams>("lastSearch");
  if (!params) return Response.json({ params: null, jobs: [] });
  const result = await runSearch(params);
  return Response.json({
    params,
    jobs: result.jobs.filter((j) => !j.applicationStatus),
    seen: result.jobs.filter((j) => j.applicationStatus).length,
  });
});
