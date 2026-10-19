import { describe, expect, it, vi } from "vitest";
import { alertDue, localTime } from "./alerts";

const prefs = { alertsEnabled: true, alertHour: 8, alertTimezone: "America/Toronto" };

describe("alert timing", () => {
  it("reads the local date and hour in a Canadian time zone", () => {
    // 12:30 UTC on Oct 19 = 8:30 in Toronto (EDT), 5:30 in Vancouver (PDT)
    const at = new Date("2026-10-19T12:30:00Z");
    expect(localTime("America/Toronto", at)).toEqual({ date: "2026-10-19", hour: 8 });
    expect(localTime("America/Vancouver", at)).toEqual({ date: "2026-10-19", hour: 5 });
  });

  it("is due once a day, after the chosen hour", () => {
    const before = new Date("2026-10-19T11:30:00Z"); // 7:30 Toronto
    const after = new Date("2026-10-19T12:30:00Z"); // 8:30 Toronto
    expect(alertDue(prefs, {}, before)).toBe(false);
    expect(alertDue(prefs, {}, after)).toBe(true);
    expect(alertDue(prefs, { lastRunDate: "2026-10-19" }, after)).toBe(false);
    expect(alertDue(prefs, { lastRunDate: "2026-10-18" }, after)).toBe(true);
    expect(alertDue({ ...prefs, alertsEnabled: false }, {}, after)).toBe(false);
  });
});

describe("daily alert", () => {
  it("only counts jobs never shown before, and runs without devices", async () => {
    vi.stubEnv("JOBFINDER_DB", ":memory:");
    vi.stubEnv("JOBS_MOCK", "1");
    vi.resetModules();
    const db = await import("./db");
    const alerts = await import("./alerts");

    db.setSetting("lastSearch", {
      query: "Electrician", location: "", level: "", remoteOnly: false, postedWithin: "30",
      employmentType: "", governmentOnly: false, includeUnknownDate: false, sources: [],
    });
    const first = await alerts.runDailyAlert();
    expect(first.lastError).toBeUndefined();
    expect(first.lastNewCount).toBeGreaterThan(0);

    // Same jobs the next day: nothing new.
    const second = await alerts.runDailyAlert();
    expect(second.lastNewCount).toBe(0);
    expect(alerts.getAlertState().lastRunDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    vi.unstubAllEnvs();
  });

  it("explains when there is no search yet", async () => {
    vi.stubEnv("JOBFINDER_DB", ":memory:");
    vi.resetModules();
    const alerts = await import("./alerts");
    expect((await alerts.runDailyAlert()).lastError).toMatch(/No search yet/);
    vi.unstubAllEnvs();
  });
});

describe("couldn't apply", () => {
  it("keeps the reason in the application history", async () => {
    vi.stubEnv("JOBFINDER_DB", ":memory:");
    vi.resetModules();
    const db = await import("./db");
    const j = db.createManualJob({ title: "Cook", company: "Diner", location: "Ottawa, ON", description: "Line cook needed", applyUrl: "" });
    db.setApplicationStatus(j.id, "ready");
    const app = db.setApplicationStatus(j.id, "couldnt_apply", "Needed an account or login");
    expect(app.status).toBe("couldnt_apply");
    expect(app.history.at(-1)).toMatchObject({ status: "couldnt_apply", note: "Needed an account or login" });
    vi.unstubAllEnvs();
  });
});
