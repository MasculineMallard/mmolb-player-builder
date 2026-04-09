/**
 * Roster evaluator scoring engine.
 * Pure computation — no AI, no LLM calls. Just math against reference data.
 */

import type { PlayerData, Archetype } from "./types";
import type {
  EvaluatedPlayer,
  EvalFlag,
  GameStats,
  PlayerRole,
  PercentileEntry,
  Recommendation,
} from "./evaluator-types";
import {
  STAT_TIERS,
  ROLE_STATS,
  BATTING_PERCENTILES,
  PITCHING_PERCENTILES,
  BATTING_STAT_WEIGHTS,
  PITCHING_STAT_WEIGHTS,
  type PositionDefenseMap,
} from "./evaluator-data";
import { calculatePrimaryPointsAtLevel, TOTAL_PRIMARY_POINTS, S11, calculateFitTargets } from "./mechanics";
import { generateStructuredReasoning } from "./evaluator-reasoning";
import { PITCHER_POSITIONS } from "./constants";

// ---------------------------------------------------------------------------
// Role detection
// ---------------------------------------------------------------------------

export function getPlayerRole(position: string | null): PlayerRole {
  if (!position) return "batter";
  const base = position.replace(/\d+$/, "");
  return PITCHER_POSITIONS.has(base) ? "pitcher" : "batter";
}

// ---------------------------------------------------------------------------
// Percentile interpolation
// ---------------------------------------------------------------------------

/**
 * Convert a raw stat value to a 0-100 score using a percentile table.
 * Tables use "Top X%" format: pct=5 means top 5% (elite).
 * Score = 100 - interpolated percentile rank.
 * So top 5% → score 95, top 95% → score 5.
 */
export function percentileToScore(value: number, table: PercentileEntry[]): number {
  // Tables are sorted pct ascending (5, 10, 15, ..., 95)
  // For "higher is better" stats: value at pct=5 is highest, pct=95 is lowest
  // For "lower is better" stats: value at pct=5 is lowest, pct=95 is highest
  // Either way, table[0] = best, table[last] = worst

  // Better than best in table
  if (
    (table[0].value >= table[table.length - 1].value && value >= table[0].value) ||
    (table[0].value <= table[table.length - 1].value && value <= table[0].value)
  ) {
    return 97; // cap at near-perfect
  }
  // Worse than worst in table
  if (
    (table[0].value >= table[table.length - 1].value && value <= table[table.length - 1].value) ||
    (table[0].value <= table[table.length - 1].value && value >= table[table.length - 1].value)
  ) {
    return 3; // floor
  }

  // Determine if higher value = lower pct (better) or higher pct (worse)
  const higherIsBetter = table[0].value > table[table.length - 1].value;

  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];

    const inRange = higherIsBetter
      ? value <= a.value && value >= b.value
      : value >= a.value && value <= b.value;

    if (inRange) {
      const range = Math.abs(b.value - a.value);
      if (range === 0) return 100 - a.pct;
      const t = Math.abs(value - a.value) / range;
      const pctRank = a.pct + t * (b.pct - a.pct);
      return 100 - pctRank;
    }
  }

  return 50; // fallback
}

// ---------------------------------------------------------------------------
// Stats Score (0-100)
// ---------------------------------------------------------------------------

export function computeStatsScore(
  role: PlayerRole,
  gameStats: GameStats | null,
  overrideTables?: { batting: Record<string, PercentileEntry[]>; pitching: Record<string, PercentileEntry[]> },
): number | null {
  if (!gameStats) return null;

  const weights = role === "batter" ? BATTING_STAT_WEIGHTS : PITCHING_STAT_WEIGHTS;
  const tables = overrideTables
    ? (role === "batter" ? overrideTables.batting : overrideTables.pitching)
    : (role === "batter" ? BATTING_PERCENTILES : PITCHING_PERCENTILES);

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [statKey, weight] of Object.entries(weights)) {
    const value = gameStats[statKey as keyof GameStats] as number | undefined;
    if (value == null) continue;

    const table = tables[statKey];
    if (!table) continue;

    const score = percentileToScore(value, table);
    weightedSum += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  return Math.round(weightedSum / totalWeight);
}

