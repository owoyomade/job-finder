/**
 * Sprout-style "a few quick questions" before preparing an application. Built
 * locally from the keywords the resume is missing, so it costs nothing and
 * every answer is something the candidate actually said.
 */
import { matchResume } from "./match";
import type { Application, Job, JobQuestion } from "./types";

const pretty = (k: string) =>
  k.length <= 4 && !k.includes(" ") ? k.toUpperCase() : k.replace(/\b\w/g, (c) => c.toUpperCase());

/** Licences, tickets, registrations and clearances: things you hold rather than use. */
const CREDENTIAL =
  /(licen[cs]e|certif|ticket|red seal|registration|clearance|enhanced reliability|smart serve|food handler|whmis|first aid|\bcpr\b|\bbls\b|\bacls\b|\bpals\b|\baz\b|\bdz\b|class [1-5]|\bg2?\b|air brake|cvor|\brn\b|\brpn\b|\bpsw\b|\blpn\b|\boct\b|\brece\b|\bcpa\b|\bpmp\b|p\.eng|\b\d{3}a\b|journey|vulnerable sector|abstract)/i;

export function isCredential(keyword: string): boolean {
  return CREDENTIAL.test(keyword);
}

const HINT = "Leave blank if not. Nothing will be made up.";

function keywordQuestion(k: string): JobQuestion {
  const name = pretty(k);
  if (/journey/i.test(k)) {
    return { id: `kw:${k}`, question: "Are you a certified journeyperson? If so, in which trade and province?", hint: HINT };
  }
  if (isCredential(k)) {
    return {
      id: `kw:${k}`,
      question: `Do you hold a valid ${name}? If so, add any details (level, number, expiry, province).`,
      hint: HINT,
    };
  }
  return { id: `kw:${k}`, question: `Do you have experience with ${name}? If so, where and what did you do?`, hint: HINT };
}

/** Red Seal and a trade code (309A, 442A…) are the same certificate: ask once. */
function mergeTradeCertificate(keywords: string[]): string[] {
  const code = keywords.find((k) => /^\d{3}a$/i.test(k));
  if (!code || !keywords.includes("red seal")) return keywords;
  return keywords.filter((k) => k !== code).map((k) => (k === "red seal" ? `${code.toUpperCase()} Red Seal` : k));
}

export function buildJobQuestions(job: Job, resumeText: string | null): JobQuestion[] {
  const qs: JobQuestion[] = [];
  if (resumeText && job.description) {
    const { missing } = matchResume(resumeText, job.description);
    // Ask about required credentials first; they often decide who gets an interview.
    const merged = mergeTradeCertificate(missing);
    const ordered = [...merged.filter(isCredential), ...merged.filter((k) => !isCredential(k))];
    for (const k of ordered.slice(0, 3)) qs.push(keywordQuestion(k));
  }
  if (job.levelFit === "stretch") {
    qs.push({
      id: "stretch",
      question: "This role asks for a bit more experience than your target level. Anything extra worth highlighting?",
      hint: "Training others, acting in a senior role, extra responsibilities, volunteer work",
    });
  }
  qs.push({
    id: "why",
    question: `What draws you to this role${job.company ? ` at ${job.company}` : ""}?`,
    hint: "One sentence is plenty. It goes into your cover letter.",
  });
  return qs;
}

/** Format answered questions for the AI prompts; blanks and "no" answers are dropped. */
export function answersBlock(answers: Application["answers"] | undefined): string {
  const useful = (answers ?? []).filter((a) => a.answer.trim() && !/^(no|nope|n\/a|none|not really)\.?$/i.test(a.answer.trim()));
  if (!useful.length) return "";
  return `<candidate_answers>
These are additional facts the candidate confirmed for this specific job. Treat them as true and use them where relevant.
${useful.map((a) => `Q: ${a.question}\nA: ${a.answer.trim()}`).join("\n\n")}
</candidate_answers>`;
}
