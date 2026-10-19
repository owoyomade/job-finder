import type { Job, PostedWithin } from "../types";
import { fetchWithTimeout, BROWSER_HEADERS } from "./http";

export function ageInDays(postedAt: string | null, now = Date.now()): number | null {
  if (!postedAt) return null;
  const t = Date.parse(postedAt);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}

export type AgeBucket = "fresh" | "aging" | "old" | "unknown";

export function ageBucket(postedAt: string | null, now = Date.now()): AgeBucket {
  const d = ageInDays(postedAt, now);
  if (d === null) return "unknown";
  if (d < 7) return "fresh";
  if (d <= 30) return "aging";
  return "old";
}

export function filterByAge(
  jobs: Job[],
  postedWithin: PostedWithin,
  includeUnknownDate: boolean,
  now = Date.now(),
): { kept: Job[]; hidden: number } {
  const maxDays = Number(postedWithin);
  const kept: Job[] = [];
  let hidden = 0;
  for (const j of jobs) {
    if (j.expired) {
      hidden++;
      continue;
    }
    const d = ageInDays(j.postedAt, now);
    if (d === null ? includeUnknownDate : d <= maxDays) kept.push(j);
    else hidden++;
  }
  return { kept, hidden };
}

/**
 * Parse relative dates like "3 days ago", "Posted 30+ days ago", "today",
 * "yesterday", or absolute dates like "October 16, 2026".
 */
export function parsePostedDate(text: string | null | undefined, now = Date.now()): string | null {
  if (!text) return null;
  const s = text.trim().toLowerCase();
  if (/\b(just posted|today|hours? ago|minutes? ago)\b/.test(s)) return new Date(now).toISOString();
  if (/\byesterday\b/.test(s)) return new Date(now - 86_400_000).toISOString();
  const rel = s.match(/(\d+)\+?\s*(day|week|month)s?\s*ago/);
  if (rel) {
    const n = Number(rel[1]);
    const mult = rel[2] === "day" ? 1 : rel[2] === "week" ? 7 : 30;
    return new Date(now - n * mult * 86_400_000).toISOString();
  }
  const t = Date.parse(text);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

const EXPIRED_TEXT =
  /(no longer (accepting|available|active)|this (job|position|posting) (has )?(expired|closed|been filled)|job (posting )?(has )?expired|position has been filled|posting is closed|applications? (are )?(now )?closed|n'est plus disponible|offre (a )?expirée?)/i;

/** Visit the apply URL and decide whether the posting still looks open. */
export async function checkStillOpen(url: string): Promise<{ open: boolean | null; reason: string }> {
  try {
    const res = await fetchWithTimeout(url, { headers: BROWSER_HEADERS, redirect: "follow" }, 12000);
    if (res.status === 404 || res.status === 410) return { open: false, reason: `Page returned ${res.status}` };
    if (!res.ok) return { open: null, reason: `Couldn't check (HTTP ${res.status})` };
    const html = (await res.text()).slice(0, 400_000);
    if (EXPIRED_TEXT.test(html)) return { open: false, reason: "Page says the posting is closed or expired" };
    return { open: true, reason: "Posting page is live" };
  } catch {
    return { open: null, reason: "Couldn't reach the posting page" };
  }
}
