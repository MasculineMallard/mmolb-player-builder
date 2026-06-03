import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCachedPercentiles } from "@/lib/percentile-builder";

// Daily refresh + grace window before the percentile cache is considered stale.
const PERCENTILE_STALE_MS = 36 * 60 * 60 * 1000; // 36h

export async function GET() {
  // The database is the only critical dependency: its failure returns 503.
  // MMOLB reachability and percentile freshness are informational (upstream /
  // cache state), so they annotate the response without flipping liveness — a
  // brief MMOLB outage shouldn't make the app's own health probe fail.

  let db: "ok" | "unreachable" = "ok";
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Health check DB failed:", err instanceof Error ? err.message : String(err));
    db = "unreachable";
  }

  let mmolb: "ok" | "unreachable" = "ok";
  try {
    const res = await fetch("https://mmolb.com/api/state", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) mmolb = "unreachable";
  } catch {
    mmolb = "unreachable";
  }

  const pct = getCachedPercentiles();
  let percentiles:
    | { status: "fresh" | "stale"; computedAt: string; ageHours: number }
    | { status: "none"; lastError: string | null };
  if (pct.source === "live") {
    const ageMs = Date.now() - new Date(pct.computedAt).getTime();
    percentiles = {
      status: ageMs > PERCENTILE_STALE_MS ? "stale" : "fresh",
      computedAt: pct.computedAt,
      ageHours: Math.round((ageMs / 3.6e6) * 10) / 10,
    };
  } else {
    percentiles = { status: "none", lastError: pct.lastError };
  }

  const ok = db === "ok";
  return NextResponse.json(
    { status: ok ? "ok" : "error", db, mmolb, percentiles },
    { status: ok ? 200 : 503 },
  );
}
