/**
 * Sample outputs used when AI_MOCK=1 or no ANTHROPIC_API_KEY is set, so the
 * whole app can be tried without spending API credits. Clearly labelled in the UI.
 */
import { extractKeywords, profileToText } from "../match";
import {
  INTERVIEW_CATEGORIES,
  type CoverLetter,
  type InterviewSet,
  type Profile,
  type TailoredResume,
} from "../types";
import type { JobContext } from "./tasks";

export function parseResume(rawText: string): Profile {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const email = rawText.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? "";
  const phone = rawText.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0] ?? "";
  const bullets = lines.filter((l) => /^[-•*▪◦]/.test(l)).map((l) => l.replace(/^[-•*▪◦]\s*/, ""));
  return {
    name: lines[0] ?? "Your Name",
    headline: lines[1] && !lines[1].includes("@") ? lines[1] : "",
    email,
    phone,
    location: rawText.match(/\b[A-Z][a-z]+,\s*(ON|BC|AB|QC|MB|SK|NS|NB|NL|PE|YT|NT|NU)\b/)?.[0] ?? "",
    links: [...rawText.matchAll(/https?:\/\/\S+|linkedin\.com\/\S+/g)].map((m) => m[0]),
    summary: "",
    experience: bullets.length
      ? [{ title: "Your role", company: "Your company", location: "", start: "", end: "Present", bullets }]
      : [],
    skills: extractKeywords(rawText, 15),
    education: [],
    certifications: [],
    projects: [],
    volunteer: [],
  };
}

export function tailorResume(profile: Profile, job: JobContext): TailoredResume {
  const keywords = extractKeywords(job.description, 20);
  const resumeText = profileToText(profile).toLowerCase();
  const supported = keywords.filter((k) => resumeText.includes(k));
  const notAdded = keywords.filter((k) => !resumeText.includes(k));
  const skills = [
    ...supported,
    ...profile.skills.filter((s) => !supported.includes(s.toLowerCase())),
  ];
  return {
    keywords: { hardSkills: keywords.slice(0, 12), softSkills: [], other: keywords.slice(12) },
    resume: {
      ...profile,
      headline: job.title,
      summary:
        `[Sample mode] ${profile.headline || "Professional"} targeting the ${job.title} role at ${job.company.replace(/\.$/, "")}. ` +
        (profile.summary || "Add your ANTHROPIC_API_KEY to get a real tailored summary."),
      skills,
    },
    changes: [
      "Sample mode: skills reordered so the posting's keywords you already have come first.",
      "Add ANTHROPIC_API_KEY in .env.local for real AI tailoring of your summary and bullets.",
    ],
    keywordsNotAdded: notAdded,
  };
}

export function coverLetter(profile: Profile, job: JobContext): CoverLetter {
  return {
    greeting: "Dear Hiring Manager,",
    paragraphs: [
      `[Sample mode] I'm applying for the ${job.title} position at ${job.company.replace(/\.$/, "")}. My background as ${profile.headline || "a professional in this field"} lines up closely with what your team is looking for.`,
      `In my recent work I have ${profile.experience[0]?.bullets[0]?.replace(/^\w/, (c) => c.toLowerCase()) ?? "delivered results that match this role's requirements"}.`,
      "Add your ANTHROPIC_API_KEY in .env.local to generate a complete, tailored letter.",
      `I would welcome the chance to discuss how I can contribute to ${job.company}. Thank you for your time and consideration.`,
    ],
    closing: "Sincerely,",
  };
}

export function interview(job: JobContext, count: number): InterviewSet {
  const base = [
    ["Behavioural", "Tell me about yourself."],
    ["Behavioural", "Describe a time you handled a difficult stakeholder."],
    ["Technical / Role-specific", `What tools would you use day to day as a ${job.title}, and why?`],
    ["Situational", "What would you do in your first 90 days in this role?"],
    ["Company & Motivation", `Why do you want to work at ${job.company}?`],
    ["Resume Deep-dive", "Walk me through your most recent role."],
    ["Questions to Ask Them", "What does success look like in this role after six months?"],
  ] as const;
  return {
    questions: Array.from({ length: Math.min(count, base.length) }, (_, i) => ({
      category: base[i][0] as (typeof INTERVIEW_CATEGORIES)[number],
      question: base[i][1],
      whyAsked: "[Sample mode] Add ANTHROPIC_API_KEY for real, role-specific reasoning.",
      answer:
        "[Sample mode] This is placeholder text. With an API key, you'll get a first-person model answer built from your real experience, using the STAR method for behavioural questions.",
      keyPoints: ["Be specific", "Quantify results", "Tie back to the role"],
      difficulty: "medium" as const,
    })),
  };
}