// ---------------------------------------------------------------------------
// Attribute Quality Score (0-100)
// ---------------------------------------------------------------------------

export function computeAttributeScore(
  player: PlayerData,
  role: PlayerRole,
): number {
  const t1Stats = new Set(STAT_TIERS[role].T1);
  const t2Stats = new Set(STAT_TIERS[role].T2);
  const allRoleStats = ROLE_STATS[role];

  let weightedSum = 0;
  let totalPoints = 0;

  for (const stat of allRoleStats) {
    const val = player.stats[stat] ?? 0;
    totalPoints += val;
    if (t1Stats.has(stat)) {
      weightedSum += val * 1.0;
    } else if (t2Stats.has(stat)) {
      weightedSum += val * 0.5;
    }
    // T3: weight 0, contributes nothing
  }

  if (totalPoints === 0) return 0;

  // Normalize: if all points were T1, ratio = 1.0; all T3 = 0.0
  // Max possible ratio is 1.0 (all T1), but T2 is 0.5, so a realistic
  // "perfect" build with some T2 investment is ~0.85.
  // Scale so 0.85 → 100 and 0.0 → 0
  const ratio = weightedSum / totalPoints;
  const scaled = Math.min(100, Math.round((ratio / 0.85) * 100));
  return scaled;
}

// ---------------------------------------------------------------------------
// Growth Score (0-100) — pure remaining budget
// ---------------------------------------------------------------------------

export function computeGrowthScore(
  player: PlayerData,
): number {
  const level = player.level ?? 1;

  // Players at or above max level have no growth
  if (level >= S11.maxLevel) return 0;

  // Remaining primary stat points
  const pointsAtLevel = calculatePrimaryPointsAtLevel(level);
  const pointsRemaining = Math.max(0, TOTAL_PRIMARY_POINTS - pointsAtLevel);
  const pointGrowth = TOTAL_PRIMARY_POINTS > 0
    ? (pointsRemaining / TOTAL_PRIMARY_POINTS) * 75
    : 0;

  // Remaining boon slots
  const boonLevels = [10, 20, 30];
  const boonsRemaining = boonLevels.filter((l) => l > level).length;
  const boonGrowth = boonsRemaining * (25 / 3); // 3 boons total, 25 points max

  return Math.round(Math.min(100, pointGrowth + boonGrowth));
}

// ---------------------------------------------------------------------------
// Position Fit Score (0-100)
// ---------------------------------------------------------------------------

export function computePositionFitScore(
  player: PlayerData,
  role: PlayerRole,
  positionDefense: PositionDefenseMap,
): number | null {
  const pos = player.position;
  if (!pos) return null;

  // DH and pitchers have no defense requirements — exclude from scoring
  const basePos = pos.replace(/\d+$/, "");
  if (basePos === "DH" || basePos === "Bench" || role === "pitcher") return null;

  const entry = positionDefense[basePos] ?? positionDefense[pos];
  if (!entry || !entry.stat_weights || Object.keys(entry.stat_weights).length === 0) return 100;

  let weightedScore = 0;
  let totalWeight = 0;

  for (const [stat, weight] of Object.entries(entry.stat_weights)) {
    const value = player.stats[stat.toLowerCase()] ?? 0;
    const statScore = Math.min(1, value / 200);
    weightedScore += statScore * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 100;
  return Math.round((weightedScore / totalWeight) * 100);
}

// ---------------------------------------------------------------------------
// Best Position Fit (for bench batters)
// ---------------------------------------------------------------------------

const BATTER_POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];

