/**
 * Item Shopping Advisor calculation engine.
 *
 * Analyzes a batter's stat needs (archetype + defense + boon synergy)
 * and builds the "ideal item" for each equipment slot.
 *
 * Items roll 3 offensive + 2 defensive attributes per slot.
 * Same attribute can appear twice: once flat (+X) and once % (+X%).
 * Luck/Greed only appear on Charms (batter accessory).
 */

import { calculateStatTargets } from "./optimizer";
import { calculateDefenseTarget, remainingDefenseBonusLevels } from "./mechanics";
import type { Archetype, PlayerData } from "./types";
import type { PositionDefenseMap } from "./evaluator-data";
import { createJsonCache, isNonArrayObject } from "./json-cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatNeed {
  stat: string;
  currentValue: number;
  archetypeGap: number;
  defenseGap: number;
  archetypeWeight: number;
  defenseWeight: number;
  boonMultiplier: number;
  combinedScore: number;
  category: "archetype" | "defense" | "both" | "none";
  reason: string;
}

export interface StatPick {
  stat: string;
  score: number;
  reason: string;
  category: "archetype" | "defense" | "both" | "none";
}

export interface SlotRecommendation {
  slot: SlotName;
  label: string;
  emoji: string;
  priority: number;
  offensivePicks: StatPick[];
  defensivePicks: StatPick[];
  allOffensive: string[];
  allDefensive: string[];
}

export type SlotName = "head" | "body" | "hands" | "feet" | "charm";

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

interface SlotAttributes {
  offensive?: string[];
  defensive?: string[];
  all?: string[];
}

interface ItemSlotData {
  batter: Record<string, SlotAttributes>;
}

