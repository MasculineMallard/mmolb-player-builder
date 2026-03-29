/**
 * Client-safe planner utilities.
 * Extracted from planner.ts so components can use them without server imports.
 */

import { S11, calculatePrimaryPointsAtLevel, TOTAL_PRIMARY_POINTS } from "./mechanics";
import type { Archetype } from "./optimizer";

export interface ProgressSummary {
  progressPercent: number;
  statsOnTrack: number;
  statsBehind: number;
  totalStats: number;
  currentLevel: number;
  levelsRemaining: number;
  expectedPointsAtLevel: number;
  maxPoints: number;
}

export function calculateProgress(
  stats: Record<string, number>,
  archetype: Archetype,
  currentLevel: number
): ProgressSummary {
  const statWeights = archetype.stat_weights ?? {};
  const priorityStats = archetype.priority_stats?.slice(0, 3) ?? [];

  const pointsAtCurrent = calculatePrimaryPointsAtLevel(currentLevel);

  const topWeights: Record<string, number> = {};
  let totalWeight = 0;
  for (const stat of priorityStats) {
    const w = statWeights[stat] ?? 1.0;
    topWeights[stat] = w;
    totalWeight += w;
  }

  let totalProgress = 0;
  let maxProgress = 0;
  let statsOnTrack = 0;
  let statsBehind = 0;

  for (const statName of priorityStats) {
    if (!(statName in stats)) continue;
    const current = stats[statName];
    const ratio = (topWeights[statName] ?? 0) / (totalWeight || 1);
    const expectedAtCurrent = Math.min(
      Math.floor(pointsAtCurrent * ratio),
      1000
    );

    totalProgress += Math.min(current, expectedAtCurrent);
    maxProgress += expectedAtCurrent || 1;

    if (current >= expectedAtCurrent) statsOnTrack++;
    else statsBehind++;
  }

  const progressPercent =
    maxProgress > 0
      ? Math.round((totalProgress / maxProgress) * 1000) / 10
      : 0;

  return {
    progressPercent,
    statsOnTrack,
    statsBehind,
    totalStats: Object.keys(statWeights).length,
    currentLevel,
    levelsRemaining: S11.maxLevel - currentLevel,
    expectedPointsAtLevel: pointsAtCurrent,
    maxPoints: TOTAL_PRIMARY_POINTS,
  };
}
