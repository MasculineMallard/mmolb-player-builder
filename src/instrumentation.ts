/**
 * Next.js instrumentation hook — runs once at server boot.
 *
 * Starts the live-percentile auto-refresh scheduler in the Node.js runtime only.
 * Guarding on NEXT_RUNTIME keeps the fs-using percentile module out of the Edge
 * runtime bundle (the dynamic import only loads it server-side).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPercentileScheduler } = await import("@/lib/percentile-builder");
    startPercentileScheduler();
  }
}