export function findBestFitPosition(
  player: PlayerData,
  positionDefense: PositionDefenseMap,
): string {
  let bestPos = player.position ?? "DH";
  let bestScore = -1;

  for (const pos of BATTER_POSITIONS) {
    const modified = { ...player, position: pos };
    const score = computePositionFitScore(modified, "batter", positionDefense);
    if (score != null && score > bestScore) {
      bestScore = score;
      bestPos = pos;
    }
  }

  return bestPos;
}

// ---------------------------------------------------------------------------
// Archetype Detection
// ---------------------------------------------------------------------------

export function detectArchetype(
  player: PlayerData,
  role: PlayerRole,
  archetypes: Record<string, Archetype>,
): { key: string; name: string; emoji: string; fitPct: number } {
  let bestKey = "";
  let bestFitPct = -1;
  let bestArch: Archetype | null = null;

  const level = player.level ?? 1;

  for (const [key, arch] of Object.entries(archetypes)) {
    const prioritySet = new Set(arch.priority_stats ?? []);
    const nCore = (arch.priority_stats ?? []).length;
    const nSupport = (arch.secondary_stats ?? []).length;
    const { coreTarget, supportTarget } = calculateFitTargets(level, nCore, nSupport);

    let matchScore = 0;
    let maxPossible = 0;

    for (const [stat, weight] of Object.entries(arch.stat_weights)) {
      const value = player.stats[stat] ?? 0;
      const target = prioritySet.has(stat) ? coreTarget : supportTarget;
      matchScore += Math.min(value, target) * weight;
      maxPossible += target * weight;
    }

    const fitPct = maxPossible > 0 ? Math.round((matchScore / maxPossible) * 100) : 0;

    if (fitPct > bestFitPct) {
      bestFitPct = fitPct;
      bestKey = key;
      bestArch = arch;
    }
  }

  return {
    key: bestKey,
    name: bestArch?.name ?? "Unknown",
    emoji: bestArch?.emoji ?? "",
    fitPct: bestFitPct,
  };
}

// ---------------------------------------------------------------------------
// Override Flags
// ---------------------------------------------------------------------------

function detectFlags(
  player: PlayerData,
  role: PlayerRole,
  statsScore: number | null,
  archetype: { key: string; name: string },
  archetypes: Record<string, Archetype>,
  boonLookup: Map<string, { bonuses: Record<string, number>; penalties: Record<string, number> }>,
  positionDefense: PositionDefenseMap,
): EvalFlag[] {
  const flags: EvalFlag[] = [];
  const level = player.level ?? 1;
  const t1Stats = STAT_TIERS[role].T1;

  // MAXED_BOTTOM_QUARTILE: Level 30 + game stats in bottom 25%
  if (level >= 30 && statsScore != null && statsScore < 25) {
    flags.push("MAXED_BOTTOM_QUARTILE");
  }

  // T1_VOID_LATE: Level 20+ with any T1 stat at 0
  if (level >= 20) {
    for (const stat of t1Stats) {
      if ((player.stats[stat] ?? 0) === 0) {
        flags.push("T1_VOID_LATE");
        break;
      }
    }
  }

  // CUNNING_OBP_TRAP: high Cunning, low Discipline + Contact (batters only)
  if (role === "batter") {
    const cunning = player.stats.cunning ?? 0;
    const discipline = player.stats.discipline ?? 0;
    const contact = player.stats.contact ?? 0;
    if (cunning > 200 && discipline < 100 && contact < 100) {
      flags.push("CUNNING_OBP_TRAP");
    }
  }

  // DEFENSE_LOCKED: position-critical defense stat at 0, level > 15
  if (level > 15 && role === "batter") {
    const pos = player.position?.replace(/\d+$/, "");
    if (pos && pos !== "DH" && pos !== "Bench") {
      const defEntry = positionDefense[pos];
      if (defEntry?.stat_weights) {
        for (const stat of Object.keys(defEntry.stat_weights)) {
          if ((player.stats[stat.toLowerCase()] ?? 0) === 0) {
            flags.push("DEFENSE_LOCKED");
            break;
          }
        }
      }
    }
  }

  // BOON_CONFLICT: boon penalizes an archetype priority stat
  const arch = archetypes[archetype.key];
  if (arch) {
    const priorityStats = new Set(arch.priority_stats);
    for (const boonName of [...player.lesserBoons, ...player.greaterBoons]) {
      const boon = boonLookup.get(boonName);
      if (!boon) continue;
      for (const stat of Object.keys(boon.penalties)) {
        if (priorityStats.has(stat.toLowerCase())) {
          flags.push("BOON_CONFLICT");
          break;
        }
      }
      if (flags.includes("BOON_CONFLICT")) break;
    }
  }

  return [...new Set(flags)]; // dedupe
}

