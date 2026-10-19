import type { Job, JobSource, SearchParams, SearchResult } from "../types";
import { getCached, setCached } from "../db";
import { matchResume } from "../match";
import { searchJSearch } from "./jsearch";
import { searchAdzuna } from "./adzuna";
import { searchRemotive, searchArbeitnow } from "./remote";
import { searchJobBank } from "./jobbank";
import { mockJobs } from "./mock";
import { filterByAge } from "./freshness";
import { detectLevel, levelFit } from "./level";
import { provinceFromLocation } from "./government";

/**
 * Some sources pad results with jobs from across Canada. When the user picked a
 * place, drop on-site jobs that are clearly in another province.
 */
export function filterByProvince(jobs: Job[], location: string): Job[] {
  const wanted = location ? provinceFromLocation(location) : null;
  if (!wanted) return jobs;
  return jobs.filter((j) => {
    if (j.remote) return true;
    const prov = provinceFromLocation(j.location);
    return !prov || prov === wanted;
  });
}

const CACHE_MS = 6 * 60 * 60 * 1000;

export const ALL_SOURCES: JobSource[] = ["jsearch", "jobbank", "adzuna", "remotive", "arbeitnow"];

const SEARCHERS: Record<Exclude<JobSource, "mock">, (p: SearchParams) => Promise<Job[]>> = {
  jsearch: searchJSearch,
  adzuna: searchAdzuna,
  remotive: searchRemotive,
  arbeitnow: searchArbeitnow,
  jobbank: searchJobBank,
};

export function jobsMockEnabled() {
  return process.env.JOBS_MOCK === "1";
}

/** Which sources can run with the keys currently configured. */
export function sourceAvailability(): Record<Exclude<JobSource, "mock">, { available: boolean; reason?: string }> {
  return {
    jsearch: process.env.RAPIDAPI_KEY
      ? { available: true }
      : { available: false, reason: "Add RAPIDAPI_KEY to .env.local" },
    adzuna:
      process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY
        ? { available: true }
        : { available: false, reason: "Optional: add ADZUNA_APP_ID / ADZUNA_APP_KEY" },
    jobbank: { available: true },
    remotive: { available: true },
    arbeitnow: { available: true },
  };
}

const normKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\b(inc|ltd|llc|corp|corporation|limited|co)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Merge the same job found on several sites. Keeps the EARLIEST posted date so a
 * reposted old job doesn't look new, and the longest description.
 */
export function dedupeJobs(jobs: Job[]): Job[] {
  const byKey = new Map<string, Job>();
  for (const j of jobs) {
    const key = `${normKey(j.title)}|${normKey(j.company)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...j });
      continue;
    }
    const dates = [existing.postedAt, j.postedAt].filter(Boolean) as string[];
    const earliest = dates.length ? dates.sort((a, b) => Date.parse(a) - Date.parse(b))[0] : null;
    const better = j.description.length > existing.description.length ? j : existing;
    byKey.set(key, {
      ...better,
      postedAt: earliest,
      government: Boolean(existing.government || j.government),
      expired: Boolean(existing.expired || j.expired),
      salary: better.salary ?? existing.salary ?? j.salary,
    });
  }
  return [...byKey.values()];
}

async function runSource(source: Exclude<JobSource, "mock">, p: SearchParams): Promise<Job[]> {
  // Cache on the parameters the upstream API actually receives.
  const key = JSON.stringify([
    source,
    p.query.trim().toLowerCase(),
    p.location.trim().toLowerCase(),
    p.postedWithin,
    p.remoteOnly,
    p.employmentType,
    source === "jsearch" ? p.level : "",
  ]);
  const cached = getCached<Job[]>(key, CACHE_MS);
  if (cached) return cached;
  const jobs = await SEARCHERS[source](p);
  setCached(key, jobs);
  return jobs;
}

export async function searchJobs(p: SearchParams, resumeText: string | null): Promise<SearchResult> {
  const status: SearchResult["sourceStatus"] = [];
  let raw: Job[] = [];

  if (jobsMockEnabled()) {
    raw = mockJobs(p);
    status.push({ source: "mock", ok: true, count: raw.length, message: "Sample data (JOBS_MOCK=1)" });
  } else {
    const avail = sourceAvailability();
    const sources = (p.sources.length ? p.sources : ALL_SOURCES).filter(
      (s): s is Exclude<JobSource, "mock"> => s !== "mock",
    );
    const results = await Promise.allSettled(
      sources.map(async (s) => (avail[s].available ? runSource(s, p) : null)),
    );
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        status.push({ source: sources[i], ok: false, count: 0, message: String(r.reason?.message ?? r.reason) });
      } else if (r.value === null) {
        status.push({ source: sources[i], ok: false, skipped: true, count: 0, message: avail[sources[i]].reason });
      } else {
        raw.push(...r.value);
        status.push({ source: sources[i], ok: true, count: r.value.length });
      }
    });
  }

  let jobs = filterByProvince(dedupeJobs(raw), p.location);

  // Job level
  let hiddenLevel = 0;
  jobs = jobs.flatMap((j) => {
    const detected = detectLevel(j.title, j.description);
    const fit = levelFit(p.level, detected);
    if (fit === "out") {
      hiddenLevel++;
      return [];
    }
    return [{ ...j, detectedLevel: detected, levelFit: fit }];
  });

  // Freshness
  const { kept, hidden: hiddenOld } = filterByAge(jobs, p.postedWithin, p.includeUnknownDate);
  jobs = kept;

  if (p.governmentOnly) jobs = jobs.filter((j) => j.government);

  if (resumeText) {
    jobs = jobs.map((j) => {
      if (!j.description) return j;
      const m = matchResume(resumeText, j.description);
      return { ...j, matchScore: m.score, missingKeywords: m.missing.slice(0, 8) };
    });
  }

  jobs.sort((a, b) => {
    const ta = a.postedAt ? Date.parse(a.postedAt) : 0;
    const tb = b.postedAt ? Date.parse(b.postedAt) : 0;
    return tb - ta;
  });

  return { jobs, sourceStatus: status, hiddenOld, hiddenLevel };
}
