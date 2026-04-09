/**
 * Static reference data for the roster evaluator.
 * Stat tiers from S10 regression analysis (Bagyilisk).
 * Percentile tables from early S11 league data.
 */

import type { PercentileEntry, PlayerRole } from "./evaluator-types";
import type { Archetype } from "./types";
import { createJsonCache, isNonArrayObject } from "./json-cache";
import { BASE_PATH } from "./constants";

// ---------------------------------------------------------------------------
// Stat Tiers (from S10 regression — which stats actually matter)
// ---------------------------------------------------------------------------

export const STAT_TIERS: Record<PlayerRole, { T1: string[]; T2: string[]; T3: string[] }> = {
  batter: {
    T1: ["discipline", "contact", "muscle", "intimidation", "lift"],
    T2: ["aiming", "vision", "determination", "insight", "performance", "speed"],
    T3: ["cunning", "selflessness", "wisdom"],
  },
  pitcher: {
    T1: ["velocity", "control", "rotation", "stuff", "deception"],
    T2: ["presence", "guts", "persuasion", "stamina"],
    T3: ["accuracy", "intuition", "defiance"],
  },
};

/** All role-relevant stat names (batting or pitching 12). */
export const ROLE_STATS: Record<PlayerRole, string[]> = {
  batter: [
    "discipline", "contact", "muscle", "intimidation", "lift",
    "aiming", "vision", "determination", "insight", "performance", "speed",
    "cunning", "selflessness", "wisdom",
  ],
  pitcher: [
    "velocity", "control", "rotation", "stuff", "deception",
    "presence", "guts", "persuasion", "stamina",
    "accuracy", "intuition", "defiance",
  ],
};

// ---------------------------------------------------------------------------
// Batting Percentile Tables (Top X% format: pct=5 = elite, pct=95 = bottom)
// Higher value = better for all except K_PCT
// ---------------------------------------------------------------------------

