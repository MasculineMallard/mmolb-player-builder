/**
 * Level-up recommendation advisor.
 *
 * Ported from levelup_advisor.py, rewritten for S11 mechanics.
 * Operates on plain objects (no class instances).
 */

import { calculateStatTargets } from "./optimizer";
import type { Archetype } from "./types";
import { S11 } from "./mechanics";

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
  const priorityStats = archetype.priority_stats ?? [];
  const secondaryStats = archetype.secondary_stats ?? [];
  const editedTargets = archetype.stat_targets ?? {};

  const statWeights = archetype.stat_weights ?? {};
  const { corePer, supportPer } = calculateStatTargets(archetype);
  const prioritySet = new Set(priorityStats);
  const secondarySet = new Set(secondaryStats);
  const recommendations: StatRecommendation[] = [];
  const seen = new Set<string>();

  for (const statName of [...priorityStats, ...secondaryStats]) {
    if (seen.has(statName)) continue;
    seen.add(statName);
    if (!(statName in stats)) continue;

    const current = stats[statName];
    const weight = statWeights[statName] ?? 1.0;

    let target: number;
    if (editedTargets[statName] !== undefined) {
      target = editedTargets[statName];
    } else if (prioritySet.has(statName)) {
      target = corePer;
    } else if (secondarySet.has(statName)) {
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
    const importance = prioritySet.has(statName)
      ? "core stat"
      : secondarySet.has(statName)
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

export interface BoonTimelineEntry {
  level: number;
  type: string;
  boonCategory: "lesser";
  acquired: boolean;
  takenBoonName: string | null;
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

  const boonSchedule: [number, string][] = S11.boonLevels.map((lvl, i) => [
    lvl,
    `Lesser Boon (${["1st", "2nd", "3rd"][i] ?? `${i + 1}th`})`,
  ]);

  // Assign taken boon names to acquired levels by position.
  // DB orders boons by valid_from (acquisition time), which matches level order
  // in normal gameplay. This is the best mapping available without level metadata on boons.
  const takenBoonsList = takenBoons.lesser;
  const timeline: BoonTimelineEntry[] = [];
  let takenIdx = 0;

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

    const takenBoonName = acquired && takenIdx < takenBoonsList.length
      ? takenBoonsList[takenIdx]
      : null;
    if (acquired) takenIdx++;

    timeline.push({
      level,
      type: label,
      boonCategory: "lesser",
      acquired,
      takenBoonName,
      recommendations: filtered,
    });
  }

  return timeline;
}

