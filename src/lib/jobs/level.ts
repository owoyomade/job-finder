import { LEVEL_LABELS, type Level } from "../types";

/** Seniority rank used to compare a job's level with the level the user is targeting. */
const RANK: Record<Level, number> = {
  internship: 0,
  entry: 1,
  junior: 2,
  intermediate: 3,
  senior: 4,
  lead: 5,
  manager: 5,
  director: 6,
};

// Order matters: the first match wins, most senior first so "Senior Manager" → manager
// and "Director of Engineering" → director.
const TITLE_PATTERNS: [Level, RegExp][] = [
  ["director", /\b(director|vice[\s-]president|vp|chief|cto|cfo|ceo|coo|head of)\b/i],
  ["manager", /\b(manager|mgr|supervisor|superintendent)\b/i],
  ["lead", /\b(lead|principal|staff|architect|foreman|forewoman|foreperson|charge nurse|crew lead|head chef|chef de cuisine)\b/i],
  ["senior", /\b(senior|sr\.?|iii|level\s*3)\b/i],
  ["internship", /\b(intern|internship|co-?op|student|summer)\b/i],
  ["entry", /\b(new\s*grad|graduate|entry[\s-]level|trainee|apprentice|helper|labourer|laborer|general labour)\b/i],
  ["junior", /\b(junior|jr\.?|associate|level\s*1|i)\b/i],
  ["intermediate", /\b(intermediate|mid[\s-]level|ii|level\s*2|journeyperson|journeyman|journeywoman)\b/i],
];

/** Minimum years of experience the description asks for, if it says. */
export function minYearsRequired(description: string): number | null {
  const re =
    /(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?(?:\+\s*)?years?(?:'|’)?\s*(?:of\s+)?(?:[a-z/-]+\s+){0,4}?(?:experience|exp\b)/gi;
  // Job Bank style: "Experience: 1 year to less than 2 years"
  const labelled = /experience\s*:?\s*(\d{1,2})\s*\+?\s*(?:years?|yrs)/gi;
  let min: number | null = null;
  for (const m of [...description.matchAll(re), ...description.matchAll(labelled)]) {
    const n = Number(m[1]);
    if (n > 25) continue;
    // Use the largest "minimum" mentioned — that's usually the core requirement.
    if (min === null || n > min) min = n;
  }
  return min;
}

function levelFromYears(years: number): Level {
  if (years <= 0) return "entry";
  if (years <= 2) return "junior";
  if (years <= 4) return "intermediate";
  if (years <= 7) return "senior";
  return "lead";
}

export function detectLevel(title: string, description = ""): Level | null {
  for (const [level, re] of TITLE_PATTERNS) {
    if (re.test(title)) return level;
  }
  const years = minYearsRequired(description);
  if (years !== null) return levelFromYears(years);
  // Trades postings often state the level in the description rather than the title.
  if (/\bjourney(person|man|woman)\b/i.test(description)) return "intermediate";
  if (/\bapprentice(ship)?\b/i.test(description)) return "entry";
  if (/\b(no experience (required|necessary)|will train)\b/i.test(description)) return "entry";
  return null;
}

export type LevelFit = "match" | "stretch" | "below" | "unknown" | "out";

export function levelFit(target: Level | "", detected: Level | null): LevelFit {
  if (!target || !detected) return "unknown";
  const diff = RANK[detected] - RANK[target];
  if (diff === 0) return "match";
  if (diff === 1) return "stretch";
  if (diff === -1) return "below";
  return "out";
}

/** JSearch `job_requirements` filter for a level (comma-separated, OR'd by the API). */
export function jsearchRequirements(level: Level | ""): string | undefined {
  switch (level) {
    case "internship":
    case "entry":
      return "no_experience,under_3_years_experience";
    case "junior":
      return "under_3_years_experience";
    case "":
      return undefined;
    default:
      return "more_than_3_years_experience";
  }
}

/** Plain-language guidance passed to Claude so writing matches the seniority. */
export function levelGuidance(level: Level | ""): string {
  switch (level) {
    case "internship":
    case "entry":
      return `The candidate is applying at the ${LEVEL_LABELS[level]} level. Lead with education, projects, co-op/volunteer work and transferable skills; emphasise eagerness to learn and fundamentals. Interview questions should focus on fundamentals, learning ability, teamwork and school/project examples.`;
    case "junior":
    case "intermediate":
      return `The candidate is applying at the ${LEVEL_LABELS[level]} level. Emphasise hands-on delivery, tools, measurable results and growing ownership. Interview questions should mix fundamentals with practical, applied scenarios.`;
    case "senior":
      return `The candidate is applying at the Senior level. Emphasise ownership of outcomes, complex problems solved, mentoring, and cross-team impact. Interview questions should be challenging: trade-offs, design decisions, handling ambiguity, mentoring.`;
    case "lead":
      return `The candidate is applying at the Lead / Principal level. Emphasise technical or functional leadership, setting direction, influencing without authority, and org-wide impact. Include leadership, strategy and design-depth questions.`;
    case "manager":
      return `The candidate is applying for a Manager role. Emphasise people leadership, hiring, coaching, delivery through teams, budgets and stakeholder management. Include people-management, conflict and performance-management questions.`;
    case "director":
      return `The candidate is applying at the Director+ level. Emphasise strategy, organisational leadership, P&L/budget, executive stakeholder management and transformation. Include strategic, executive-presence and org-design questions.`;
    default:
      return "The target level is not specified; infer an appropriate seniority from the job posting.";
  }
}