export const BATTING_PERCENTILES: Record<string, PercentileEntry[]> = {
  AVG: [
    { pct: 5, value: .347 }, { pct: 10, value: .328 }, { pct: 15, value: .316 },
    { pct: 20, value: .306 }, { pct: 25, value: .298 }, { pct: 30, value: .290 },
    { pct: 35, value: .283 }, { pct: 40, value: .277 }, { pct: 45, value: .270 },
    { pct: 50, value: .264 }, { pct: 55, value: .258 }, { pct: 60, value: .252 },
    { pct: 65, value: .246 }, { pct: 70, value: .240 }, { pct: 75, value: .233 },
    { pct: 80, value: .226 }, { pct: 85, value: .217 }, { pct: 90, value: .207 },
    { pct: 95, value: .191 },
  ],
  OBP: [
    { pct: 5, value: .407 }, { pct: 10, value: .391 }, { pct: 15, value: .380 },
    { pct: 20, value: .371 }, { pct: 25, value: .364 }, { pct: 30, value: .358 },
    { pct: 35, value: .352 }, { pct: 40, value: .346 }, { pct: 45, value: .340 },
    { pct: 50, value: .335 }, { pct: 55, value: .329 }, { pct: 60, value: .324 },
    { pct: 65, value: .318 }, { pct: 70, value: .312 }, { pct: 75, value: .305 },
    { pct: 80, value: .299 }, { pct: 85, value: .290 }, { pct: 90, value: .279 },
    { pct: 95, value: .264 },
  ],
  SLG: [
    { pct: 5, value: .622 }, { pct: 10, value: .578 }, { pct: 15, value: .546 },
    { pct: 20, value: .523 }, { pct: 25, value: .504 }, { pct: 30, value: .489 },
    { pct: 35, value: .474 }, { pct: 40, value: .460 }, { pct: 45, value: .447 },
    { pct: 50, value: .434 }, { pct: 55, value: .421 }, { pct: 60, value: .410 },
    { pct: 65, value: .397 }, { pct: 70, value: .385 }, { pct: 75, value: .372 },
    { pct: 80, value: .357 }, { pct: 85, value: .339 }, { pct: 90, value: .318 },
    { pct: 95, value: .289 },
  ],
  OPS: [
    { pct: 5, value: 1.008 }, { pct: 10, value: .956 }, { pct: 15, value: .916 },
    { pct: 20, value: .888 }, { pct: 25, value: .864 }, { pct: 30, value: .842 },
    { pct: 35, value: .823 }, { pct: 40, value: .803 }, { pct: 45, value: .788 },
    { pct: 50, value: .771 }, { pct: 55, value: .753 }, { pct: 60, value: .735 },
    { pct: 65, value: .718 }, { pct: 70, value: .702 }, { pct: 75, value: .684 },
    { pct: 80, value: .662 }, { pct: 85, value: .639 }, { pct: 90, value: .611 },
    { pct: 95, value: .567 },
  ],
  // K%: lower value = better (top 5% K% is 13.8%)
  K_PCT: [
    { pct: 5, value: 13.8 }, { pct: 10, value: 15.4 }, { pct: 15, value: 16.4 },
    { pct: 20, value: 17.3 }, { pct: 25, value: 18.1 }, { pct: 30, value: 18.8 },
    { pct: 35, value: 19.4 }, { pct: 40, value: 20.0 }, { pct: 45, value: 20.6 },
    { pct: 50, value: 21.1 }, { pct: 55, value: 21.7 }, { pct: 60, value: 22.3 },
    { pct: 65, value: 22.9 }, { pct: 70, value: 23.5 }, { pct: 75, value: 24.2 },
    { pct: 80, value: 25.0 }, { pct: 85, value: 25.9 }, { pct: 90, value: 27.0 },
    { pct: 95, value: 28.9 },
  ],
  BB_PCT: [
    { pct: 5, value: 15.8 }, { pct: 10, value: 14.5 }, { pct: 15, value: 13.6 },
    { pct: 20, value: 13.0 }, { pct: 25, value: 12.4 }, { pct: 30, value: 11.9 },
    { pct: 35, value: 11.5 }, { pct: 40, value: 11.1 }, { pct: 45, value: 10.8 },
    { pct: 50, value: 10.4 }, { pct: 55, value: 10.1 }, { pct: 60, value: 9.7 },
    { pct: 65, value: 9.3 }, { pct: 70, value: 8.9 }, { pct: 75, value: 8.4 },
    { pct: 80, value: 8.0 }, { pct: 85, value: 7.4 }, { pct: 90, value: 6.8 },
    { pct: 95, value: 5.9 },
  ],
  // SB%: higher = better. Estimated from S11 steal attempts (players with >= 5 attempts).
  SB_PCT: [
    { pct: 5, value: 0.95 }, { pct: 10, value: 0.90 }, { pct: 15, value: 0.86 },
    { pct: 20, value: 0.83 }, { pct: 25, value: 0.80 }, { pct: 30, value: 0.78 },
    { pct: 35, value: 0.75 }, { pct: 40, value: 0.73 }, { pct: 45, value: 0.71 },
    { pct: 50, value: 0.69 }, { pct: 55, value: 0.67 }, { pct: 60, value: 0.64 },
    { pct: 65, value: 0.61 }, { pct: 70, value: 0.58 }, { pct: 75, value: 0.55 },
    { pct: 80, value: 0.50 }, { pct: 85, value: 0.44 }, { pct: 90, value: 0.38 },
    { pct: 95, value: 0.28 },
  ],
};

// ---------------------------------------------------------------------------
// Pitching Percentile Tables
// Lower value = better for ERA, BB9, H9, HR9, WHIP
// Higher value = better for K9
// ---------------------------------------------------------------------------

