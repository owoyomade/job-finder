import type { Job, SearchParams } from "../types";
import { fetchWithTimeout, htmlToText } from "./http";
import { isGovernmentJob } from "./government";

export interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  created: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
}

export function mapAdzunaJob(j: AdzunaJob): Job {
  const company = j.company?.display_name ?? "Unknown company";
  const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-CA")}`;
  const salary =
    j.salary_min && j.salary_max
      ? j.salary_min === j.salary_max
        ? `${fmt(j.salary_min)} / year`
        : `${fmt(j.salary_min)}–${fmt(j.salary_max)} / year`
      : undefined;
  const title = htmlToText(j.title);
  return {
    id: `adzuna-${j.id}`,
    source: "adzuna",
    publisher: "Adzuna",
    title,
    company,
    location: j.location?.display_name ?? "Canada",
    remote: /remote|work from home/i.test(`${title} ${j.description}`),
    salary,
    employmentType: j.contract_time === "part_time" ? "PARTTIME" : j.contract_time === "full_time" ? "FULLTIME" : undefined,
    postedAt: j.created ?? null,
    // Adzuna only returns a snippet; the full posting is on the apply page.
    description: htmlToText(j.description),
    applyUrl: j.redirect_url,
    government: isGovernmentJob(j.redirect_url, company),
  };
}

export async function searchAdzuna(p: SearchParams): Promise<Job[]> {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) throw new Error("Adzuna keys not set (optional)");
  const url = new URL("https://api.adzuna.com/v1/api/jobs/ca/search/1");
  url.searchParams.set("app_id", id);
  url.searchParams.set("app_key", key);
  url.searchParams.set("results_per_page", "50");
  url.searchParams.set("what", p.remoteOnly ? `${p.query} remote` : p.query);
  if (p.location) url.searchParams.set("where", p.location);
  url.searchParams.set("max_days_old", p.postedWithin);
  url.searchParams.set("sort_by", "date");
  if (p.employmentType === "FULLTIME") url.searchParams.set("full_time", "1");
  if (p.employmentType === "PARTTIME") url.searchParams.set("part_time", "1");
  if (p.employmentType === "CONTRACTOR") url.searchParams.set("contract", "1");

  const res = await fetchWithTimeout(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Adzuna HTTP ${res.status}`);
  const body = (await res.json()) as { results?: AdzunaJob[] };
  return (body.results ?? []).map(mapAdzunaJob);
}
