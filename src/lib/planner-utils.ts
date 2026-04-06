/**
 * Client-safe planner utilities.
 * Extracted from planner.ts so components can use them without server imports.
 */

import { S11, calculatePrimaryPointsAtLevel, TOTAL_PRIMARY_POINTS } from "./mechanics";
import { MILESTONE_LEVELS } from "./constants";
import type { Archetype } from "./types";

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
  const priorityStats = archetype.priority_stats ?? [];

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
  let evaluatedStats = 0;

  // At level 1 no points have been earned yet; skip on-track/behind tracking
  if (pointsAtCurrent > 0) {
    for (const statName of priorityStats) {
      if (!(statName in stats)) continue;
      const current = stats[statName];
      const ratio = (topWeights[statName] ?? 0) / (totalWeight || 1);
      const expectedAtCurrent = Math.min(
        Math.floor(pointsAtCurrent * ratio),
        1000
      );

      // Skip stats with zero expected allocation (avoid inflating denominator)
      if (expectedAtCurrent === 0) continue;

      evaluatedStats++;
      totalProgress += Math.min(current, expectedAtCurrent);
      maxProgress += expectedAtCurrent;

      if (current >= expectedAtCurrent) statsOnTrack++;
      else statsBehind++;
    }
  }

  const progressPercent =
    maxProgress > 0
      ? Math.round((totalProgress / maxProgress) * 1000) / 10
      : 0;

  return {
    progressPercent,
    statsOnTrack,
    statsBehind,
    totalStats: evaluatedStats,
    currentLevel,
    levelsRemaining: S11.maxLevel - currentLevel,
    expectedPointsAtLevel: pointsAtCurrent,
    maxPoints: TOTAL_PRIMARY_POINTS,
  };
}

export interface Milestone {
  level: number;
  name: string;
  status: "completed" | "upcoming";
}

const boonLevelSet = new Set<number>(S11.boonLevels);
const defenseLevelSet = new Set<number>(S11.defenseBonusLevels);

export function getMilestoneName(level: number): string {
  if (level === 1) return "Start";
  if (boonLevelSet.has(level)) return "Lesser Boon";
  if (defenseLevelSet.has(level)) return "Defense Bonus";
  return `Level ${level}`;
}

export function generateMilestones(currentLevel: number): Milestone[] {
  return MILESTONE_LEVELS.map((level) => ({
    level,
    name: getMilestoneName(level),
    status: (currentLevel >= level ? "completed" : "upcoming") as
      | "completed"
      | "upcoming",
  }));
}
