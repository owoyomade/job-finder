/**
 * A neutral, single-column layout shared by the DOCX and PDF exporters so both
 * files contain exactly the same ATS-friendly text in the same order.
 */
import type { CoverLetter, InterviewSet, Profile } from "../types";
import { INTERVIEW_CATEGORIES } from "../types";

export type Block =
  | { type: "name"; text: string }
  | { type: "subtitle"; text: string }
  | { type: "contact"; text: string }
  | { type: "heading"; text: string }
  | { type: "entry"; title: string; meta: string }
  | { type: "bullet"; text: string }
  | { type: "text"; text: string; bold?: boolean }
  | { type: "spacer" };

const join = (parts: (string | undefined)[], sep = " | ") => parts.map((p) => p?.trim()).filter(Boolean).join(sep);

export function contactLine(p: Profile): string {
  return join([p.location, p.phone, p.email, ...p.links]);
}

export const LICENCES_HEADING = "Licences & Certifications";

export function resumeBlocks(p: Profile, opts: { licencesFirst?: boolean } = {}): Block[] {
  const b: Block[] = [{ type: "name", text: p.name }];
  if (p.headline) b.push({ type: "subtitle", text: p.headline });
  b.push({ type: "contact", text: contactLine(p) });

  const licences = () => {
    if (!p.certifications.length) return;
    b.push({ type: "heading", text: LICENCES_HEADING });
    for (const c of p.certifications) b.push({ type: "bullet", text: c });
  };

  if (p.summary) {
    b.push({ type: "heading", text: "Summary" }, { type: "text", text: p.summary });
  }
  // Trades, healthcare, driving and similar roles screen on licences first.
  if (opts.licencesFirst) licences();
  if (p.skills.length) {
    b.push({ type: "heading", text: "Skills" }, { type: "text", text: p.skills.join(", ") });
  }
  if (p.experience.length) {
    b.push({ type: "heading", text: "Experience" });
    for (const e of p.experience) {
      b.push({
        type: "entry",
        title: join([e.title, e.company], ", "),
        meta: join([e.location, join([e.start, e.end], " – ")]),
      });
      for (const bullet of e.bullets) b.push({ type: "bullet", text: bullet });
    }
  }
  if (p.projects.length) {
    b.push({ type: "heading", text: "Projects" });
    for (const pr of p.projects) {
      b.push({ type: "entry", title: pr.name, meta: "" });
      for (const bullet of pr.bullets) b.push({ type: "bullet", text: bullet });
    }
  }
  if (p.education.length) {
    b.push({ type: "heading", text: "Education" });
    for (const e of p.education) {
      b.push({ type: "entry", title: join([e.credential, e.school], ", "), meta: join([e.location, e.year]) });
      if (e.details) b.push({ type: "text", text: e.details });
    }
  }
  if (!opts.licencesFirst) licences();
  if (p.volunteer.length) {
    b.push({ type: "heading", text: "Volunteer Experience" });
    for (const v of p.volunteer) {
      b.push({ type: "entry", title: join([v.role, v.organization], ", "), meta: v.dates });
      for (const bullet of v.bullets) b.push({ type: "bullet", text: bullet });
    }
  }
  return b;
}

export function coverLetterBlocks(
  p: Profile,
  letter: CoverLetter,
  job: { title: string; company: string; location: string },
  date = new Date(),
): Block[] {
  const dateText = date.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  return [
    { type: "name", text: p.name },
    { type: "contact", text: contactLine(p) },
    { type: "spacer" },
    { type: "text", text: dateText },
    { type: "spacer" },
    { type: "text", text: "Hiring Manager" },
    { type: "text", text: job.company },
    ...(job.location ? [{ type: "text" as const, text: job.location }] : []),
    { type: "spacer" },
    { type: "text", text: `Re: ${job.title}`, bold: true },
    { type: "spacer" },
    { type: "text", text: letter.greeting },
    ...letter.paragraphs.flatMap((t) => [{ type: "text" as const, text: t }, { type: "spacer" as const }]),
    { type: "text", text: letter.closing },
    { type: "text", text: p.name },
  ];
}

export function interviewBlocks(set: InterviewSet, job: { title: string; company: string }): Block[] {
  const b: Block[] = [
    { type: "name", text: `Interview Prep – ${job.title}` },
    { type: "contact", text: job.company },
  ];
  for (const cat of INTERVIEW_CATEGORIES) {
    const qs = set.questions.filter((q) => q.category === cat);
    if (!qs.length) continue;
    b.push({ type: "heading", text: `${cat} (${qs.length})` });
    qs.forEach((q, i) => {
      b.push({ type: "entry", title: `${i + 1}. ${q.question}`, meta: q.difficulty });
      b.push({ type: "text", text: `Why they ask: ${q.whyAsked}` });
      b.push({ type: "text", text: q.answer });
      for (const k of q.keyPoints) b.push({ type: "bullet", text: k });
      b.push({ type: "spacer" });
    });
  }
  return b;
}

export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return `\n${b.text.toUpperCase()}`;
        case "entry":
          return b.meta ? `${b.title}\n${b.meta}` : b.title;
        case "bullet":
          return `• ${b.text}`;
        case "spacer":
          return "";
        default:
          return b.text;
      }
    })
    .join("\n");
}

export function interviewMarkdown(set: InterviewSet, job: { title: string; company: string }): string {
  const lines = [`# Interview Prep – ${job.title}`, `**${job.company}**`, ""];
  for (const cat of INTERVIEW_CATEGORIES) {
    const qs = set.questions.filter((q) => q.category === cat);
    if (!qs.length) continue;
    lines.push(`## ${cat}`, "");
    qs.forEach((q, i) => {
      lines.push(`### ${i + 1}. ${q.question}`, `*Difficulty: ${q.difficulty}* · *Why they ask:* ${q.whyAsked}`, "", q.answer, "");
      lines.push(...q.keyPoints.map((k) => `- ${k}`), "");
    });
  }
  return lines.join("\n");
}
