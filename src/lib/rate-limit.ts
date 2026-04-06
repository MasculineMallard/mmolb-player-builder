import { NextResponse } from "next/server";

const hitCounts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_HITS = 60;      // 60 requests per minute per IP

let lastPrune = Date.now();

export function checkRateLimit(ip: string): NextResponse | null {
  const now = Date.now();

  // Prune expired entries every 5 minutes
  if (now - lastPrune > 5 * 60_000) {
    for (const [key, val] of hitCounts) {
      if (val.resetAt <= now) hitCounts.delete(key);
    }
    lastPrune = now;
  }

  const entry = hitCounts.get(ip);

  if (!entry || entry.resetAt <= now) {
    hitCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  entry.count++;
  if (entry.count > MAX_HITS) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)) } }
    );
  }

  return null;
}
