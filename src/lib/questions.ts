/**
 * Sprout-style "a few quick questions" before preparing an application. Built
 * locally from the keywords the resume is missing, so it costs nothing and
 * every answer is something the candidate actually said.
 */
import { matchResume } from "./match";
import type { Application, Job, JobQuestion } from "./types";

const pretty = (k: string) =>
  k.length <= 4 && !k.includes(" ") ? k.toUpperCase() : k.replace(/\b\w/g, (c) => c.toUpperCase());

export function buildJobQuestions(job: Job, resumeText: string | null): JobQuestion[] {
  const qs: JobQuestion[] = [];
  if (resumeText && job.description) {
    const { missing } = matchResume(resumeText, job.description);
    for (const k of missing.slice(0, 3)) {
      qs.push({
        id: `kw:${k}`,
        question: `Have you used ${pretty(k)}? If so, where and what did you do with it?`,
        hint: "Leave blank if not. Nothing will be made up.",
      });
    }
  }
  if (job.levelFit === "stretch") {
    qs.push({
      id: "stretch",
      question: "This role asks for a bit more experience than your target level. Anything extra worth highlighting?",
      hint: "Side projects, acting-lead work, bigger responsibilities",
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
