export async function register() {
  // Only in the long-running Node server, never while building.
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { startScheduler } = await import("./lib/scheduler");
  startScheduler();
}
