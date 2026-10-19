/**
 * Local keyword matching between a resume and a job description. No AI call —
 * this runs on every search result to rank jobs and show missing keywords.
 */

// Multi-word and tricky skills that a simple tokenizer would miss or split.
const KNOWN_SKILLS = [
  "power bi", "microsoft excel", "excel", "sql", "python", "tableau", "looker", "sas", "spss", "vba",
  "javascript", "typescript", "react", "next.js", "node.js", "java", "c#", "c++", ".net", "golang", "ruby", "php",
  "html", "css", "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform", "ci/cd", "git",
  "rest api", "graphql", "machine learning", "deep learning", "data analysis", "data visualization",
  "data modeling", "data modelling", "etl", "data warehouse", "snowflake", "databricks", "spark", "airflow",
  "salesforce", "sap", "oracle", "workday", "quickbooks", "sage", "jira", "confluence", "agile", "scrum",
  "kanban", "project management", "pmp", "change management", "stakeholder management", "risk management",
  "business analysis", "requirements gathering", "process improvement", "lean", "six sigma",
  "customer service", "account management", "sales", "b2b", "crm", "hubspot", "marketing", "seo", "sem",
  "google analytics", "content strategy", "social media", "copywriting", "communication", "leadership",
  "problem solving", "problem-solving", "teamwork", "collaboration", "time management", "attention to detail",
  "critical thinking", "presentation", "negotiation", "budgeting", "forecasting", "financial analysis",
  "financial reporting", "accounts payable", "accounts receivable", "reconciliation", "ifrs", "aspe", "gaap",
  "cpa", "payroll", "bookkeeping", "auditing", "compliance", "policy development", "policy analysis",
  "research", "writing", "report writing", "bilingual", "french", "english", "ux", "ui", "figma",
  "user research", "wireframing", "prototyping", "accessibility", "wcag", "qa", "testing", "automation",
  "selenium", "cybersecurity", "network security", "itil", "active directory", "linux", "windows server",
  "troubleshooting", "technical support", "help desk", "microsoft 365", "office 365", "sharepoint",
  "power automate", "power apps", "dynamics 365", "nursing", "patient care", "case management",
  "mental health", "health and safety", "whmis", "first aid", "cpr", "inventory management",
  "supply chain", "logistics", "procurement", "warehouse", "forklift", "scheduling", "recruitment",
  "onboarding", "hris", "employee relations", "training", "coaching", "mentoring",
];

const STOPWORDS = new Set(
  `a about above across after again against all also am an and any are as at be because been before being
  below between both but by can could did do does doing down during each either etc every few for from further
  had has have having he her here hers him his how i if in into is it its itself just least less like may me
  might more most must my no nor not of off on once only or other our ours out over own per please same
  she should so some such than that the their theirs them then there these they this those through to too
  under until up upon us very via was we were what when where which while who whom why will with within
  without would you your yours ability able experience experienced years year work working job role
  position team teams company candidate candidates including include includes strong excellent good
  knowledge skills skill required requirements preferred asset assets plus new using use used related
  across ensure provide support responsibilities duties qualifications looking join opportunity
  environment based level well within demonstrated proven minimum must-have nice-to-have etc canada
  canadian ontario toronto vancouver montreal calgary ottawa edmonton winnipeg hamilton employer employees
  apply application applicants salary hour hours full-time part-time time permanent contract day days
  week weeks month months benefits equal diverse diversity inclusion accommodation accommodations
  disabilities disability please contact us note develop document assess prepare provide conduct execute
  design confer manage maintain perform review create plan identify coordinate lead assist participate
  analyze analyse fast tasks overview languages education work setting responsibilities additional
  information conditions personal suitability`.split(/\s+/),
);

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function containsTerm(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#])${escaped}($|[^a-z0-9+#])`).test(haystack);
}

/**
 * Pull the important keywords out of a job description: known skills, acronyms
 * (SQL, CPA), and capitalised tool names (Tableau, Salesforce).
 */
export function extractKeywords(description: string, limit = 30): string[] {
  const text = norm(description);
  const found = new Map<string, number>();

  for (const skill of KNOWN_SKILLS) {
    if (containsTerm(text, skill)) found.set(skill, 3);
  }

  // Acronyms and Capitalised words in the original text — likely tools/certs/proper nouns.
  const capRe = /\b([A-Z][a-zA-Z0-9+#.]{1,}|[A-Z]{2,}[0-9]*)\b/g;
  const counts = new Map<string, { count: number; original: string }>();
  for (const m of description.matchAll(capRe)) {
    const w = norm(m[1]).replace(/\.$/, "");
    if (w.length < 2 || STOPWORDS.has(w)) continue;
    const entry = counts.get(w);
    counts.set(w, { count: (entry?.count ?? 0) + 1, original: entry?.original ?? m[1].replace(/\.$/, "") });
  }
  // Words capitalised only because they start a sentence or bullet are noise; keep
  // acronyms, and words that appear capitalised mid-sentence (case-sensitive check).
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const [w, { count, original }] of counts) {
    const isAcronym = /^[A-Z0-9+#]{2,6}$/.test(original);
    const midSentence = new RegExp(`[a-z,;/(] ${esc(original)}\\b`).test(description);
    if (isAcronym || midSentence) {
      if (!found.has(w)) found.set(w, 1 + count);
    }
  }

  return [...found.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

export interface MatchResult {
  score: number; // 0–100
  matched: string[];
  missing: string[];
}

export function matchResume(resumeText: string, description: string): MatchResult {
  const keywords = extractKeywords(description);
  if (!keywords.length) return { score: 0, matched: [], missing: [] };
  const resume = norm(resumeText);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) (containsTerm(resume, k) ? matched : missing).push(k);
  return { score: Math.round((matched.length / keywords.length) * 100), matched, missing };
}

/** Flatten a structured profile into plain text for matching. */
export function profileToText(p: {
  headline?: string;
  summary?: string;
  skills?: string[];
  certifications?: string[];
  experience?: { title: string; bullets: string[] }[];
  education?: { credential: string; details: string }[];
  projects?: { name: string; bullets: string[] }[];
  volunteer?: { role: string; bullets: string[] }[];
}): string {
  return [
    p.headline,
    p.summary,
    ...(p.skills ?? []),
    ...(p.certifications ?? []),
    ...(p.experience ?? []).flatMap((e) => [e.title, ...e.bullets]),
    ...(p.education ?? []).flatMap((e) => [e.credential, e.details]),
    ...(p.projects ?? []).flatMap((e) => [e.name, ...e.bullets]),
    ...(p.volunteer ?? []).flatMap((e) => [e.role, ...e.bullets]),
  ]
    .filter(Boolean)
    .join("\n");
}
