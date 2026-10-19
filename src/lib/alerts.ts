/**
 * Daily new-job alerts: once a day, at the chosen local hour, run the last
 * search and send a push notification about jobs you've never been shown.
 */
import * as db from "./db";
import { getPrefs, runSearch } from "./service";
import { sendPush } from "./push";
import type { AlertState, SearchParams } from "./types";

/** Date and hour in a given time zone, e.g. { date: "2026-10-19", hour: 8 }. */
export function localTime(timeZone: string, at = new Date()): { date: string; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export function alertDue(
  prefs: { alertsEnabled: boolean; alertHour: number; alertTimezone: string },
  state: AlertState,
  at = new Date(),
): boolean {
  if (!prefs.alertsEnabled) return false;
  const { date, hour } = localTime(prefs.alertTimezone, at);
  return hour >= prefs.alertHour && state.lastRunDate !== date;
}

export function getAlertState(): AlertState {
  return db.getSetting<AlertState>("alertState") ?? {};
}

/** Mark everything in the current search as already seen (used when alerts are switched on). */
export async function seedSeenJobs() {
  const params = db.getSetting<SearchParams>("lastSearch");
  if (!params) return;
  const result = await runSearch(params);
  db.markJobsSeen(result.jobs.map((j) => j.id));
}

export async function runDailyAlert(): Promise<AlertState> {
  const prefs = getPrefs();
  const { date } = localTime(prefs.alertTimezone);
  const state: AlertState = { lastRunDate: date, lastRunAt: new Date().toISOString(), lastNewCount: 0 };
  try {
    const params = db.getSetting<SearchParams>("lastSearch");
    if (!params) {
      state.lastError = "No search yet. Run a search in Discover first.";
    } else {
      const result = await runSearch(params);
      const unseen = result.jobs.filter((j) => !j.applicationStatus);
      const freshIds = new Set(db.markJobsSeen(unseen.map((j) => j.id)));
      const fresh = unseen.filter((j) => freshIds.has(j.id));
      state.lastNewCount = fresh.length;
      if (fresh.length) {
        const where = params.location ? ` near ${params.location}` : "";
        await sendPush({
          title: `${fresh.length} new ${params.query} job${fresh.length === 1 ? "" : "s"}${where}`,
          body: fresh
            .slice(0, 3)
            .map((j) => `${j.title} – ${j.company}`)
            .join("\n"),
          url: "/discover",
          tag: "daily-jobs",
        });
      }
    }
  } catch (err) {
    state.lastError = err instanceof Error ? err.message : String(err);
  }
  db.setSetting("alertState", state);
  return state;
}