// ---------------------------------------------------------------------------
// Composite & Recommendation
// ---------------------------------------------------------------------------

function computeComposite(
  attributeScore: number,
  statsScore: number | null,
  growthScore: number,
  positionFitScore: number | null,
): number {
  const hasFit = positionFitScore != null;
  const hasStats = statsScore != null;

  if (hasStats && hasFit) {
    // All 4 scores: equal 25% each
    return Math.round(
      attributeScore * 0.25 + statsScore * 0.25 + positionFitScore * 0.25 + growthScore * 0.25,
    );
  }
  if (hasStats && !hasFit) {
    // No fit (pitcher/DH): Attr 40%, Stats 40%, Growth 20%
    return Math.round(
      attributeScore * 0.40 + statsScore * 0.40 + growthScore * 0.20,
    );
  }
  if (!hasStats && hasFit) {
    // No game stats: Attr 40%, Fit 30%, Growth 30%
    return Math.round(
      attributeScore * 0.40 + positionFitScore * 0.30 + growthScore * 0.30,
    );
  }
  // No stats, no fit (pitcher/DH without game stats): Attr 50%, Growth 50%
  return Math.round(
    attributeScore * 0.50 + growthScore * 0.50,
  );
}

function getRecommendation(
  composite: number,
  flags: EvalFlag[],
): Recommendation {
  if (flags.includes("MAXED_BOTTOM_QUARTILE")) return "MULCH";
  if (composite >= 60) return "KEEP";
  if (composite >= 38) return "HOLD";
  return "MULCH";
}

// ---------------------------------------------------------------------------
// Main evaluation function
// ---------------------------------------------------------------------------

export function evaluatePlayer(
  player: PlayerData,
  gameStats: GameStats | null,
  archetypes: Record<string, Archetype>,
  positionDefense: PositionDefenseMap,
  boonLookup: Map<string, { bonuses: Record<string, number>; penalties: Record<string, number> }>,
  percentileTables?: { batting: Record<string, PercentileEntry[]>; pitching: Record<string, PercentileEntry[]> },
): EvaluatedPlayer {
  const role = getPlayerRole(player.position);
  const attributeScore = computeAttributeScore(player, role);
  const statsScore = computeStatsScore(role, gameStats, percentileTables);
  const growthScore = computeGrowthScore(player);
  const positionFitScore = computePositionFitScore(player, role, positionDefense);
  const detectedArchetype = detectArchetype(player, role, archetypes);
  const compositeScore = computeComposite(attributeScore, statsScore, growthScore, positionFitScore);
  const flags = detectFlags(
    player, role, statsScore, detectedArchetype, archetypes, boonLookup, positionDefense,
  );
  const recommendation = getRecommendation(compositeScore, flags);
  const reasoning = generateStructuredReasoning(
    player, role, attributeScore, statsScore, growthScore, positionFitScore ?? 0,
    flags, boonLookup, positionDefense,
  );

  return {
    player,
    recommendation,
    compositeScore,
    attributeScore,
    statsScore,
    growthScore,
    positionFitScore,
    detectedArchetype,
    reasoning,
    flags,
  };
}
