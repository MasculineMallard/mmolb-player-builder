/**
 * Progression planner: orchestrates optimizer + advisor into complete plans.
 *
 * Ported from progression_planner.py, rewritten for S11 mechanics.
 */

import { S11, calculatePrimaryPointsAtLevel, TOTAL_PRIMARY_POINTS } from "./mechanics";
import { MILESTONE_LEVELS } from "./constants";
import {
  recommendStatPriorities,
  recommendBoonsByLevel,
  type StatRecommendation,
  type BoonTimelineEntry,
} from "./advisor";
import {
  calculatePriorityStats,
  optimizePitchArsenal,
  type Archetype,
  type StatPriority,
  type PitchArsenalAdvice,
} from "./optimizer";
import type { PlayerData } from "./types";

export interface Milestone {
  level: number;
  name: string;
  status: "completed" | "upcoming";
}

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

export interface ProgressionPlan {
  player: PlayerData;
  archetype: {
    id: string;
    name: string;
    description: string;
    priorityStats: string[];
    secondaryStats: string[];
  };
  statPriorities: StatRecommendation[];
  statDetails: StatPriority[];
  boonTimeline: BoonTimelineEntry[];
  milestones: Milestone[];
  progressSummary: ProgressSummary;
}

export interface PitcherPlan extends ProgressionPlan {
  pitchRecommendations: PitchArsenalAdvice;
}

export interface BatterPlan extends ProgressionPlan {
  // Future: positionFit from BatterOptimizer
}

function generateMilestones(currentLevel: number): Milestone[] {
  return MILESTONE_LEVELS.map((level) => ({
    level,
    name: getMilestoneName(level),
    status: currentLevel >= level ? "completed" : "upcoming",
  }));
}

function getMilestoneName(level: number): string {
  if (level === 1) return "Start";
  if (S11.boonLevels.includes(level as 10 | 20 | 30)) return "Lesser Boon";
  if (S11.defenseBonusLevels.includes(level as 5 | 15 | 25))
    return "Defense Bonus";
  return `Level ${level}`;
}

function calculateProgress(
  stats: Record<string, number>,
  archetype: Archetype,
  currentLevel: number
): ProgressSummary {
  const statWeights = archetype.stat_weights ?? {};
  const priorityStats = archetype.priority_stats?.slice(0, 3) ?? [];

  const pointsAtCurrent = calculatePrimaryPointsAtLevel(currentLevel);

  // Weight-based allocation for priority stats
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

/**
 * Create a complete progression plan for a pitcher.
 */
export function createPitcherPlan(
  player: PlayerData,
  archetype: Archetype,
  archetypeId: string,
  pitchTypesData: Record<
    string,
    { name: string; priority_stats?: string[]; secondary_stats?: string[] }
  >
): PitcherPlan {
  const takenBoons = {
    lesser: player.lesserBoons,
    greater: player.greaterBoons,
  };

  const currentPitchNames = player.pitches.map((p) => p.name);

  return {
    player,
    archetype: {
      id: archetypeId,
      name: archetype.name,
      description: archetype.description,
      priorityStats: archetype.priority_stats ?? [],
      secondaryStats: archetype.secondary_stats ?? [],
    },
    statPriorities: recommendStatPriorities(player.stats, archetype, 10),
    statDetails: calculatePriorityStats(player.stats, archetype),
    boonTimeline: recommendBoonsByLevel(player.level, archetype, takenBoons),
    pitchRecommendations: optimizePitchArsenal(
      player.stats,
      currentPitchNames,
      archetype,
      pitchTypesData
    ),
    milestones: generateMilestones(player.level),
    progressSummary: calculateProgress(
      player.stats,
      archetype,
      player.level
    ),
  };
}

/**
 * Create a complete progression plan for a batter.
 */
export function createBatterPlan(
  player: PlayerData,
  archetype: Archetype,
  archetypeId: string
): BatterPlan {
  const takenBoons = {
    lesser: player.lesserBoons,
    greater: player.greaterBoons,
  };

  return {
    player,
    archetype: {
      id: archetypeId,
      name: archetype.name,
      description: archetype.description,
      priorityStats: archetype.priority_stats ?? [],
      secondaryStats: archetype.secondary_stats ?? [],
    },
    statPriorities: recommendStatPriorities(player.stats, archetype, 10),
    statDetails: calculatePriorityStats(player.stats, archetype),
    boonTimeline: recommendBoonsByLevel(player.level, archetype, takenBoons),
    milestones: generateMilestones(player.level),
    progressSummary: calculateProgress(
      player.stats,
      archetype,
      player.level
    ),
  };
}
