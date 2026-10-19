/** Free, keyless remote-job boards: Remotive and Arbeitnow. */
import type { Job, SearchParams } from "../types";
import { fetchWithTimeout, htmlToText } from "./http";

const CANADA_OK = /(canada|worldwide|anywhere|global|north america|americas|usa?\s*\/\s*canada|remote)/i;

const queryTerms = (q: string) =>
  q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);

export function titleMatches(title: string, query: string): boolean {
  const t = title.toLowerCase();
  const terms = queryTerms(query);
  return terms.length === 0 || terms.every((term) => t.includes(term));
}

// ---------- Remotive ----------

export interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  job_type?: string;
  publication_date: string;
  candidate_required_location?: string;
  salary?: string;
  description: string;
}

export function mapRemotiveJob(j: RemotiveJob): Job {
  return {
    id: `remotive-${j.id}`,
    source: "remotive",
    publisher: "Remotive",
    title: j.title,
    company: j.company_name,
    location: `Remote (${j.candidate_required_location || "Worldwide"})`,
    remote: true,
    salary: j.salary || undefined,
    employmentType: j.job_type?.toUpperCase().replace("_", ""),
    postedAt: j.publication_date ? new Date(j.publication_date + (j.publication_date.endsWith("Z") ? "" : "Z")).toISOString() : null,
    description: htmlToText(j.description),
    applyUrl: j.url,
  };
}

export async function searchRemotive(p: SearchParams): Promise<Job[]> {
  const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(p.query)}&limit=100`;
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Remotive HTTP ${res.status}`);
  const body = (await res.json()) as { jobs?: RemotiveJob[] };
  // Remotive's search is fuzzy (matches descriptions), so require the query in the title.
  return (body.jobs ?? [])
    .filter((j) => CANADA_OK.test(j.candidate_required_location || "Worldwide"))
    .filter((j) => titleMatches(j.title, p.query))
    .map(mapRemotiveJob);
}

// ---------- Arbeitnow ----------

export interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  job_types?: string[];
  location: string;
  created_at: number;
}

export function mapArbeitnowJob(j: ArbeitnowJob): Job {
  return {
    id: `arbeitnow-${j.slug}`,
    source: "arbeitnow",
    publisher: "Arbeitnow",
    title: j.title,
    company: j.company_name,
    location: j.remote ? "Remote" : j.location,
    remote: j.remote,
    employmentType: j.job_types?.[0],
    postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
    description: htmlToText(j.description),
    applyUrl: j.url,
  };
}

export async function searchArbeitnow(p: SearchParams): Promise<Job[]> {
  // Arbeitnow has no keyword search; pull the latest pages and filter by title.
  const pages = await Promise.all(
    [1, 2, 3].map(async (page) => {
      const res = await fetchWithTimeout(`https://www.arbeitnow.com/api/job-board-api?page=${page}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Arbeitnow HTTP ${res.status}`);
      return ((await res.json()) as { data?: ArbeitnowJob[] }).data ?? [];
    }),
  );
  // Only remote roles are realistic for someone in Canada (Arbeitnow is mostly EU).
  return pages
    .flat()
    .filter((j) => j.remote && titleMatches(j.title, p.query))
    .map(mapArbeitnowJob);
}