export const PITCHING_PERCENTILES: Record<string, PercentileEntry[]> = {
  ERA: [
    { pct: 5, value: 2.34 }, { pct: 10, value: 2.78 }, { pct: 15, value: 3.11 },
    { pct: 20, value: 3.35 }, { pct: 25, value: 3.61 }, { pct: 30, value: 3.82 },
    { pct: 35, value: 4.02 }, { pct: 40, value: 4.25 }, { pct: 45, value: 4.44 },
    { pct: 50, value: 4.66 }, { pct: 55, value: 4.87 }, { pct: 60, value: 5.06 },
    { pct: 65, value: 5.31 }, { pct: 70, value: 5.59 }, { pct: 75, value: 5.87 },
    { pct: 80, value: 6.27 }, { pct: 85, value: 6.70 }, { pct: 90, value: 7.36 },
    { pct: 95, value: 8.59 },
  ],
  BB9: [
    { pct: 5, value: 1.80 }, { pct: 10, value: 2.21 }, { pct: 15, value: 2.45 },
    { pct: 20, value: 2.66 }, { pct: 25, value: 2.83 }, { pct: 30, value: 3.00 },
    { pct: 35, value: 3.16 }, { pct: 40, value: 3.32 }, { pct: 45, value: 3.47 },
    { pct: 50, value: 3.63 }, { pct: 55, value: 3.78 }, { pct: 60, value: 3.94 },
    { pct: 65, value: 4.11 }, { pct: 70, value: 4.30 }, { pct: 75, value: 4.50 },
    { pct: 80, value: 4.74 }, { pct: 85, value: 5.01 }, { pct: 90, value: 5.36 },
    { pct: 95, value: 6.00 },
  ],
  H9: [
    { pct: 5, value: 6.02 }, { pct: 10, value: 6.66 }, { pct: 15, value: 7.09 },
    { pct: 20, value: 7.41 }, { pct: 25, value: 7.71 }, { pct: 30, value: 7.96 },
    { pct: 35, value: 8.20 }, { pct: 40, value: 8.44 }, { pct: 45, value: 8.69 },
    { pct: 50, value: 9.00 }, { pct: 55, value: 9.18 }, { pct: 60, value: 9.42 },
    { pct: 65, value: 9.68 }, { pct: 70, value: 9.99 }, { pct: 75, value: 10.30 },
    { pct: 80, value: 10.67 }, { pct: 85, value: 11.15 }, { pct: 90, value: 11.70 },
    { pct: 95, value: 12.65 },
  ],
  HR9: [
    { pct: 5, value: 0.32 }, { pct: 10, value: 0.49 }, { pct: 15, value: 0.61 },
    { pct: 20, value: 0.72 }, { pct: 25, value: 0.80 }, { pct: 30, value: 0.88 },
    { pct: 35, value: 0.96 }, { pct: 40, value: 1.03 }, { pct: 45, value: 1.10 },
    { pct: 50, value: 1.17 }, { pct: 55, value: 1.25 }, { pct: 60, value: 1.33 },
    { pct: 65, value: 1.41 }, { pct: 70, value: 1.50 }, { pct: 75, value: 1.60 },
    { pct: 80, value: 1.72 }, { pct: 85, value: 1.87 }, { pct: 90, value: 2.08 },
    { pct: 95, value: 2.41 },
  ],
  // K/9: higher = better
  K9: [
    { pct: 5, value: 11.49 }, { pct: 10, value: 10.69 }, { pct: 15, value: 10.15 },
    { pct: 20, value: 9.82 }, { pct: 25, value: 9.49 }, { pct: 30, value: 9.25 },
    { pct: 35, value: 9.00 }, { pct: 40, value: 8.75 }, { pct: 45, value: 8.53 },
    { pct: 50, value: 8.31 }, { pct: 55, value: 8.10 }, { pct: 60, value: 7.88 },
    { pct: 65, value: 7.63 }, { pct: 70, value: 7.43 }, { pct: 75, value: 7.20 },
    { pct: 80, value: 6.92 }, { pct: 85, value: 6.62 }, { pct: 90, value: 6.23 },
    { pct: 95, value: 5.63 },
  ],
  // WHIP: lower = better. Estimated from benchmarks (no full percentile table in source).
  WHIP: [
    { pct: 5, value: 0.90 }, { pct: 10, value: 1.00 }, { pct: 15, value: 1.05 },
    { pct: 20, value: 1.10 }, { pct: 25, value: 1.15 }, { pct: 30, value: 1.20 },
    { pct: 35, value: 1.25 }, { pct: 40, value: 1.28 }, { pct: 45, value: 1.32 },
    { pct: 50, value: 1.35 }, { pct: 55, value: 1.38 }, { pct: 60, value: 1.42 },
    { pct: 65, value: 1.46 }, { pct: 70, value: 1.50 }, { pct: 75, value: 1.55 },
    { pct: 80, value: 1.62 }, { pct: 85, value: 1.70 }, { pct: 90, value: 1.82 },
    { pct: 95, value: 2.00 },
  ],
};

