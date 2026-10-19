import { generateStructured, aiMockEnabled } from "./client";
import * as mock from "./mock";
import { levelGuidance } from "../jobs/level";
import {
  CoverLetterSchema,
  InterviewSetSchema,
  ProfileSchema,
  TailoredResumeSchema,
  type CoverLetter,
  type InterviewSet,
  type Level,
  type Profile,
  type TailoredResume,
} from "../types";

export interface JobContext {
  title: string;
  company: string;
  location: string;
  description: string;
}

const jobBlock = (job: JobContext) => `<job_posting>
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}

${job.description}
</job_posting>`;

const profileBlock = (p: Profile) => `<candidate_profile>
${JSON.stringify(p, null, 2)}
</candidate_profile>`;

const spelling = (canadian: boolean) =>
  canadian
    ? "Use Canadian English spelling (e.g. 'organization', 'centre', 'labour', 'analyze')."
    : "Use the spelling conventions already present in the candidate's resume.";

// ---------- Resume parsing ----------

export async function parseResume(rawText: string): Promise<Profile> {
  if (aiMockEnabled()) return mock.parseResume(rawText);
  return generateStructured({
    schema: ProfileSchema,
    effort: "low",
    system:
      "You convert resumes into structured data. Copy the candidate's content faithfully — do not rewrite, embellish or invent anything. Use empty strings or empty arrays for anything the resume doesn't include.",
    prompt: `Extract this resume into the requested structure. Keep every bullet point as written. Normalise dates to the form "Jan 2021" where possible, and use "Present" for current roles.

<resume>
${rawText}
</resume>`,
  });
}

// ---------- Resume tailoring ----------

export async function tailorResume(input: {
  profile: Profile;
  job: JobContext;
  level: Level | "";
  canadianSpelling: boolean;
  answers?: string;
}): Promise<TailoredResume> {
  if (aiMockEnabled()) return mock.tailorResume(input.profile, input.job);
  return generateStructured({
    schema: TailoredResumeSchema,
    effort: "high",
    system: `You are an expert Canadian resume writer who specialises in getting resumes through Applicant Tracking Systems (ATS) such as Workday, Taleo, Greenhouse and iCIMS.

Your job is to tailor a candidate's existing resume to one job posting. The honesty rules are absolute:
- Never invent employers, job titles, dates, degrees, certifications, tools, metrics or achievements.
- You may rephrase, reorder, merge or trim existing bullets, and surface skills that the existing content clearly demonstrates.
- If an important job keyword isn't supported by the candidate's real experience, leave it out and list it in keywordsNotAdded.

ATS guidance:
- Mirror the posting's exact wording for skills and tools the candidate genuinely has (e.g. if the posting says "Microsoft Power BI" and the resume says "PowerBI", use "Microsoft Power BI").
- Put the most relevant keywords in the summary, the skills list and the first bullets of recent roles.
- Bullets start with strong action verbs, are one to two lines, and keep any real numbers from the original.
- Order skills by relevance to the posting. Keep the skills list to roughly 10–20 items.
- No first-person pronouns in the resume. Plain text only — no emojis, symbols or special characters.
- Canadian conventions: no photo, date of birth, age, SIN, marital status or religion. Keep contact details to name, city/province, phone, email and links.`,
    prompt: `${levelGuidance(input.level)}
${spelling(input.canadianSpelling)}

${jobBlock(input.job)}

${profileBlock(input.profile)}
${input.answers ? `\n${input.answers}\n` : ""}
First identify the posting's important keywords (hard skills, soft skills, other terms like certifications or domain language). Then return the tailored resume using the same structure as the profile, keeping the candidate's name and contact details unchanged. Remove experience bullets, projects or volunteer entries that add nothing for this job if the resume would otherwise run past two pages. In "changes", briefly explain the main edits.`,
  });
}

// ---------- Cover letter ----------

export type CoverTone = "formal" | "warm" | "concise";

