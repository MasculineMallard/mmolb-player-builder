/**
 * Level-up recommendation advisor.
 *
 * Ported from levelup_advisor.py, rewritten for S11 mechanics.
 * Operates on plain objects (no class instances).
 */

import { calculateStatTargets } from "./optimizer";
import type { Archetype } from "./types";
import { S11 } from "./mechanics";
import { STAT_TIERS, ROLE_STATS } from "./evaluator-data";
import type { PlayerRole } from "./evaluator-types";

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
    const current = stats[statName] ?? 0;
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

  for (let i = 0; i < boonSchedule.length; i++) {
    const [level, label] = boonSchedule[i];
    // A boon slot is acquired when the player has actually picked it,
    // not just when they've reached the level. This handles the case
    // where a player is at level 30 but hasn't selected their 3rd boon yet.
    const acquired = i < takenBoonsList.length;
    const allSuggestions = archetype.recommended_lesser_boons ?? [];

    const alreadyUsed = new Set([...takenLesser, ...plannedLesser]);
    const filtered = allSuggestions.filter(
      (name) => !alreadyUsed.has(name.toLowerCase())
    );

    // Track top pick as "planned" for future levels
    if (!acquired && filtered.length > 0) {
      plannedLesser.add(filtered[0].toLowerCase());
    }

    const takenBoonName = acquired ? takenBoonsList[i] : null;

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

// ---------------------------------------------------------------------------
// Boon Recombobulator Advisor — stat-aware boon scoring
// ---------------------------------------------------------------------------

export interface BoonData {
  name: string;
  emoji: string;
  description: string;
  bonuses: Record<string, number>;
  penalties: Record<string, number>;
}

export interface BoonScore {
  boonName: string;
  emoji: string;
  bonusStat: string;
  penaltyStat: string;
  bonusStatDisplay: string;
  penaltyStatDisplay: string;
  absoluteGain: number;
  absoluteLoss: number;
  score: number;
  bonusTier: "T1" | "T2" | "T3" | "off-role";
  penaltyTier: "T1" | "T2" | "T3" | "off-role";
}

const TIER_WEIGHTS = { T1: 3.0, T2: 2.0, T3: 0.8, "off-role": 0.0 } as const;
const PENALTY_OFF_ROLE_WEIGHT = 0.1;

function getTier(stat: string, role: PlayerRole): "T1" | "T2" | "T3" | "off-role" {
  const tiers = STAT_TIERS[role];
  if (tiers.T1.includes(stat)) return "T1";
  if (tiers.T2.includes(stat)) return "T2";
  if (tiers.T3.includes(stat)) return "T3";
  return "off-role";
}

/**
 * Score all lesser boons for a player based on stat tiers, absolute gain, and archetype fit.
 * Returns boons sorted by score descending, excluding already-taken boons.
 */
export function scoreBoons(
  playerStats: Record<string, number>,
  role: PlayerRole,
  takenBoons: string[],
  boonList: BoonData[],
): BoonScore[] {
  const taken = new Set(takenBoons.map(b => b.toLowerCase()));
  const roleStats = new Set(ROLE_STATS[role]);

  const scores: BoonScore[] = [];

  for (const boon of boonList) {
    if (taken.has(boon.name.toLowerCase())) continue;

    const bonusEntries = Object.entries(boon.bonuses);
    const penaltyEntries = Object.entries(boon.penalties);
    if (bonusEntries.length === 0) continue;

    const [bonusStatDisplay] = bonusEntries[0];
    const [penaltyStatDisplay] = penaltyEntries[0] ?? [""];
    const bonusStat = bonusStatDisplay.toLowerCase();
    const penaltyStat = penaltyStatDisplay.toLowerCase();

    // Skip boons that boost stats outside this role entirely
    if (!roleStats.has(bonusStat)) continue;

    const bonusTier = getTier(bonusStat, role);
    const penaltyTier = penaltyStat ? getTier(penaltyStat, role) : "off-role";

    const baseBonus = playerStats[bonusStat] ?? 0;
    const basePenalty = penaltyStat ? (playerStats[penaltyStat] ?? 0) : 0;

    const absoluteGain = baseBonus * 0.5;
    const absoluteLoss = basePenalty * 0.5;

    // Score = tier weight * absolute gain (bonus) - tier weight * absolute loss (penalty)
    const bonusScore = TIER_WEIGHTS[bonusTier] * absoluteGain;

    const penaltyTierW = penaltyTier === "off-role"
      ? PENALTY_OFF_ROLE_WEIGHT
      : TIER_WEIGHTS[penaltyTier];
    const penaltyCost = penaltyTierW * absoluteLoss;

    scores.push({
      boonName: boon.name,
      emoji: boon.emoji,
      bonusStat,
      penaltyStat,
      bonusStatDisplay,
      penaltyStatDisplay,
      absoluteGain: Math.round(absoluteGain),
      absoluteLoss: Math.round(absoluteLoss),
      score: bonusScore - penaltyCost,
      bonusTier,
      penaltyTier,
    });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores;
}

