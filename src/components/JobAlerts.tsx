"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { disablePush, enablePush, pushSupport, type PushSupport } from "@/lib/pushClient";
import { CANADIAN_TIMEZONES, type AlertState, type Prefs } from "@/lib/types";
import { Button, ErrorNote, cx, inputClass } from "./ui";

const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });

/** Daily new-job notifications. */
export function JobAlerts({ prefs, onChange }: { prefs: Prefs; onChange: (patch: Partial<Prefs>) => Promise<void> }) {
  const [support, setSupport] = useState<PushSupport>("supported");
  const [state, setState] = useState<AlertState>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setSupport(pushSupport()); // eslint-disable-line react-hooks/set-state-in-effect -- reads the browser once
    api<{ state: AlertState }>("/api/alerts").then((r) => setState(r.state)).catch(() => {});
  }, []);

  async function toggle(on: boolean) {
    setError(null);
    setNote(null);
    setBusy("toggle");
    try {
      if (on) {
        await enablePush();
        await onChange({ alertsEnabled: true });
        // Start fresh: only jobs posted after today count as new.
        await api("/api/alerts", { method: "POST", json: { action: "seed" } });
        setNote(`Done. You’ll get new jobs every day around ${hourLabel(prefs.alertHour)}.`);
      } else {
        await disablePush();
        await onChange({ alertsEnabled: false });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setError(null);
    setBusy("test");
    try {
      await api("/api/push/test", { method: "POST" });
      setNote("Test notification sent. It should appear in a few seconds.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function checkNow() {
    setError(null);
    setBusy("check");
    try {
      const r = await api<{ state: AlertState }>("/api/alerts", { method: "POST", json: { action: "run" } });
      setState(r.state);
      setNote(
        r.state.lastError
          ? null
          : r.state.lastNewCount
            ? `Found ${r.state.lastNewCount} new job${r.state.lastNewCount === 1 ? "" : "s"}. Check your notifications.`
            : "No new jobs since the last check.",
      );
      if (r.state.lastError) setError(r.state.lastError);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
      <h3 className="font-display text-base font-semibold">Daily new-job alerts</h3>
      <p className="mt-1 text-sm text-muted">
        Once a day, get a notification on this device with jobs from your current search that you haven’t seen yet.
      </p>

      {support === "needs-install" && (
        <p className="mt-3 rounded-md bg-amber-soft px-3 py-2 text-sm">
          On iPhone, first add Job Finder to your Home Screen (Share → Add to Home Screen), open it from there, then
          turn alerts on.
        </p>
      )}
      {support === "unsupported" && (
        <p className="mt-3 rounded-md bg-sunken px-3 py-2 text-sm">This browser can’t receive notifications.</p>
      )}

      {support === "supported" && (
        <>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.alertsEnabled}
              disabled={busy === "toggle"}
              onChange={(e) => toggle(e.target.checked)}
            />
            Send me new jobs every day
          </label>

          <div className={cx("mt-3 flex flex-wrap gap-3", !prefs.alertsEnabled && "opacity-50")}>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Time</span>
              <select
                className={cx(inputClass, "w-auto")}
                value={prefs.alertHour}
                disabled={!prefs.alertsEnabled}
                onChange={(e) => onChange({ alertHour: Number(e.target.value) })}
              >
                {Array.from({ length: 18 }, (_, i) => i + 5).map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Time zone</span>
              <select
                className={cx(inputClass, "w-auto")}
                value={prefs.alertTimezone}
                disabled={!prefs.alertsEnabled}
                onChange={(e) => onChange({ alertTimezone: e.target.value })}
              >
                {CANADIAN_TIMEZONES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {prefs.alertsEnabled && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" busy={busy === "test"} onClick={test}>
                Send a test notification
              </Button>
              <Button variant="ghost" busy={busy === "check"} onClick={checkNow}>
                Check for new jobs now
              </Button>
            </div>
          )}
        </>
      )}

      <div className="mt-3 space-y-2">
        <ErrorNote message={error} />
        {note && (
          <p className="text-sm text-spruce" role="status">
            {note}
          </p>
        )}
        {state.lastRunAt && (
          <p className="text-xs text-muted">
            Last checked {new Date(state.lastRunAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
            {typeof state.lastNewCount === "number" && `: ${state.lastNewCount} new`}
          </p>
        )}
      </div>
    </div>
  );
}
