/**
 * Stat optimization engine.
 *
 * Ported from stat_optimizer.py. Uses S11 mechanics for target calculations.
 * Operates on plain objects (no class instances).
 */

import { TOTAL_PRIMARY_POINTS, calculateFitTargets } from "./mechanics";
import type { Archetype, PitchTypesMap } from "./types";

/** Max stat value in the display scale (DB stores 0-10, we display 0-1000). */
const STAT_SCALE_MAX = 1000;

/**
 * Compute per-stat point targets using the S11 50/30 distribution model.
 * Single source of truth for target allocation math.
 * No stat cap in S11; targets are bounded only by TOTAL_PRIMARY_POINTS.
 */
export function calculateStatTargets(archetype: Archetype): {
  corePer: number;
  supportPer: number;
} {
  const nCore = Math.max((archetype.priority_stats ?? []).length, 1);
  const nSupport = Math.max((archetype.secondary_stats ?? []).length, 1);

  const corePer = Math.floor((TOTAL_PRIMARY_POINTS * 0.5) / nCore);
  const supportPer = Math.floor((TOTAL_PRIMARY_POINTS * 0.3) / nSupport);

  return { corePer, supportPer };
}

/**
 * Level-normalized fit % of a player's stats against an archetype.
 * Single source of truth — used by the evaluator (detectArchetype),
 * ArchetypeSelect, and PlayerContent.
 */
export function computeArchetypeFitPct(
  stats: Record<string, number>,
  archetype: Archetype,
  level: number,
): number {
  const prioritySet = new Set(archetype.priority_stats ?? []);
  const nCore = (archetype.priority_stats ?? []).length;
  const nSupport = (archetype.secondary_stats ?? []).length;
  const { coreTarget, supportTarget } = calculateFitTargets(level, nCore, nSupport);

  let matchScore = 0;
  let maxPossible = 0;
  for (const [stat, weight] of Object.entries(archetype.stat_weights)) {
    const value = stats[stat] ?? 0;
    const target = prioritySet.has(stat) ? coreTarget : supportTarget;
    matchScore += Math.min(value, target) * weight;
    maxPossible += target * weight;
  }
  return maxPossible > 0 ? Math.round((matchScore / maxPossible) * 100) : 0;
}

/** Tier weight for pitch fit calculation. Elite pitches matter more. */
function tierWeight(tier: number | undefined): number {
  if (tier === 1) return 1.5;
  if (tier === 3) return 0.75;
  return 1.0; // T2 or unknown
}

/**
 * Compute how well a player's current pitches match an archetype's recommendations.
 * Returns 0-100 percentage, or null if the archetype has no recommended pitches.
 */
export function computePitchFitPct(
  playerPitchNames: string[],
  archetype: Archetype,
  pitchTypesData: PitchTypesMap
): number | null {
  const recommended = archetype.recommended_pitches;
  if (!recommended || recommended.length === 0) return null;

  const playerSet = new Set(playerPitchNames);
  let matched = 0;
  let total = 0;

  for (const pitch of recommended) {
    const w = tierWeight(pitchTypesData[pitch]?.tier);
    total += w;
    if (playerSet.has(pitch)) matched += w;
  }

  return total > 0 ? Math.round((matched / total) * 100) : null;
}

/**
 * Map each of the player's thrown pitches to a chip on its DIFFERENTIATING stat — the
 * 2nd priority stat. The 1st priority stat is velocity for all nine pitch types
 * (universal noise), so using [1] skips it by construction. Any stat that EVERY thrown
 * pitch shares is also dropped (not differentiating for this arsenal). Returns a
 * stat -> pitch-display-names map for the stat grid to chip.
 */
export function computePitchChips(
  playerPitches: string[],
  pitchTypesData: PitchTypesMap,
): Record<string, string[]> {
  const thrown = playerPitches.filter((p) => pitchTypesData[p]?.priority_stats?.length);
  if (thrown.length === 0) return {};
  const firstPri = pitchTypesData[thrown[0]]!.priority_stats!;
  const shared = new Set<string>(
    firstPri.filter((s) => thrown.every((p) => pitchTypesData[p]?.priority_stats?.includes(s))),
  );
  const map: Record<string, string[]> = {};
  for (const p of thrown) {
    const stat = pitchTypesData[p]!.priority_stats![1]; // differentiating (2nd) stat
    if (!stat || shared.has(stat)) continue;
    const name = pitchTypesData[p]!.name ?? p.toUpperCase();
    (map[stat] ??= []).push(name);
  }
  return map;
}

export interface PitchEffectiveness {
  pitchType: string;
  effectiveness: number;
}

/**
 * Calculate pitch effectiveness based on pitcher stats.
 * Returns 0-100 score.
 */
export function calculatePitchEffectiveness(
  stats: Record<string, number>,
  pitchData: {
    priority_stats?: string[];
    secondary_stats?: string[];
  }
): number {
  const primaryStats = pitchData.priority_stats ?? [];
  const secondaryStatsList = pitchData.secondary_stats ?? [];

  let primaryScore = 0;
  for (const stat of primaryStats) {
    primaryScore += stats[stat] ?? 0;
  }
  if (primaryStats.length) primaryScore /= primaryStats.length;

  let secondaryScore = 0;
  for (const stat of secondaryStatsList) {
    secondaryScore += stats[stat] ?? 0;
  }
  if (secondaryStatsList.length) secondaryScore /= secondaryStatsList.length;

  const raw = primaryScore * 0.7 + secondaryScore * 0.3;
  return Math.min(100, (raw / STAT_SCALE_MAX) * 100);
}

export interface PitchArsenalAdvice {
  keep: string[];
  add: { pitchType: string; name: string; effectiveness: number }[];
  remove: string[];
}

/**
 * Analyze pitch arsenal and recommend changes.
 */
export function optimizePitchArsenal(
  stats: Record<string, number>,
  currentPitches: string[],
  archetype: Archetype,
  pitchTypesData: PitchTypesMap
): PitchArsenalAdvice {
  const recommended = archetype.recommended_pitches ?? [];

  const effectiveness: Record<string, number> = {};
  for (const [key, data] of Object.entries(pitchTypesData)) {
    effectiveness[key] = calculatePitchEffectiveness(stats, data);
  }

  const keep: string[] = [];
  const remove: string[] = [];
  const add: PitchArsenalAdvice["add"] = [];

  for (const pitch of currentPitches) {
    if (recommended.includes(pitch)) {
      keep.push(pitch);
    } else if ((effectiveness[pitch] ?? 0) < 50) {
      remove.push(pitch);
    } else {
      keep.push(pitch);
    }
  }

  for (const pitch of recommended) {
    if (!currentPitches.includes(pitch) && pitchTypesData[pitch]) {
      add.push({
        pitchType: pitch,
        name: pitchTypesData[pitch].name,
        effectiveness: effectiveness[pitch] ?? 0,
      });
    }
  }

  add.sort((a, b) => b.effectiveness - a.effectiveness);

  return { keep, add: add.slice(0, 3), remove };
}
