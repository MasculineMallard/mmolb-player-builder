/**
 * Stat optimization engine.
 *
 * Ported from stat_optimizer.py. Uses S11 mechanics for target calculations.
 * Operates on plain objects (no class instances).
 */

import { TOTAL_PRIMARY_POINTS } from "./mechanics";
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
