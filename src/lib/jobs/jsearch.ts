import type { Job, SearchParams } from "../types";
import { fetchWithTimeout } from "./http";
import { jsearchRequirements } from "./level";
import { isGovernmentJob } from "./government";

const DATE_POSTED: Record<SearchParams["postedWithin"], string> = {
  "1": "today",
  "3": "3days",
  "7": "week",
  "14": "month", // JSearch has no 2-week option; we trim locally afterwards
  "30": "month",
};

export interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_publisher?: string;
  job_employment_type?: string;
  job_apply_link: string;
  job_description?: string;
  job_is_remote?: boolean;
  job_posted_at_datetime_utc?: string | null;
  job_posted_at_timestamp?: number | null;
  job_offer_expiration_datetime_utc?: string | null;
  job_city?: string | null;
  job_state?: string | null;
  job_country?: string | null;
  job_location?: string | null;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_currency?: string | null;
  job_salary_period?: string | null;
}

function salary(j: JSearchJob): string | undefined {
  if (!j.job_min_salary && !j.job_max_salary) return undefined;
  const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-CA")}`;
  const range =
    j.job_min_salary && j.job_max_salary && j.job_min_salary !== j.job_max_salary
      ? `${fmt(j.job_min_salary)}–${fmt(j.job_max_salary)}`
      : fmt((j.job_min_salary ?? j.job_max_salary)!);
  const period = j.job_salary_period ? ` / ${j.job_salary_period.toLowerCase()}` : "";
  return `${range}${period}`;
}

export function mapJSearchJob(j: JSearchJob, now = Date.now()): Job {
  const postedAt =
    j.job_posted_at_datetime_utc ??
    (j.job_posted_at_timestamp ? new Date(j.job_posted_at_timestamp * 1000).toISOString() : null);
  const expired = j.job_offer_expiration_datetime_utc
    ? Date.parse(j.job_offer_expiration_datetime_utc) < now
    : false;
  const location =
    j.job_location || [j.job_city, j.job_state].filter(Boolean).join(", ") || j.job_country || "Canada";
  return {
    id: `jsearch-${j.job_id}`,
    source: "jsearch",
    publisher: j.job_publisher,
    title: j.job_title,
    company: j.employer_name,
    location,
    remote: Boolean(j.job_is_remote),
    salary: salary(j),
    employmentType: j.job_employment_type,
    postedAt,
    description: j.job_description ?? "",
    applyUrl: j.job_apply_link,
    government: isGovernmentJob(j.job_apply_link, j.employer_name, j.job_publisher),
    expired,
  };
}

export async function searchJSearch(p: SearchParams): Promise<Job[]> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY is not set");
  const query = [p.query, p.location ? `in ${p.location}` : "in Canada"].join(" ");
  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query", query);
  url.searchParams.set("page", "1");
  url.searchParams.set("num_pages", "3");
  url.searchParams.set("country", "ca");
  url.searchParams.set("date_posted", DATE_POSTED[p.postedWithin]);
  if (p.remoteOnly) url.searchParams.set("work_from_home", "true");
  if (p.employmentType) url.searchParams.set("employment_types", p.employmentType);
  const req = jsearchRequirements(p.level);
  if (req) url.searchParams.set("job_requirements", req);

  const res = await fetchWithTimeout(
    url.toString(),
    { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "jsearch.p.rapidapi.com" } },
    30000,
  );
  if (res.status === 429) throw new Error("JSearch monthly/rate limit reached");
  if (res.status === 401 || res.status === 403) throw new Error("JSearch rejected the RAPIDAPI_KEY (check your subscription)");
  if (!res.ok) throw new Error(`JSearch HTTP ${res.status}`);
  const body = (await res.json()) as { data?: JSearchJob[] };
  return (body.data ?? []).map((j) => mapJSearchJob(j));
}