/** Which stats are "lower is better" for percentile scoring. */
export const LOWER_IS_BETTER = new Set(["K_PCT", "ERA", "BB9", "H9", "HR9", "WHIP"]);

/** Batting stats score weights (must sum to 1.0). */
export const BATTING_STAT_WEIGHTS: Record<string, number> = {
  OBP: 0.30,
  SLG: 0.30,
  K_PCT: 0.20,
  BB_PCT: 0.20,
};

/** Pitching stats score weights (must sum to 1.0). */
export const PITCHING_STAT_WEIGHTS: Record<string, number> = {
  K9: 0.25,
  WHIP: 0.25,
  ERA: 0.20,
  BB9: 0.15,
  HR9: 0.15,
};

// ---------------------------------------------------------------------------
// Archetype loaders (client-side, cached)
// ---------------------------------------------------------------------------

type ArchetypeMap = Record<string, Archetype>;

export const loadBatterArchetypes = createJsonCache<ArchetypeMap>(
  "/data/archetypes/batter_archetypes.json",
  (d): d is ArchetypeMap => isNonArrayObject(d),
);

export const loadPitcherArchetypes = createJsonCache<ArchetypeMap>(
  "/data/archetypes/pitcher_archetypes.json",
  (d): d is ArchetypeMap => isNonArrayObject(d),
);

interface PositionDefenseEntry {
  name?: string;
  emoji?: string;
  description?: string;
  stat_weights: Record<string, number>;
  primary_stats: string[];
  secondary_stats: string[];
}
export type PositionDefenseMap = Record<string, PositionDefenseEntry>;

export const loadPositionDefense = createJsonCache<PositionDefenseMap>(
  "/data/archetypes/position_defense_weights.json",
  (d): d is PositionDefenseMap => isNonArrayObject(d),
);

interface BoonEntry {
  name: string;
  type: string;
  emoji: string;
  description: string;
  bonuses: Record<string, number>;
  penalties: Record<string, number>;
}
interface BoonsMerged {
  lesser_boons: BoonEntry[];
  greater_boons?: BoonEntry[];
}

export const loadBoons = createJsonCache<BoonsMerged>(
  "/data/boons_merged.json",
  (d): d is BoonsMerged => {
    if (!isNonArrayObject(d)) return false;
    const obj = d as Record<string, unknown>;
    return Array.isArray(obj.lesser_boons);
  },
);

/** Build a name → BoonEntry lookup from the merged boons list. */
export async function getBoonLookup(): Promise<Map<string, BoonEntry>> {
  const data = await loadBoons();
  const map = new Map<string, BoonEntry>();
  for (const b of data.lesser_boons) map.set(b.name, b);
  if (data.greater_boons) {
    for (const b of data.greater_boons) map.set(b.name, b);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Live percentile tables (from mmoldb via /api/percentiles)
// ---------------------------------------------------------------------------

export interface LivePercentileTables {
  batting: Record<string, PercentileEntry[]>;
  pitching: Record<string, PercentileEntry[]>;
}

/**
 * Load live S11 percentile tables from the server.
 * Returns null if no live data is available (falls back to hardcoded S10).
 */
export async function loadLivePercentiles(): Promise<LivePercentileTables | null> {
  try {
    const res = await fetch(`${BASE_PATH}/api/percentiles`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.source !== "live") return null;
    if (!data.batting || !data.pitching) return null;
    return { batting: data.batting, pitching: data.pitching };
  } catch {
    return null;
  }
}
