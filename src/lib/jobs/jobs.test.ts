import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseJobBankPosting, parseJobBankSearch } from "./jobbank";
import { mapJSearchJob } from "./jsearch";
import { mapAdzunaJob } from "./adzuna";
import { mapRemotiveJob, titleMatches } from "./remote";
import { ageBucket, filterByAge, parsePostedDate } from "./freshness";
import { detectLevel, levelFit, minYearsRequired } from "./level";
import { dedupeJobs, filterByProvince } from "./index";
import { isGovernmentJob, governmentLinks } from "./government";
import type { Job } from "../types";

const fixture = (f: string) => fs.readFileSync(path.join(__dirname, "__fixtures__", f), "utf8");
const NOW = Date.parse("2026-10-19T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const job = (over: Partial<Job>): Job => ({
  id: "x",
  source: "jsearch",
  title: "Data Analyst",
  company: "Acme",
  location: "Toronto, ON",
  remote: false,
  postedAt: daysAgo(1),
  description: "",
  applyUrl: "https://example.com",
  ...over,
});

describe("Job Bank parser", () => {
  it("parses search results", () => {
    const jobs = parseJobBankSearch(fixture("jobbank-search.html"), NOW);
    expect(jobs.length).toBe(4);
    const first = jobs[0];
    expect(first.id).toBe("jobbank-50516014");
    expect(first.title).toBe("Data analyst - informatics and systems");
    expect(first.company).toContain("Northern Path");
    expect(first.location).toBe("Toronto (ON)");
    expect(first.salary).toContain("$170,000.00");
    expect(first.applyUrl).toBe("https://www.jobbank.gc.ca/jobsearch/jobposting/50516014");
    expect(first.postedAt?.startsWith("2026-10-16")).toBe(true);
    expect(first.publisher).toBe("Job Bank");
  });

  it("extracts the posting description", () => {
    const text = parseJobBankPosting(fixture("jobbank-posting.html"));
    expect(text).toMatch(/Education/);
    expect(text).toMatch(/Python/);
    expect(text.length).toBeGreaterThan(200);
    expect(text).toMatch(/Education: College\/CEGEP/);
    expect(text).toMatch(/Experience: 1 year to less than 2 years/);
    expect(text).not.toMatch(/^\s*[:.]\s*$/m);
    expect(detectLevel("Business data analyst", text)).toBe("junior");
    expect(text).toMatch(/Work setting: Consulting firm/);
    expect(text).toMatch(/On site: Work must be completed/);
  });
});

describe("API mappers", () => {
  it("maps JSearch and flags expired + government", () => {
    const j = mapJSearchJob(
      {
        job_id: "abc",
        job_title: "Policy Analyst",
        employer_name: "Government of Canada",
        job_publisher: "GC Jobs",
        job_apply_link: "https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/applicant/page1800?poster=1",
        job_posted_at_timestamp: NOW / 1000 - 86400,
        job_offer_expiration_datetime_utc: "2026-10-01T00:00:00Z",
        job_city: "Ottawa",
        job_state: "ON",
        job_min_salary: 70000,
        job_max_salary: 85000,
        job_salary_period: "YEAR",
      },
      NOW,
    );
    expect(j.government).toBe(true);
    expect(j.expired).toBe(true);
    expect(j.location).toBe("Ottawa, ON");
    expect(j.salary).toBe("$70,000–$85,000 / year");
  });

  it("maps Adzuna and Remotive", () => {
    const a = mapAdzunaJob({
      id: "1",
      title: "<strong>Data</strong> Analyst",
      description: "Use SQL",
      redirect_url: "https://adzuna.ca/x",
      created: "2026-10-10T00:00:00Z",
      company: { display_name: "City of Toronto" },
    });
    expect(a.title).toBe("Data Analyst");
    expect(a.government).toBe(true);
    const r = mapRemotiveJob({
      id: 5,
      url: "https://remotive.com/5",
      title: "Analyst",
      company_name: "Remote Co",
      publication_date: "2026-10-18T10:00:00",
      candidate_required_location: "Canada",
      description: "<p>Hello</p>",
    });
    expect(r.remote).toBe(true);
    expect(r.description).toBe("Hello");
  });

  it("matches titles by all query terms", () => {
    expect(titleMatches("Senior Data Analyst", "data analyst")).toBe(true);
    expect(titleMatches("Data Engineer", "data analyst")).toBe(false);
  });
});

