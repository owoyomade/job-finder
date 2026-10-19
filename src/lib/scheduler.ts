/** Background timer started once per server (see src/instrumentation.ts). */
import { alertDue, getAlertState, runDailyAlert } from "./alerts";
import { getPrefs } from "./service";

const CHECK_EVERY_MS = 10 * 60 * 1000;
let started = false;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    if (alertDue(getPrefs(), getAlertState())) await runDailyAlert();
  } catch (err) {
    console.error("daily alert failed", err);
  } finally {
    running = false;
  }
}

export function startScheduler() {
  if (started) return;
  started = true;
  setTimeout(tick, 60 * 1000);
  setInterval(tick, CHECK_EVERY_MS).unref();
}
