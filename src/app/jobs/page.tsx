"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { governmentLinks } from "@/lib/jobs/government";
import { SOURCE_LABELS, type Job, type JobSource, type SearchParams, type SearchResult, type StoredProfile } from "@/lib/types";
import { Button, Empty, ErrorNote, Field, Notice, PageHeader, Tag, cx, inputClass } from "@/components/ui";
import { JobRow } from "@/components/JobRow";
import { LevelSelect } from "@/components/LevelSelect";

type Row = Job & { saved?: boolean };
type SavedSearch = { id: number; name: string; params: SearchParams };

const SOURCES: JobSource[] = ["jsearch", "jobbank", "adzuna", "remotive", "arbeitnow"];
const SOURCE_NOTES: Partial<Record<JobSource, string>> = {
  jsearch: "LinkedIn, Indeed, Glassdoor, company sites",
  jobbank: "Government of Canada job board",
  adzuna: "Optional key",
  remotive: "Remote only",
  arbeitnow: "Remote only",
};

const DEFAULTS: SearchParams = {
  query: "",
  location: "",
  level: "",
  remoteOnly: false,
  postedWithin: "14",
  employmentType: "",
  governmentOnly: false,
  includeUnknownDate: false,
  sources: ["jsearch", "jobbank", "adzuna", "remotive"],
};

const STORAGE_KEY = "jobfinder.search";

