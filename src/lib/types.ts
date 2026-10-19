import { z } from "zod";

// ---------- Job level ----------

export const LEVELS = [
  "internship",
  "entry",
  "junior",
  "intermediate",
  "senior",
  "lead",
  "manager",
  "director",
] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  internship: "Internship / Co-op",
  entry: "New Grad / Entry",
  junior: "Junior (1–3 yrs)",
  intermediate: "Intermediate (3–5 yrs)",
  senior: "Senior (5–8 yrs)",
  lead: "Lead / Principal",
  manager: "Manager",
  director: "Director+",
};

// ---------- Jobs ----------

export type JobSource = "jsearch" | "adzuna" | "remotive" | "arbeitnow" | "jobbank" | "mock";

export const SOURCE_LABELS: Record<JobSource, string> = {
  jsearch: "JSearch",
  adzuna: "Adzuna",
  remotive: "Remotive",
  arbeitnow: "Arbeitnow",
  jobbank: "Job Bank",
  mock: "Sample",
};

export interface Job {
  id: string;
  source: JobSource;
  /** Where the posting is published, e.g. "LinkedIn", "Job Bank", "Indeed". */
  publisher?: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary?: string;
  employmentType?: string;
  /** ISO date string, or null when the source doesn't say. */
  postedAt: string | null;
  description: string;
  applyUrl: string;
  government?: boolean;
  /** Filled in after search. */
  detectedLevel?: Level | null;
  levelFit?: "match" | "stretch" | "below" | "unknown";
  matchScore?: number;
  missingKeywords?: string[];
  expired?: boolean;
}

export type PostedWithin = "1" | "3" | "7" | "14" | "30";

export interface SearchParams {
  query: string;
  location: string; // "Toronto, ON" or "" for all of Canada
  level: Level | "";
  remoteOnly: boolean;
  postedWithin: PostedWithin;
  employmentType: "" | "FULLTIME" | "PARTTIME" | "CONTRACTOR" | "INTERN";
  governmentOnly: boolean;
  includeUnknownDate: boolean;
  sources: JobSource[];
}

export interface SearchResult {
  jobs: Job[];
  sourceStatus: { source: JobSource; ok: boolean; skipped?: boolean; count: number; message?: string }[];
  hiddenOld: number;
  hiddenLevel: number;
}

// ---------- Profile (structured resume) ----------

export const ProfileSchema = z.object({
  name: z.string(),
  headline: z.string().describe("Professional title, e.g. 'Data Analyst'"),
  email: z.string(),
  phone: z.string(),
  location: z.string().describe("City, Province"),
  links: z.array(z.string()).describe("LinkedIn, portfolio, GitHub URLs"),
  summary: z.string(),
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      location: z.string(),
      start: z.string().describe("e.g. 'Jan 2021'"),
      end: z.string().describe("e.g. 'Mar 2024' or 'Present'"),
      bullets: z.array(z.string()),
    }),
  ),
  skills: z.array(z.string()),
  education: z.array(
    z.object({
      credential: z.string().describe("Degree / diploma name"),
      school: z.string(),
      location: z.string(),
      year: z.string(),
      details: z.string().describe("Honours, GPA, relevant courses; empty string if none"),
    }),
  ),
  certifications: z.array(z.string()),
  projects: z.array(
    z.object({
      name: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  volunteer: z.array(
    z.object({
      role: z.string(),
      organization: z.string(),
      dates: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
});
export type Profile = z.infer<typeof ProfileSchema>;

export interface StoredProfile {
  profile: Profile;
  rawText: string;
  targetLevel: Level | "";
  canadianSpelling: boolean;
  updatedAt: string;
}

// ---------- Generated documents ----------

export const TailoredResumeSchema = z.object({
  keywords: z.object({
    hardSkills: z.array(z.string()),
    softSkills: z.array(z.string()),
    other: z.array(z.string()).describe("Certifications, tools, domain terms"),
  }),
  resume: ProfileSchema,
  changes: z.array(z.string()).describe("Short notes describing what was changed and why"),
  keywordsNotAdded: z
    .array(z.string())
    .describe("Job keywords left out because the candidate's real experience doesn't support them"),
});
export type TailoredResume = z.infer<typeof TailoredResumeSchema>;

export const CoverLetterSchema = z.object({
  greeting: z.string(),
  paragraphs: z.array(z.string()),
  closing: z.string().describe("e.g. 'Sincerely,'"),
});
export type CoverLetter = z.infer<typeof CoverLetterSchema>;

export const INTERVIEW_CATEGORIES = [
  "Behavioural",
  "Technical / Role-specific",
  "Situational",
  "Company & Motivation",
  "Resume Deep-dive",
  "Questions to Ask Them",
] as const;

export const InterviewSetSchema = z.object({
  questions: z.array(
    z.object({
      category: z.enum(INTERVIEW_CATEGORIES),
      question: z.string(),
      whyAsked: z.string(),
      answer: z.string().describe("Model answer in first person, using the candidate's real experience"),
      keyPoints: z.array(z.string()),
      difficulty: z.enum(["easy", "medium", "hard"]),
    }),
  ),
});
export type InterviewSet = z.infer<typeof InterviewSetSchema>;
export type InterviewQuestion = InterviewSet["questions"][number];

export type DocumentKind = "resume" | "cover" | "interview";

export interface StoredDocument {
  id: number;
  jobId: string | null;
  kind: DocumentKind;
  title: string;
  data: TailoredResume | CoverLetter | InterviewSet;
  createdAt: string;
}
