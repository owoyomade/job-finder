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

/** How hiring differs across fields; used by the resume, cover letter and interview prompts. */
const FIELD_GUIDANCE = `This app serves every career path, so adapt to the norms of the posting's field:
- Skilled trades and construction (electricians, plumbers, welders, millwrights, carpenters, HVAC): tickets and licences (Red Seal, 309A, 442A), equipment and tools, codes, safety training (WHMIS, fall protection, lockout/tagout) and safety record.
- Transportation and warehouse: licence class (AZ/DZ/G, Class 1/3), air brake endorsement, clean abstract, equipment certifications (forklift), hours-of-service compliance, reliability.
- Healthcare and community services (RN, RPN, PSW, social services): current registration with the regulatory college, clinical settings and patient populations, certifications (BLS, CPR, CPI), charting systems, patient safety.
- Education and childcare: OCT/RECE status, age groups and settings, classroom management, curriculum, vulnerable sector check.
- Hospitality, food service and retail: food handler and Smart Serve certificates, POS and cash handling, service quality, speed and accuracy, availability (evenings, weekends).
- Government of Canada and other public sector: mirror the essential and asset qualifications and the competencies in the poster; give clear, specific evidence for each; mention language profile (e.g. BBB/CBC) and security clearance only when the candidate has them.
- Office, finance, sales, marketing, creative and tech: tools, measurable results, portfolio or project work.
Use the vocabulary of the posting's own field. Never assume the role is an office job.`;

// ---------- Resume parsing ----------

export async function parseResume(rawText: string): Promise<Profile> {
  if (aiMockEnabled()) return mock.parseResume(rawText);
  return generateStructured({
    schema: ProfileSchema,
    effort: "low",
    system:
      "You convert resumes from any career field (trades, healthcare, education, hospitality, office, tech, government and more) into structured data. Copy the candidate's content faithfully — do not rewrite, embellish or invent anything. Use empty strings or empty arrays for anything the resume doesn't include. Put licences, tickets, registrations, clearances and certificates in certifications, keeping any numbers or expiry dates exactly as written. Never add a SIN, date of birth or other sensitive personal identifiers even if they appear.",
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
    system: `You are an expert Canadian resume writer for every career path, from skilled trades and healthcare to hospitality, government and tech. You specialise in getting resumes through Applicant Tracking Systems (ATS) such as Workday, Taleo, Greenhouse, iCIMS and the Government of Canada's GC Jobs.

${FIELD_GUIDANCE}

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
- Canadian conventions: no photo, date of birth, age, SIN, marital status or religion. Keep contact details to name, city/province, phone, email and links.
- If the posting requires licences, tickets, registrations, clearances or certificates that the candidate holds, set licencesFirst to true so they appear right after the summary, and name them exactly as the posting does. Otherwise set licencesFirst to false.`,
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
    system: `You write cover letters for Canadian job applications in every field, from trades and healthcare to hospitality, government and tech.

${FIELD_GUIDANCE}

Match the letter to the field: for hourly, frontline, trades and service roles keep it short (150–220 words) in plain, direct language that leads with licences, availability and reliability; for professional and public-sector roles use the fuller format. Use only facts from the candidate's profile — never invent experience, numbers or connections to the company. Do not use clichés like "I am writing to express my interest" or "I believe I would be a great fit". Plain text only, no markdown.`,
    prompt: `${levelGuidance(input.level)}
${spelling(input.canadianSpelling)}
Tone: ${toneText}

${jobBlock(input.job)}

${profileBlock(input.profile)}
${input.extraNotes ? `\n<candidate_notes>\n${input.extraNotes}\n</candidate_notes>\n` : ""}${input.answers ? `\n${input.answers}\n` : ""}
Write the body of a cover letter for this job, 250–350 words (shorter for hourly, frontline and trades roles, or if the tone says so), in 3–4 paragraphs:
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
    system: `You are an experienced Canadian hiring manager and interview coach for every career path, from skilled trades and healthcare to hospitality, education, government and tech. You write realistic interview questions for a specific role and strong model answers the candidate can adapt.

${FIELD_GUIDANCE}

For the "Technical / Role-specific" category, ask what interviewers in that field really ask: trades — safety procedures, codes, tools, troubleshooting scenarios; healthcare — clinical scenarios, patient safety, scope of practice, difficult families; education — classroom management, supporting diverse learners; hospitality and retail — service recovery, rushes, cash and safety; transportation — safe driving, inspections, delays; government — competency-based questions tied to the poster's qualifications; sales — targets and pipeline; office and tech — tools and problem-solving.

Answer rules:
- Write answers in the first person, as the candidate would say them out loud (roughly 120–220 words; shorter for simple questions).
- Behavioural answers use the STAR structure (Situation, Task, Action, Result) and draw on the candidate's real experience from their profile. Never invent employers, projects or numbers. Where the profile has no fitting example, write the answer as a template with clearly marked placeholders like [describe a time you…].
- Technical answers must be accurate and specific to the tools and domain in the posting.
- "Questions to Ask Them" entries: the question is what the candidate asks the interviewer; the answer explains what a good response from the employer sounds like and why the question impresses.`,
    prompt: `${levelGuidance(input.level)}

${jobBlock(input.job)}

${input.profile ? profileBlock(input.profile) : "<candidate_profile>Not provided — write answers as adaptable templates with placeholders.</candidate_profile>"}
${input.focus ? `\nFocus especially on: ${input.focus}\n` : ""}${input.avoid?.length ? `\nDo not repeat these questions already generated:\n${input.avoid.map((q) => `- ${q}`).join("\n")}\n` : ""}
Generate ${input.count} interview questions likely for this exact role, spread across all categories: Behavioural (about 30%), Technical / Role-specific (about 30%), Situational (about 15%), Company & Motivation (about 10%), Resume Deep-dive (about 10%) and Questions to Ask Them (about 5%, at least 3). Include common screening questions (e.g. "Tell me about yourself", salary or hourly-rate expectations in a Canadian context, work authorisation, and availability, shifts or travel where relevant) in the right categories. Mix difficulties appropriate to the level.`,
  });
}
