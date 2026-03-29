/**
 * Level-up recommendation advisor.
 *
 * Ported from levelup_advisor.py, rewritten for S11 mechanics.
 * Operates on plain objects (no class instances).
 */

import { S11, TOTAL_PRIMARY_POINTS } from "./mechanics";
import type { Archetype } from "./optimizer";

export interface StatRecommendation {
  statName: string;
  current: number;
  target: number;
  gap: number;
  weight: number;
  priorityScore: number;
  reasoning: string;
}

/**
 * Recommend which stats to prioritize on the next level-up.
 */
export function recommendStatPriorities(
  stats: Record<string, number>,
  archetype: Archetype,
  topN = 5
): StatRecommendation[] {
  const statWeights = archetype.stat_weights ?? {};
  const priorityStats = archetype.priority_stats ?? [];
  const secondaryStats = archetype.secondary_stats ?? [];
  const editedTargets = archetype.stat_targets ?? {};

  const top3 = priorityStats.slice(0, 3);

  const nCore = Math.max(top3.length, 1);
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

  const recommendations: StatRecommendation[] = [];

  for (const statName of [...priorityStats, ...secondaryStats]) {
    if (!(statName in stats)) continue;

    const current = stats[statName];
    const weight = statWeights[statName] ?? 1.0;

    let target: number;
    if (editedTargets[statName] !== undefined) {
      target = editedTargets[statName];
    } else if (top3.includes(statName)) {
      target = corePer;
    } else if (secondaryStats.includes(statName)) {
      target = supportPer;
    } else {
      target = 100;
    }

    const gap = target - current;
    let priorityScore = gap * weight;

    // Diminishing returns for very high stats
    if (current > 850) priorityScore *= 0.5;
    else if (current > 700) priorityScore *= 0.75;

    // Completed stats sort last
    if (gap <= 0) priorityScore = -1;

    const urgency =
      gap > 200 ? "Critical gap" : gap > 100 ? "Significant gap" : "Minor gap";
    const importance = top3.includes(statName)
      ? "core stat"
      : secondaryStats.includes(statName)
        ? "supporting stat"
        : "flex stat";

    recommendations.push({
      statName,
      current,
      target,
      gap,
      weight,
      priorityScore,
      reasoning: `${urgency} - ${importance}`,
    });
  }

  recommendations.sort((a, b) => b.priorityScore - a.priorityScore);
  return recommendations.slice(0, topN);
}

export interface LevelUpSummary {
  top3Stats: string[];
  progressPercent: number;
  recommendations: StatRecommendation[];
  summary: string;
  archetype: string;
}

/**
 * Get a summary of level-up recommendations.
 */
export function getLevelUpSummary(
  stats: Record<string, number>,
  archetype: Archetype
): LevelUpSummary {
  const recommendations = recommendStatPriorities(stats, archetype, 5);
  const top3 = recommendations.slice(0, 3).map((r) => r.statName);

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

  let totalProgress = 0;
  let maxProgress = 0;

  for (const statName of [...priorityStats, ...secondaryStats]) {
    if (!(statName in stats)) continue;
    const current = stats[statName];
    const target = priorityStats.includes(statName) ? corePer : supportPer;

    totalProgress += Math.min(current, target);
    maxProgress += target;
  }

  const progressPercent =
    maxProgress > 0
      ? Math.round((totalProgress / maxProgress) * 1000) / 10
      : 0;

  return {
    top3Stats: top3,
    progressPercent,
    recommendations,
    summary: `Focus on: ${top3.join(", ")}`,
    archetype: archetype.name,
  };
}

export interface BoonTimelineEntry {
  level: number;
  type: string;
  boonCategory: "lesser";
  acquired: boolean;
  recommendations: string[];
}

/**
 * Recommend boons for upcoming boon levels.
 *
 * S11: all 3 boons are Lesser (levels 10, 20, 30).
 * Filters out already-taken boons and tracks "planned" picks
 * to avoid recommending the same boon at multiple levels.
 */
export function recommendBoonsByLevel(
  currentLevel: number,
  archetype: Archetype,
  takenBoons: { lesser: string[]; greater: string[] } = {
    lesser: [],
    greater: [],
  }
): BoonTimelineEntry[] {
  const takenLesser = new Set(takenBoons.lesser.map((b) => b.toLowerCase()));
  const plannedLesser = new Set<string>();

  // S11: all boons are Lesser
  const boonSchedule: [number, string][] = [
    [10, "Lesser Boon (1st)"],
    [20, "Lesser Boon (2nd)"],
    [30, "Lesser Boon (3rd)"],
  ];

  const timeline: BoonTimelineEntry[] = [];

  for (const [level, label] of boonSchedule) {
    const acquired = currentLevel >= level;
    const allSuggestions = archetype.recommended_lesser_boons ?? [];

    const alreadyUsed = new Set([...takenLesser, ...plannedLesser]);
    const filtered = allSuggestions.filter(
      (name) => !alreadyUsed.has(name.toLowerCase())
    );

    // Track top pick as "planned" for future levels
    if (!acquired && filtered.length > 0) {
      plannedLesser.add(filtered[0].toLowerCase());
    }

    timeline.push({
      level,
      type: label,
      boonCategory: "lesser",
      acquired,
      recommendations: filtered,
    });
  }

  return timeline;
}

export interface ArchetypeComparison {
  archetypeKey: string;
  name: string;
  description: string;
  fitScore: number;
}

/**
 * Compare player fit against multiple archetypes.
 */
export function compareArchetypes(
  stats: Record<string, number>,
  archetypes: Record<string, Archetype>
): ArchetypeComparison[] {
  const results: ArchetypeComparison[] = [];

  for (const [key, arch] of Object.entries(archetypes)) {
    const statWeights = arch.stat_weights ?? {};
    const priority = arch.priority_stats?.slice(0, 3) ?? [];
    const secondary = arch.secondary_stats?.slice(0, 3) ?? [];

    const nC = Math.max(priority.length, 1);
    const nS = Math.max(secondary.length, 1);
    const cPer = Math.min(
      Math.floor((TOTAL_PRIMARY_POINTS * 0.5) / nC),
      S11.statCap
    );
    const cOverflow =
      Math.max(0, Math.floor((TOTAL_PRIMARY_POINTS * 0.5) / nC) - S11.statCap) *
      nC;
    const sPer = Math.min(
      Math.floor((TOTAL_PRIMARY_POINTS * 0.3 + cOverflow) / nS),
      S11.statCap
    );

    let totalFit = 0;
    let maxPossible = 0;

    for (const [statName, weight] of Object.entries(statWeights)) {
      if (!(statName in stats)) continue;
      const current = stats[statName];

      let target: number;
      if (priority.includes(statName)) target = cPer;
      else if (secondary.includes(statName)) target = sPer;
      else continue;

      const statFit = target > 0 ? Math.min((current / target) * 100, 100) : 100;
      totalFit += statFit * weight;
      maxPossible += 100 * weight;
    }

    const fitScore =
      maxPossible > 0
        ? Math.round((totalFit / maxPossible) * 1000) / 10
        : 0;

    results.push({
      archetypeKey: key,
      name: arch.name,
      description: arch.description,
      fitScore,
    });
  }

  results.sort((a, b) => b.fitScore - a.fitScore);
  return results;
}