describe("freshness", () => {
  it("parses relative and absolute dates", () => {
    expect(parsePostedDate("3 days ago", NOW)).toBe(daysAgo(3));
    expect(parsePostedDate("30+ days ago", NOW)).toBe(daysAgo(30));
    expect(parsePostedDate("yesterday", NOW)).toBe(daysAgo(1));
    expect(parsePostedDate("October 16, 2026", NOW)?.startsWith("2026-10-16")).toBe(true);
    expect(parsePostedDate("", NOW)).toBeNull();
  });

  it("filters by age and hides unknown dates unless asked", () => {
    const jobs = [
      job({ id: "a", postedAt: daysAgo(2) }),
      job({ id: "b", postedAt: daysAgo(20) }),
      job({ id: "c", postedAt: null }),
      job({ id: "d", postedAt: daysAgo(1), expired: true }),
    ];
    const r = filterByAge(jobs, "14", false, NOW);
    expect(r.kept.map((j) => j.id)).toEqual(["a"]);
    expect(r.hidden).toBe(3);
    expect(filterByAge(jobs, "30", true, NOW).kept.map((j) => j.id)).toEqual(["a", "b", "c"]);
  });

  it("buckets ages", () => {
    expect(ageBucket(daysAgo(2), NOW)).toBe("fresh");
    expect(ageBucket(daysAgo(10), NOW)).toBe("aging");
    expect(ageBucket(daysAgo(40), NOW)).toBe("old");
    expect(ageBucket(null, NOW)).toBe("unknown");
  });
});

describe("dedupe", () => {
  it("keeps the earliest posted date and longest description", () => {
    const out = dedupeJobs([
      job({ id: "1", company: "Acme Inc.", postedAt: daysAgo(1), description: "short" }),
      job({ id: "2", company: "ACME", postedAt: daysAgo(25), description: "a much longer description" }),
      job({ id: "3", title: "Other", postedAt: daysAgo(1) }),
    ]);
    expect(out).toHaveLength(2);
    const merged = out.find((j) => j.title === "Data Analyst")!;
    expect(merged.postedAt).toBe(daysAgo(25));
    expect(merged.description).toBe("a much longer description");
  });
});

describe("job level", () => {
  it("detects from title", () => {
    expect(detectLevel("Senior Analyst")).toBe("senior");
    expect(detectLevel("Sr. Data Engineer")).toBe("senior");
    expect(detectLevel("Data Analyst II")).toBe("intermediate");
    expect(detectLevel("Junior Developer")).toBe("junior");
    expect(detectLevel("Summer Student – Co-op")).toBe("internship");
    expect(detectLevel("Senior Manager, Finance")).toBe("manager");
    expect(detectLevel("Director of Engineering")).toBe("director");
    expect(detectLevel("Lead Data Scientist")).toBe("lead");
  });

  it("detects from years of experience", () => {
    expect(minYearsRequired("You have 5+ years of experience with SQL")).toBe(5);
    expect(minYearsRequired("3-5 years of relevant experience")).toBe(3);
    expect(detectLevel("Data Analyst", "Minimum 5+ years experience")).toBe("senior");
    expect(detectLevel("Data Analyst", "1 year to less than 2 years experience")).toBe("junior");
    expect(detectLevel("Data Analyst", "No experience required, will train")).toBe("entry");
    expect(detectLevel("Data Analyst", "Great team")).toBeNull();
  });

  it("scores fit against the target level", () => {
    expect(levelFit("junior", "junior")).toBe("match");
    expect(levelFit("junior", "intermediate")).toBe("stretch");
    expect(levelFit("junior", "entry")).toBe("below");
    expect(levelFit("junior", "senior")).toBe("out");
    expect(levelFit("junior", null)).toBe("unknown");
    expect(levelFit("", "senior")).toBe("unknown");
  });
});

describe("government", () => {
  it("recognises public-sector employers and domains", () => {
    expect(isGovernmentJob("https://www.gojobs.gov.on.ca/Preview.aspx?Language=English&JobID=1", "X")).toBe(true);
    expect(isGovernmentJob("https://careers.example.com", "City of Ottawa")).toBe(true);
    expect(isGovernmentJob("https://careers.example.com", "Shopify")).toBe(false);
  });

  it("builds province and city links", () => {
    const names = governmentLinks("data analyst", "Toronto, ON").map((l) => l.name);
    expect(names).toContain("Job Bank");
    expect(names).toContain("Ontario Public Service");
    expect(names).toContain("City of Toronto Jobs");
  });
});

describe("location", () => {
  it("drops on-site jobs in other provinces but keeps remote ones", () => {
    const out = filterByProvince(
      [
        job({ id: "to", location: "North York (ON)" }),
        job({ id: "cal", location: "Calgary (AB)" }),
        job({ id: "rem", location: "Remote (Worldwide)", remote: true }),
        job({ id: "unk", location: "Canada" }),
      ],
      "Toronto, ON",
    );
    expect(out.map((j) => j.id)).toEqual(["to", "rem", "unk"]);
  });
});

describe("job questions", () => {
  it("asks about missing keywords and drops blank or 'no' answers from prompts", async () => {
    const { buildJobQuestions, answersBlock } = await import("../questions");
    const qs = buildJobQuestions(
      job({ description: "We need SQL, Tableau and Snowflake experience.", company: "Acme" }),
      "SQL reporting",
    );
    expect(qs.map((q) => q.question).join(" ")).toMatch(/Tableau/);
    expect(qs.at(-1)?.question).toMatch(/Acme/);
    const block = answersBlock([
      { question: "Tableau?", answer: "Built two dashboards" },
      { question: "Snowflake?", answer: "no" },
      { question: "Why?", answer: "  " },
    ]);
    expect(block).toContain("Built two dashboards");
    expect(block).not.toContain("Snowflake?");
    expect(answersBlock([])).toBe("");
  });
});