export default function JobsPage() {
  const [p, setP] = useState<SearchParams>(DEFAULTS);
  const [result, setResult] = useState<(SearchResult & { jobs: Row[] }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [hasProfile, setHasProfile] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // Restoring the last search from browser storage on mount is the intended sync.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setP((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      /* storage unavailable */
    }
    api<{ profile: StoredProfile | null }>("/api/profile")
      .then(({ profile }) => {
        setHasProfile(Boolean(profile));
        // Only fill fields the user hasn't already filled in.
        setP((prev) => ({
          ...prev,
          level: prev.level || profile?.targetLevel || "",
          location: prev.location || profile?.profile.location || "",
        }));
      })
      .catch(() => {});
    api<{ searches: SavedSearch[] }>("/api/searches").then((r) => setSaved(r.searches)).catch(() => {});
  }, []);

  const set = <K extends keyof SearchParams>(k: K, v: SearchParams[K]) => setP((prev) => ({ ...prev, [k]: v }));

  async function run(params = p) {
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
    } catch {
      /* ignore */
    }
    try {
      setResult(await api("/api/jobs/search", { method: "POST", json: params }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleSave(job: Row) {
    const next = !job.saved;
    setResult((r) => r && { ...r, jobs: r.jobs.map((j) => (j.id === job.id ? { ...j, saved: next } : j)) });
    await api(`/api/jobs/${encodeURIComponent(job.id)}`, { method: "PATCH", json: { saved: next } }).catch(() => {});
  }

  async function saveSearch() {
    const name = [p.query, p.location].filter(Boolean).join(" · ");
    const r = await api<{ searches: SavedSearch[] }>("/api/searches", { method: "POST", json: { name, params: p } });
    setSaved(r.searches);
  }

  async function deleteSearch(id: number) {
    const r = await api<{ searches: SavedSearch[] }>(`/api/searches?id=${id}`, { method: "DELETE" });
    setSaved(r.searches);
  }

  const govLinks = p.query ? governmentLinks(p.query, p.location) : [];

  return (
    <>
      <PageHeader
        title="Find jobs"
        intro="Search LinkedIn, Indeed and Glassdoor (through JSearch), Job Bank and remote boards at once. Old and expired postings are filtered out."
      />

      {!hasProfile && (
        <div className="mb-4">
          <Notice>
            Add your resume on <a className="font-semibold underline" href="/profile">My resume</a> to see how well
            each job matches you.
          </Notice>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="rounded-lg border border-line bg-surface p-4 md:p-5"
      >
        <div className="grid gap-4 md:grid-cols-[2fr_1.4fr_1.2fr]">
          <Field label="Job title or keywords">
            <input
              className={inputClass}
              value={p.query}
              onChange={(e) => set("query", e.target.value)}
              placeholder="e.g. Data Analyst"
              required
            />
          </Field>
          <Field label="City or province" hint="Leave blank to search all of Canada">
            <input
              className={inputClass}
              value={p.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Toronto, ON"
            />
          </Field>
          <Field label="What level are you applying for?">
            <LevelSelect value={p.level} onChange={(v) => set("level", v)} />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Field label="Posted within">
            <select
              className={inputClass}
              value={p.postedWithin}
              onChange={(e) => set("postedWithin", e.target.value as SearchParams["postedWithin"])}
            >
              <option value="1">Last 24 hours</option>
              <option value="3">Last 3 days</option>
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </Field>
          <Field label="Job type">
            <select
              className={inputClass}
              value={p.employmentType}
              onChange={(e) => set("employmentType", e.target.value as SearchParams["employmentType"])}
            >
              <option value="">Any</option>
              <option value="FULLTIME">Full-time</option>
              <option value="PARTTIME">Part-time</option>
              <option value="CONTRACTOR">Contract</option>
              <option value="INTERN">Internship</option>
            </select>
          </Field>
          <fieldset className="flex flex-col gap-1.5 text-sm md:col-span-2">
            <legend className="mb-1 font-semibold">Show</legend>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={p.remoteOnly} onChange={(e) => set("remoteOnly", e.target.checked)} />
              Remote jobs only
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={p.governmentOnly}
                onChange={(e) => set("governmentOnly", e.target.checked)}
              />
              Government jobs only
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={p.includeUnknownDate}
                onChange={(e) => set("includeUnknownDate", e.target.checked)}
              />
              Include jobs with no posting date
            </label>
          </fieldset>
        </div>

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-semibold">Sources</legend>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => {
              const on = p.sources.includes(s);
              return (
                <label
                  key={s}
                  className={cx(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm",
                    on ? "border-spruce bg-spruce-soft" : "border-line",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      set("sources", e.target.checked ? [...p.sources, s] : p.sources.filter((x) => x !== s))
                    }
                  />
                  <span className="font-medium">{SOURCE_LABELS[s]}</span>
                  <span className="hidden text-xs text-muted sm:inline">{SOURCE_NOTES[s]}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="submit" busy={busy}>
            {busy ? "Searching…" : "Search jobs"}
          </Button>
          <Button type="button" variant="secondary" onClick={saveSearch} disabled={!p.query}>
            Save this search
          </Button>
        </div>
      </form>

      {saved.length > 0 && (
        <section className="mt-6" aria-labelledby="saved-searches">
          <h2 id="saved-searches" className="mb-2 text-sm font-semibold text-muted">
            Saved searches
          </h2>
          <ul className="flex flex-wrap gap-2">
            {saved.map((s) => (
              <li key={s.id} className="flex items-center rounded-md border border-line bg-surface text-sm">
                <button
                  type="button"
                  className="px-3 py-1.5 font-medium hover:underline"
                  onClick={() => {
                    setP(s.params);
                    run(s.params);
                  }}
                >
                  {s.name}
                </button>
                <button
                  type="button"
                  aria-label={`Delete saved search ${s.name}`}
                  className="border-l border-line px-2 py-1.5 text-muted hover:text-rust"
                  onClick={() => deleteSearch(s.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_17rem]">
        <section aria-live="polite">
          <ErrorNote message={error} />
          {result && (
            <>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-semibold">
                  {result.jobs.length} job{result.jobs.length === 1 ? "" : "s"}
                </h2>
                <p className="text-sm text-muted">
                  {result.hiddenOld > 0 && `${result.hiddenOld} old, undated or expired hidden. `}
                  {result.hiddenLevel > 0 && `${result.hiddenLevel} outside your level hidden.`}
                </p>
              </div>
              <ul className="mb-4 flex flex-wrap gap-1.5">
                {result.sourceStatus.map((s) => (
                  <li key={s.source}>
                    <Tag tone={s.ok || s.skipped ? "plain" : "rust"}>
                      <span title={s.message}>
                        {SOURCE_LABELS[s.source]}: {s.ok ? s.count : s.message ?? "failed"}
                      </span>
                    </Tag>
                  </li>
                ))}
              </ul>
              {result.jobs.length ? (
                <ul className="rounded-lg border border-line bg-surface px-4">
                  {result.jobs.map((j) => (
                    <JobRow key={j.id} job={j} onToggleSave={toggleSave} />
                  ))}
                </ul>
              ) : (
                <Empty title="No jobs match these filters">
                  Try a wider date range, a nearby city, or tick “Include jobs with no posting date”.
                </Empty>
              )}
            </>
          )}
          {!result && !error && (
            <Empty title="Search to see jobs">Results are sorted newest first, with a match score against your resume.</Empty>
          )}
        </section>

        <aside aria-labelledby="gov-links" className="h-fit rounded-lg border border-line bg-surface p-4">
          <h2 id="gov-links" className="font-display text-base font-semibold">
            Government job sites
          </h2>
          <p className="mt-1 text-xs text-muted">
            GC Jobs and provincial sites can’t be searched directly. These open your search on each site.
          </p>
          {govLinks.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {govLinks.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noreferrer" className="font-medium text-spruce hover:underline">
                    {l.name}
                  </a>
                  <span className="block text-xs text-muted">
                    {l.level}
                    {l.note ? `. ${l.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Enter a job title to get links.</p>
          )}
        </aside>
      </div>
    </>
  );
}
