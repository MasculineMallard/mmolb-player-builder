/**
 * Stat optimization engine.
 *
 * Ported from stat_optimizer.py. Uses S11 mechanics for target calculations.
 * Operates on plain objects (no class instances).
 */

import { S11, TOTAL_PRIMARY_POINTS } from "./mechanics";

export interface StatPriority {
  statName: string;
  currentValue: number;
  targetValue: number;
  gap: number;
  priority: "high" | "medium" | "low" | "maintain";
  reasoning: string;
}

export interface Archetype {
  name: string;
  emoji?: string;
  description: string;
  priority_stats: string[];
  secondary_stats: string[];
  stat_weights: Record<string, number>;
  recommended_pitches?: string[];
  recommended_lesser_boons?: string[];
  recommended_greater_boons?: string[];
  stat_targets?: Record<string, number>;
  [key: string]: unknown;
}

/**
 * Calculate priority stats based on archetype and current values.
 * Uses S11 50/30/20 distribution model.
 */
export function calculatePriorityStats(
  stats: Record<string, number>,
  archetype: Archetype
): StatPriority[] {
  const statWeights = archetype.stat_weights ?? {};
  const priorityStats = archetype.priority_stats?.slice(0, 3) ?? [];
  const secondaryStats = archetype.secondary_stats?.slice(0, 3) ?? [];

  const nCore = Math.max(priorityStats.length, 1);
  const nSupport = Math.max(secondaryStats.length, 1);

  const corePer = Math.min(
    Math.floor((TOTAL_PRIMARY_POINTS * 0.5) / nCore),
    S11.statCap
  );
  const coreOverflow =
    Math.max(
      0,
      Math.floor((TOTAL_PRIMARY_POINTS * 0.5) / nCore) - S11.statCap
    ) * nCore;
  const supportPer = Math.min(
    Math.floor((TOTAL_PRIMARY_POINTS * 0.3 + coreOverflow) / nSupport),
    S11.statCap
  );

  const results: StatPriority[] = [];

  for (const [statName, weight] of Object.entries(statWeights)) {
    if (!(statName in stats)) continue;

    const current = stats[statName];
    let target: number;

    if (priorityStats.includes(statName)) {
      target = corePer;
    } else if (secondaryStats.includes(statName)) {
      target = supportPer;
    } else {
      target = 100;
    }

    const gap = target - current;

    let priority: StatPriority["priority"];
    if (gap > 200) priority = "high";
    else if (gap > 100) priority = "medium";
    else if (gap > 0) priority = "low";
    else priority = "maintain";

    const importance = priorityStats.includes(statName)
      ? "core stat"
      : secondaryStats.includes(statName)
        ? "supporting stat"
        : "flex stat";

    results.push({
      statName,
      currentValue: current,
      targetValue: target,
      gap,
      priority,
      reasoning: `${importance} (weight: ${weight}x)`,
    });
  }

  results.sort((a, b) => b.gap - a.gap);
  return results;
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
  return Math.min(100, raw / 10);
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
  pitchTypesData: Record<
    string,
    { name: string; priority_stats?: string[]; secondary_stats?: string[] }
  >
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
