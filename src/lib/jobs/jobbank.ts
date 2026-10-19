/**
 * Job Bank (jobbank.gc.ca) has no public search API, so this reads the public
 * search results page. Personal, low-volume use only: requests are spaced out,
 * results are cached by the aggregator, and the source can be switched off.
 */
import * as cheerio from "cheerio";
import type { Job, SearchParams } from "../types";
import { BROWSER_HEADERS, fetchWithTimeout } from "./http";
import { parsePostedDate } from "./freshness";

const BASE = "https://www.jobbank.gc.ca";

let lastRequest = 0;
async function politeFetch(url: string): Promise<Response> {
  const wait = lastRequest + 1000 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  try {
    return await fetchWithTimeout(url, { headers: BROWSER_HEADERS }, 12000);
  } catch {
    // A reused keep-alive connection sometimes stalls; one retry on a fresh request fixes it.
    lastRequest = Date.now();
    return fetchWithTimeout(url, { headers: BROWSER_HEADERS }, 15000);
  }
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export function parseJobBankSearch(html: string, now = Date.now()): Job[] {
  const $ = cheerio.load(html);
  const jobs: Job[] = [];
  $("article[id^=article-]").each((_, el) => {
    const a = $(el).find("a.resultJobItem").first();
    const id = $(el).attr("id")!.replace("article-", "");
    const href = (a.attr("href") ?? "").replace(/;jsessionid=[^?]*/, "");
    const title = clean(a.find(".noctitle").first().text());
    if (!title) return;
    const telework = clean(a.find(".telework").first().text());
    const salary = clean(a.find("li.salary").first().text()).replace(/^Salary\s*/i, "");
    const location = clean(a.find("li.location").first().text()).replace(/^Location\s*/i, "");
    const publisher = clean(a.find("li.source .wb-inv").first().text()) || "Job Bank";
    jobs.push({
      id: `jobbank-${id}`,
      source: "jobbank",
      publisher,
      title: title.replace(/^\w/, (c) => c.toUpperCase()),
      company: clean(a.find("li.business").first().text()) || "Employer on Job Bank",
      location,
      remote: /remote|telework/i.test(telework),
      salary: salary || undefined,
      postedAt: parsePostedDate(clean(a.find("li.date").first().text()), now),
      // Search results have no description; it's fetched when the job is opened.
      description: "",
      applyUrl: href.startsWith("http") ? href : `${BASE}${href.split("?")[0]}`,
      // Job Bank is a Government of Canada service; postings come from all employers,
      // so only flag it as "government" when the employer is public-sector.
      government: false,
    });
  });
  return jobs;
}

export function parseJobBankPosting(html: string): string {
  const $ = cheerio.load(html);
  const section = $(".job-posting-detail-requirements").first();
  const root = section.length ? section : $(".job-posting-details-body").first();
  const tidy = (t: string) => t.replace(/\s+/g, " ").trim();

  // Postings are h3 sections containing h4 labels, each followed by a <p> or a list.
  const lines: string[] = [];
  root.find("h3, h4").each((_, el) => {
    const heading = tidy($(el).text());
    if (!heading) return;
    if (el.tagName === "h3") {
      lines.push("", heading);
      return;
    }
    const values = $(el)
      .nextUntil("h3, h4, :has(h3), :has(h4)")
      .toArray()
      .map((sib) => {
        const items = $(sib).find("li").toArray().map((li) => tidy($(li).text())).filter(Boolean);
        return items.length ? items : [tidy($(sib).text())];
      })
      .flat()
      .filter(Boolean);
    if (values.length > 3) lines.push(`${heading}:`, ...values.map((v) => `• ${v}`));
    else lines.push(`${heading}: ${values.join(", ")}`);
  });
  const text = lines.join("\n").trim();
  return text || tidy(root.text());
}

export async function searchJobBank(p: SearchParams): Promise<Job[]> {
  const url = new URL(`${BASE}/jobsearch/jobsearch`);
  url.searchParams.set("searchstring", p.query);
  if (p.location) url.searchParams.set("locationstring", p.location);
  url.searchParams.set("sort", "D"); // newest first; age is filtered locally
  const res = await politeFetch(url.toString());
  if (!res.ok) throw new Error(`Job Bank HTTP ${res.status} (the site may be busy — try again later)`);
  const jobs = parseJobBankSearch(await res.text());
  return p.remoteOnly ? jobs.filter((j) => j.remote) : jobs;
}

export async function fetchJobBankDescription(applyUrl: string): Promise<string> {
  const res = await politeFetch(applyUrl);
  if (!res.ok) throw new Error(`Job Bank HTTP ${res.status}`);
  return parseJobBankPosting(await res.text());
}