export const loadItemSlotAttributes = createJsonCache<ItemSlotData>(
  "/data/item_slot_attributes.json",
  (d): d is ItemSlotData => isNonArrayObject(d) && "batter" in d,
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLOT_META: Record<SlotName, { label: string; emoji: string }> = {
  head: { label: "Helmet", emoji: "🪖" },
  body: { label: "Jersey", emoji: "👕" },
  hands: { label: "Gloves", emoji: "🧤" },
  feet: { label: "Boots", emoji: "🥾" },
  charm: { label: "Charm", emoji: "🧿" },
};

const SLOT_ORDER: SlotName[] = ["head", "body", "hands", "feet", "charm"];

/** Dedup reduction based on how many slots can roll a stat. */
const DEDUP_REDUCTION: Record<number, number> = { 1: 1.0, 2: 1.0, 3: 0.6 };
const DEDUP_DEFAULT = 0.4; // 4+ slots

/** Minimum score for stats at/above target (keeps them in rankings). */
const MET_TARGET_FLOOR = 0.01;

// ---------------------------------------------------------------------------
// Boon multiplier computation
// ---------------------------------------------------------------------------

interface BoonEffect {
  bonuses: Record<string, number>;
  penalties: Record<string, number>;
}

/**
 * Build a stat → boon multiplier map from the player's boons.
 * +50% boon = items are 1.5x effective. Two +50% = 2.0x.
 * -50% penalty = items are 0.5x effective.
 */
export function computeBoonMultipliers(
  playerBoons: string[],
  boonLookup: Map<string, BoonEffect>,
): Record<string, number> {
  const multipliers: Record<string, number> = {};

  for (const boonName of playerBoons) {
    const boon = boonLookup.get(boonName);
    if (!boon) continue;

    for (const [stat, value] of Object.entries(boon.bonuses)) {
      const key = stat.toLowerCase();
      multipliers[key] = (multipliers[key] ?? 1.0) + value / 100;
    }
    for (const [stat, value] of Object.entries(boon.penalties)) {
      const key = stat.toLowerCase();
      multipliers[key] = (multipliers[key] ?? 1.0) - value / 100;
    }
  }

  return multipliers;
}

// ---------------------------------------------------------------------------
// Step 1: Stat Need Analysis — ranks ALL archetype + defense stats
// ---------------------------------------------------------------------------

export function analyzeStatNeeds(
  player: PlayerData,
  archetype: Archetype,
  positionDefense: PositionDefenseMap,
  boonMultipliers: Record<string, number>,
): StatNeed[] {
  const { corePer, supportPer } = calculateStatTargets(archetype);
  const prioritySet = new Set(archetype.priority_stats ?? []);
  const secondarySet = new Set(archetype.secondary_stats ?? []);
  const editedTargets = archetype.stat_targets ?? {};

  // Defense data for this position
  const posDef = player.position ? positionDefense[player.position] : undefined;
  const defWeights = posDef?.stat_weights ?? {};

  // Future defense bonus levels reduce defense urgency
  const futureDefenseLevels = remainingDefenseBonusLevels(player.level);
  const defenseStatCount = Object.keys(defWeights).length || 1;
  const futureDefensePerStat = (futureDefenseLevels * 100) / defenseStatCount;

  // Collect ALL stats from archetype + defense (not just those with gaps)
  const allStats = new Set<string>();
  for (const s of [...(archetype.priority_stats ?? []), ...(archetype.secondary_stats ?? [])]) {
    allStats.add(s);
  }
  for (const s of Object.keys(defWeights)) {
    allStats.add(s);
  }

  const needs: StatNeed[] = [];

  for (const stat of allStats) {
    const current = player.stats[stat] ?? 0;

    // Archetype gap
    let archetypeTarget = 0;
    let archetypeWeight = 0;
    if (editedTargets[stat] !== undefined) {
      archetypeTarget = editedTargets[stat];
      archetypeWeight = prioritySet.has(stat) ? 0.12 : secondarySet.has(stat) ? 0.08 : 0;
    } else if (prioritySet.has(stat)) {
      archetypeTarget = corePer;
      archetypeWeight = 0.12;
    } else if (secondarySet.has(stat)) {
      archetypeTarget = supportPer;
      archetypeWeight = 0.08;
    }
    const archetypeGap = Math.max(archetypeTarget - current, 0);

    // Defense gap
    const defWeight = defWeights[stat] ?? 0;
    let defenseGap = 0;
    if (defWeight > 0) {
      const defTarget = calculateDefenseTarget(defWeight);
      defenseGap = Math.max(defTarget - current - futureDefensePerStat, 0);
    }

    // Boon multiplier
    const boonMult = boonMultipliers[stat] ?? 1.0;

    // Diminishing returns on base stat value
    let dimFactor = 1.0;
    if (current > 850) dimFactor = 0.5;
    else if (current > 700) dimFactor = 0.75;

    // Score: stats with gaps get full scoring, stats at target get a floor
    let combinedScore: number;
    if (archetypeGap > 0 || defenseGap > 0) {
      combinedScore =
        ((archetypeGap * archetypeWeight) + (defenseGap * defWeight)) *
        boonMult * dimFactor;
    } else {
      // At/above target: still rank by weight so ideal items include core stats
      combinedScore = (archetypeWeight + defWeight) * MET_TARGET_FLOOR;
    }

    // Categorize
    let category: StatNeed["category"] = "none";
    if (archetypeWeight > 0 && defWeight > 0) category = "both";
    else if (archetypeWeight > 0) category = "archetype";
    else if (defWeight > 0) category = "defense";

    // Build reason
    const parts: string[] = [];
    if (archetypeWeight > 0) {
      const tier = prioritySet.has(stat) ? "Core" : "Support";
      if (archetypeGap > 0) {
        const urgency = archetypeGap > 200 ? "critical" : archetypeGap > 100 ? "significant" : "minor";
        parts.push(`${tier} stat, ${urgency} gap (${archetypeGap})`);
      } else {
        parts.push(`${tier} stat (at target)`);
      }
    }
    if (defWeight > 0) {
      if (defenseGap > 0) {
        parts.push(`${player.position} defense (gap ${defenseGap})`);
      } else {
        parts.push(`${player.position} defense (met)`);
      }
    }
    if (boonMult > 1.0) {
      parts.push(`+${Math.round((boonMult - 1) * 100)}% boon`);
    } else if (boonMult < 1.0) {
      parts.push(`${Math.round((boonMult - 1) * 100)}% boon`);
    }

    needs.push({
      stat,
      currentValue: current,
      archetypeGap,
      defenseGap,
      archetypeWeight,
      defenseWeight: defWeight,
      boonMultiplier: boonMult,
      combinedScore,
      category,
      reason: parts.join("; "),
    });
  }

  needs.sort((a, b) => b.combinedScore - a.combinedScore);
  return needs;
}

// ---------------------------------------------------------------------------
// Step 2: Slot Recommendations
// ---------------------------------------------------------------------------

function countStatSlots(
  stat: string,
  slotData: Record<string, SlotAttributes>,
): number {
  let count = 0;
  for (const slot of SLOT_ORDER) {
    const attrs = slotData[slot];
    if (!attrs) continue;
    const pool = [...(attrs.offensive ?? []), ...(attrs.defensive ?? []), ...(attrs.all ?? [])];
    if (pool.includes(stat)) count++;
  }
  return count;
}

export function recommendItems(
  statNeeds: StatNeed[],
  slotData: Record<string, SlotAttributes>,
  archetype: Archetype,
): SlotRecommendation[] {
  const equipAffixes = new Set(archetype.equipment_affixes ?? []);
  const equipPriority = archetype.equipment_priority ?? [];

  // Build a working copy of scores we can mutate for dedup
  const scoreMap = new Map<string, number>();
  for (const need of statNeeds) {
    let score = need.combinedScore;
    if (equipAffixes.has(need.stat)) score *= 1.2;
    scoreMap.set(need.stat, score);
  }

  // Need lookup for reason/category
  const needMap = new Map<string, StatNeed>();
  for (const need of statNeeds) needMap.set(need.stat, need);

  // Pre-compute slot counts for dedup
  const slotCounts = new Map<string, number>();
  for (const need of statNeeds) {
    slotCounts.set(need.stat, countStatSlots(need.stat, slotData));
  }

  const recommendations: SlotRecommendation[] = [];
  const usedTopPicks = new Set<string>();

  // Process slots in equipment_priority order, then remaining
  const orderedSlots = [
    ...equipPriority.filter((s): s is SlotName => SLOT_ORDER.includes(s as SlotName)),
    ...SLOT_ORDER.filter((s) => !equipPriority.includes(s)),
  ];

  for (const slot of orderedSlots) {
    const attrs = slotData[slot];
    if (!attrs) continue;
    const meta = SLOT_META[slot];

    const offPool = attrs.offensive ?? [];
    const defPool = attrs.defensive ?? [];

    // Score and rank picks
    const offPicks = rankPool(offPool, scoreMap, needMap);
    const defPicks = rankPool(defPool, scoreMap, needMap);

    // Apply dedup
    const topOff = offPicks[0];
    if (topOff && !usedTopPicks.has(topOff.stat)) {
      usedTopPicks.add(topOff.stat);
      const slots = slotCounts.get(topOff.stat) ?? 1;
      const reduction = DEDUP_REDUCTION[slots] ?? DEDUP_DEFAULT;
      if (reduction < 1.0) {
        scoreMap.set(topOff.stat, (scoreMap.get(topOff.stat) ?? 0) * reduction);
      }
    }

    recommendations.push({
      slot,
      label: meta.label,
      emoji: meta.emoji,
      priority: 0,
      offensivePicks: offPicks.slice(0, 3),
      defensivePicks: defPicks.slice(0, 2),
      allOffensive: offPool,
      allDefensive: defPool,
    });
  }

  // Assign priority 1-5
  const scored = recommendations.map((r) => ({
    rec: r,
    maxScore: Math.max(
      r.offensivePicks[0]?.score ?? 0,
      r.defensivePicks[0]?.score ?? 0,
    ),
  }));
  scored.sort((a, b) => b.maxScore - a.maxScore);
  scored.forEach(({ rec }, i) => { rec.priority = i + 1; });

  return scored.map(({ rec }) => rec);
}

function rankPool(
  pool: string[],
  scoreMap: Map<string, number>,
  needMap: Map<string, StatNeed>,
): StatPick[] {
  return pool
    .map((stat) => {
      const score = scoreMap.get(stat) ?? 0;
      const need = needMap.get(stat);
      return {
        stat,
        score,
        reason: need?.reason ?? "",
        category: need?.category ?? ("none" as const),
      };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Stat Projection
// ---------------------------------------------------------------------------

/**
 * Project what a stat will be after applying an item bonus.
 * Flat: adds directly (amplified by boon).
 * Pct: multiplier on current value.
 * Both on same stat: (current + flat) * (1 + pct/100).
 */
export function projectStat(
  current: number,
  type: "flat" | "pct",
  value: number,
  boonMultiplier: number,
): number {
  if (type === "flat") {
    return current + (value * boonMultiplier);
  }
  return current * (1 + value / 100);
}

/**
 * Project a stat with both flat and percentage bonuses applied.
 */
export function projectStatCombined(
  current: number,
  flatValue: number,
  pctValue: number,
  boonMultiplier: number,
): number {
  const afterFlat = current + (flatValue * boonMultiplier);
  return afterFlat * (1 + pctValue / 100);
}

// ---------------------------------------------------------------------------
// Summary generation
// ---------------------------------------------------------------------------

export function generateShopSummary(
  recommendations: SlotRecommendation[],
  archetype: Archetype,
): { headline: string; detail: string } {
  if (recommendations.length === 0) {
    return {
      headline: "No item recommendations available",
      detail: "Select an archetype to see shopping recommendations.",
    };
  }

  const top = recommendations[0];
  const topStat = top.offensivePicks[0]?.stat ?? top.defensivePicks[0]?.stat;

  const slotsWithGaps = recommendations.filter(
    (r) => r.offensivePicks.some((p) => p.score > MET_TARGET_FLOOR) ||
           r.defensivePicks.some((p) => p.score > MET_TARGET_FLOOR),
  ).length;

  const headline = topStat
    ? `Priority: ${top.label} with ${topStat}`
    : `Start with ${top.label}`;

  const detail = slotsWithGaps <= 2
    ? `${slotsWithGaps} of 5 slots have meaningful gaps. Focus your coins here.`
    : `${slotsWithGaps} of 5 slots have gaps. ${top.label} and ${recommendations[1]?.label ?? "Charm"} first if budget is limited.`;

  return { headline, detail };
}