export async function writeCoverLetter(input: {
  profile: Profile;
  job: JobContext;
  level: Level | "";
  tone: CoverTone;
  canadianSpelling: boolean;
  extraNotes?: string;
  answers?: string;
}): Promise<CoverLetter> {
  if (aiMockEnabled()) return mock.coverLetter(input.profile, input.job);
  const toneText = {
    formal: "Professional and polished.",
    warm: "Professional but warm and personable, showing genuine enthusiasm.",
    concise: "Direct and brief — about 200 words total.",
  }[input.tone];
  return generateStructured({
    schema: CoverLetterSchema,
    effort: "medium",
    system: `You write cover letters for Canadian job applications. Use only facts from the candidate's profile — never invent experience, numbers or connections to the company. Do not use clichés like "I am writing to express my interest" or "I believe I would be a great fit". Plain text only, no markdown.`,
    prompt: `${levelGuidance(input.level)}
${spelling(input.canadianSpelling)}
Tone: ${toneText}

${jobBlock(input.job)}

${profileBlock(input.profile)}
${input.extraNotes ? `\n<candidate_notes>\n${input.extraNotes}\n</candidate_notes>\n` : ""}${input.answers ? `\n${input.answers}\n` : ""}
Write the body of a cover letter for this job, 250–350 words unless the tone says otherwise, in 3–4 paragraphs:
1. A specific opening naming the role and a concrete reason the candidate fits.
2–3. Two or three of the candidate's most relevant achievements, tied directly to the posting's requirements and using the posting's key terms naturally.
Last. Why this company/role, and a confident close inviting a conversation.
Greeting: "Dear Hiring Manager," unless the posting names a contact. Closing: a short sign-off such as "Sincerely,". Do not include addresses, dates or the signature name — those are added separately.`,
  });
}

// ---------- Interview prep ----------

export async function generateInterviewQuestions(input: {
  profile: Profile | null;
  job: JobContext;
  level: Level | "";
  count: number;
  focus?: string;
  avoid?: string[];
}): Promise<InterviewSet> {
  if (aiMockEnabled()) return mock.interview(input.job, input.count);
  return generateStructured({
    schema: InterviewSetSchema,
    effort: "medium",
    maxTokens: 64000,
    system: `You are an experienced Canadian hiring manager and interview coach. You write realistic interview questions for a specific role and strong model answers the candidate can adapt.

Answer rules:
- Write answers in the first person, as the candidate would say them out loud (roughly 120–220 words; shorter for simple questions).
- Behavioural answers use the STAR structure (Situation, Task, Action, Result) and draw on the candidate's real experience from their profile. Never invent employers, projects or numbers. Where the profile has no fitting example, write the answer as a template with clearly marked placeholders like [describe a time you…].
- Technical answers must be accurate and specific to the tools and domain in the posting.
- "Questions to Ask Them" entries: the question is what the candidate asks the interviewer; the answer explains what a good response from the employer sounds like and why the question impresses.`,
    prompt: `${levelGuidance(input.level)}

${jobBlock(input.job)}

${input.profile ? profileBlock(input.profile) : "<candidate_profile>Not provided — write answers as adaptable templates with placeholders.</candidate_profile>"}
${input.focus ? `\nFocus especially on: ${input.focus}\n` : ""}${input.avoid?.length ? `\nDo not repeat these questions already generated:\n${input.avoid.map((q) => `- ${q}`).join("\n")}\n` : ""}
Generate ${input.count} interview questions likely for this exact role, spread across all categories: Behavioural (about 30%), Technical / Role-specific (about 30%), Situational (about 15%), Company & Motivation (about 10%), Resume Deep-dive (about 10%) and Questions to Ask Them (about 5%, at least 3). Include common screening questions (e.g. "Tell me about yourself", salary expectations in a Canadian context, work authorisation) in the right categories. Mix difficulties appropriate to the level.`,
  });
}
