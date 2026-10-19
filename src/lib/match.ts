/**
 * Local keyword matching between a resume and a job description. No AI call —
 * this runs on every search result to rank jobs and show missing keywords.
 */

// Multi-word and tricky skills that a simple tokenizer would miss or split,
// grouped by field so the app works for every career path.
const KNOWN_SKILLS = [
  // Office, data and tech
  "power bi", "microsoft excel", "excel", "sql", "python", "tableau", "looker", "sas", "spss", "vba",
  "javascript", "typescript", "react", "next.js", "node.js", "java", "c#", "c++", ".net", "golang", "ruby", "php",
  "html", "css", "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform", "ci/cd", "git",
  "rest api", "graphql", "machine learning", "deep learning", "data analysis", "data visualization",
  "data modeling", "data modelling", "etl", "data warehouse", "snowflake", "databricks", "spark", "airflow",
  "salesforce", "sap", "oracle", "workday", "quickbooks", "sage", "jira", "confluence", "agile", "scrum",
  "kanban", "project management", "pmp", "change management", "stakeholder management", "risk management",
  "business analysis", "requirements gathering", "process improvement", "lean", "six sigma",
  "ux", "ui", "user research", "wireframing", "prototyping", "accessibility", "wcag", "qa", "testing",
  "automation", "selenium", "cybersecurity", "network security", "itil", "active directory", "linux",
  "windows server", "troubleshooting", "technical support", "help desk", "microsoft 365", "office 365",
  "sharepoint", "power automate", "power apps", "dynamics 365", "data entry", "microsoft office",
  // Finance, HR and admin
  "budgeting", "forecasting", "financial analysis", "financial reporting", "accounts payable",
  "accounts receivable", "reconciliation", "ifrs", "aspe", "gaap", "cpa", "payroll", "bookkeeping", "auditing",
  "compliance", "recruitment", "onboarding", "hris", "employee relations", "scheduling", "reception",
  "calendar management", "minute taking", "records management",
  // Government and policy
  "policy development", "policy analysis", "research", "report writing", "briefing notes",
  "enhanced reliability", "secret clearance", "security clearance", "bilingual", "french", "english",
  "cbc", "bbb", "public administration", "program evaluation",
  // Sales, marketing and creative
  "customer service", "account management", "sales", "b2b", "crm", "hubspot", "marketing", "seo", "sem",
  "google analytics", "content strategy", "social media", "copywriting", "figma", "adobe creative suite",
  "photoshop", "illustrator", "indesign", "video editing", "premiere pro", "canva", "photography",
  // Skilled trades and construction
  "red seal", "journeyperson", "journeyman", "apprenticeship", "309a", "442a", "313a", "306a",
  "blueprint reading", "blueprints", "electrical code", "building code", "lockout/tagout", "lock-out/tag-out",
  "fall protection", "working at heights", "confined space", "welding", "mig", "tig", "stick welding",
  "plc", "hvac", "plumbing", "carpentry", "millwright", "preventive maintenance", "preventative maintenance",
  "hand tools", "power tools", "power line", "conduit", "troubleshooting electrical", "framing", "drywall",
  "heavy equipment", "excavator", "crane",
  // Transportation and warehouse
  "az licence", "az license", "dz licence", "dz license", "class 1", "class 3", "g licence", "g license",
  "g2", "air brake", "air brake endorsement", "cvor", "clean abstract", "hours of service", "logbook",
  "forklift", "reach truck", "pallet jack", "shipping and receiving", "warehouse", "inventory management",
  "supply chain", "logistics", "procurement", "dispatch", "route planning",
  // Healthcare and community services
  "rn", "rpn", "psw", "lpn", "registered nurse", "registered practical nurse", "personal support worker",
  "nursing", "patient care", "bls", "acls", "pals", "medication administration", "charting",
  "electronic medical records", "emr", "infection control", "infection prevention", "wound care",
  "dementia care", "palliative care", "vital signs", "phlebotomy", "triage", "case management",
  "mental health", "crisis intervention", "trauma-informed", "harm reduction", "cpi", "naloxone",
  // Education and childcare
  "oct", "rece", "ece", "early childhood education", "classroom management", "lesson planning", "iep",
  "curriculum", "special education", "differentiated instruction", "vulnerable sector check", "tutoring",
  // Hospitality, food and retail
  "smart serve", "food handler", "food handlers", "food safety", "haccp", "pos", "point of sale",
  "cash handling", "merchandising", "visual merchandising", "loss prevention", "upselling", "barista",
  "line cook", "food preparation", "front of house", "back of house", "housekeeping", "guest services",
  // Safety and certificates common to many fields
  "whmis", "first aid", "standard first aid", "cpr", "health and safety", "ohsa", "jhsc", "safety",
  // Transferable skills
  "communication", "leadership", "problem solving", "problem-solving", "teamwork", "collaboration",
  "time management", "attention to detail", "critical thinking", "presentation", "negotiation",
  "coaching", "mentoring", "writing", "reliability", "flexible schedule", "weekends",
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
    // Skip words that are only part of a phrase already found ("Seal" in "Red Seal").
    const partOfPhrase = [...found.keys()].some((k) => k.includes(" ") && containsTerm(k, w));
    if ((isAcronym || midSentence) && !partOfPhrase) {
      if (!found.has(w)) found.set(w, 1 + count);
    }
  }

  // Keep the more specific phrase: drop "safety" when "health and safety" was found.
  for (const k of [...found.keys()]) {
    if ([...found.keys()].some((other) => other !== k && other.includes(" ") && containsTerm(other, k))) found.delete(k);
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
