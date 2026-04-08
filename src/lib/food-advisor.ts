import type { StatRecommendation } from "./advisor";

export interface FoodItem {
  name: string;
  emoji: string;
  stat: string;
}

export type FoodMap = Record<string, FoodItem>;

export interface FoodRecommendation {
  food: FoodItem;
  stat: string;
  current: number;
  target: number;
  gap: number;
  count: number;
}

/**
 * Recommend which foods to feed before the next level-up.
 *
 * Takes the stat recommendations (which already encode gaps and priority)
 * and maps them to the corresponding food items. Returns top `slots` foods,
 * allowing duplicates if one stat's gap is large enough to warrant multiple.
 */
export function recommendFoods(
  recommendations: StatRecommendation[],
  foods: FoodMap,
  slots = 3
): FoodRecommendation[] {
  const behind = recommendations
    .filter((r) => r.gap > 0 && foods[r.statName])
    .sort((a, b) => b.priorityScore - a.priorityScore);

  if (behind.length === 0) return [];

  const result: FoodRecommendation[] = [];
  let remaining = slots;

  for (const rec of behind) {
    if (remaining <= 0) break;
    const food = foods[rec.statName];
    if (!food) continue;

    // If this stat has a massive gap relative to others, recommend 2x
    const count =
      remaining >= 2 && rec.gap > 150 && behind.length > 1 && result.length === 0
        ? 2
        : 1;

    result.push({
      food,
      stat: rec.statName,
      current: rec.current,
      target: rec.target,
      gap: rec.gap,
      count,
    });
    remaining -= count;
  }

  return result;
}
