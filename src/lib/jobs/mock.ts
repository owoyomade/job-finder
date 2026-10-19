/** Sample listings used when JOBS_MOCK=1, so the search UI can be tried without API keys. */
import type { Job, SearchParams } from "../types";
import { daysAgoToIso } from "./http";

const SAMPLE_DESCRIPTION = (title: string, years: string) => `About the role
We are looking for a ${title} to join our growing analytics team.

Responsibilities
• Build and maintain dashboards in Power BI and Tableau
• Write complex SQL queries against our Snowflake data warehouse
• Partner with stakeholders to gather requirements and translate them into reports
• Automate recurring reporting with Python
• Present findings to leadership with clear recommendations

Qualifications
• ${years} of experience in data analysis or business intelligence
• Strong SQL and Microsoft Excel skills
• Experience with Power BI or Tableau
• Excellent communication and stakeholder management skills
• Bilingual (English/French) is an asset`;

export function mockJobs(p: SearchParams): Job[] {
  const q = p.query || "Data Analyst";
  const where = p.location || "Toronto, ON";
  const rows: [string, string, number | null, string, Job["source"], boolean, string][] = [
    [`Junior ${q}`, "Maple Analytics Inc.", 1, "1–2 years", "jsearch", false, "LinkedIn"],
    [q, "Northern Bank of Canada", 3, "3+ years", "jsearch", false, "Indeed"],
    [`Senior ${q}`, "Lakeshore Health Network", 5, "6+ years", "jsearch", false, "Glassdoor"],
    [`${q} (Bilingual)`, "Statistics Canada", 2, "2 years", "jsearch", true, "GC Jobs"],
    [`${q} – Ministry of Finance`, "Government of Ontario", 9, "3 years", "jsearch", true, "Ontario Public Service"],
    [q.toLowerCase(), "Prairie Logistics Ltd.", 4, "1 year to less than 2 years", "jobbank", false, "Job Bank"],
    [`${q} Intern (Summer 2027)`, "Coastal Tech Co-op", 6, "no experience", "adzuna", false, "Adzuna"],
    [`Lead ${q}`, "Remote First Software", 12, "8+ years", "remotive", false, "Remotive"],
    [q, "Old Posting Corp.", 45, "2 years", "jsearch", false, "Indeed"],
    [q, "No Date Ltd.", null, "2 years", "jsearch", false, "Company site"],
  ];
  return rows.map(([title, company, days, years, source, gov, publisher], i) => ({
    id: `mock-${i}-${title.toLowerCase().replace(/\W+/g, "-")}`,
    source,
    publisher,
    title,
    company,
    location: source === "remotive" ? "Remote (Canada)" : where,
    remote: source === "remotive",
    salary: i % 2 === 0 ? `$${60 + i * 5},000–$${75 + i * 5},000 / year` : undefined,
    employmentType: title.includes("Intern") ? "INTERN" : "FULLTIME",
    postedAt: days === null ? null : daysAgoToIso(days),
    description: SAMPLE_DESCRIPTION(title, years),
    applyUrl: "https://www.example.com/jobs/" + i,
    government: gov,
  }));
}
