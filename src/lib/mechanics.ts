/**
 * Season 11 level-up mechanics.
 *
 * All numbers in one config object so they can be updated when
 * Danny confirms actuals after S11 launches.
 */

export const S11 = {
  maxLevel: 30,
  pointsPerLevel: 50, // expected value; actual 40-60
  boonLevels: [10, 20, 30] as const, // all Lesser, no Greater in S11
  defenseBonusLevels: [5, 15, 25] as const,
  defenseBonusAmount: 100,
  baseStatsTotal: 1500, // ~30 x 50 at level 1

  // UNCONFIRMED: do levels 5/15/25 give primary points IN ADDITION to defense?
  // Conservative: they do NOT (23 primary levels). If they do: 26 primary levels.
  defenseLevelsGivePrimary: false,

  totalPrimaryPoints: 1150, // 23 x 50 (conservative)
  totalDefensePoints: 300, // 3 x 100
  statCap: 300, // placeholder; 500 is unreachable in S11
} as const;

/**
 * Calculate total primary stat points earned by a given level.
 *
 * S11 rules:
 * - Boon levels (10, 20, 30): no stat gain (boon only)
 * - Defense levels (5, 15, 25): +100 defense bonus, no primary (conservative)
 * - All other levels: +50 primary
 */
export function calculatePrimaryPointsAtLevel(level: number): number {
  const boonSet = new Set(S11.boonLevels);
  const defenseSet = new Set(S11.defenseBonusLevels);
  let total = 0;

  for (let lvl = 2; lvl <= level; lvl++) {
    if (boonSet.has(lvl as 10 | 20 | 30)) continue;
    if (!S11.defenseLevelsGivePrimary && defenseSet.has(lvl as 5 | 15 | 25))
      continue;
    total += S11.pointsPerLevel;
  }

  return total;
}

/**
 * Calculate total defense bonus points earned by a given level.
 */
export function calculateDefensePointsAtLevel(level: number): number {
  let total = 0;
  for (const defLevel of S11.defenseBonusLevels) {
    if (level >= defLevel) total += S11.defenseBonusAmount;
  }
  return total;
}

/** Pre-computed total primary points at max level. */
export const TOTAL_PRIMARY_POINTS = calculatePrimaryPointsAtLevel(S11.maxLevel);
