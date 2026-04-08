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
  // UNCONFIRMED: do levels 5/15/25 give primary points IN ADDITION to defense?
  // Conservative: they do NOT (23 primary levels). If they do: 26 primary levels.
  defenseLevelsGivePrimary: false,

  totalPrimaryPoints: 1150, // 23 x 50 (conservative)
} as const;

/**
 * Calculate total primary stat points earned by a given level.
 *
 * S11 rules:
 * - Boon levels (10, 20, 30): no stat gain (boon only)
 * - Defense levels (5, 15, 25): +100 defense bonus, no primary (conservative)
 * - All other levels: +50 primary
 */
const boonSet = new Set<number>(S11.boonLevels);
const defenseSet = new Set<number>(S11.defenseBonusLevels);

// Pre-compute points at each level (0..maxLevel) for O(1) lookup
const _pointsAtLevel: number[] = [0, 0]; // level 0 and 1 both 0
for (let lvl = 2; lvl <= S11.maxLevel; lvl++) {
  const skip = boonSet.has(lvl) || (!S11.defenseLevelsGivePrimary && defenseSet.has(lvl));
  _pointsAtLevel[lvl] = _pointsAtLevel[lvl - 1] + (skip ? 0 : S11.pointsPerLevel);
}

export function calculatePrimaryPointsAtLevel(level: number): number {
  if (level >= 0 && level <= S11.maxLevel) return _pointsAtLevel[level];
  // Fallback for out-of-range (shouldn't happen in practice)
  let total = 0;
  for (let lvl = 2; lvl <= level; lvl++) {
    if (boonSet.has(lvl)) continue;
    if (!S11.defenseLevelsGivePrimary && defenseSet.has(lvl)) continue;
    total += S11.pointsPerLevel;
  }
  return total;
}

/** Pre-computed total primary points at max level. */
export const TOTAL_PRIMARY_POINTS = _pointsAtLevel[S11.maxLevel];

/** Average initial stat points per attribute (1000 total / 12 stats). */
export const INITIAL_PER_STAT = Math.floor(1000 / 12); // 83

/**
 * Compute level-scaled stat targets for archetype fit scoring.
 * Uses points earned at the given level to set realistic expectations.
 * At level 30 with 3/3 archetypes: core=274, support=198.
 */
export function calculateFitTargets(
  level: number,
  nCore: number,
  nSupport: number,
): { coreTarget: number; supportTarget: number } {
  const pts = calculatePrimaryPointsAtLevel(level);
  const coreTarget = Math.floor(pts * 0.5 / Math.max(nCore, 1)) + INITIAL_PER_STAT;
  const supportTarget = Math.floor(pts * 0.3 / Math.max(nSupport, 1)) + INITIAL_PER_STAT;
  return { coreTarget, supportTarget };
}

if (process.env.NODE_ENV === "development") {
  console.warn(
    "[mechanics] UNCONFIRMED: defenseLevelsGivePrimary=%s, totalPrimaryPoints=%d. " +
    "Verify against actual S11 data when available.",
    S11.defenseLevelsGivePrimary,
    TOTAL_PRIMARY_POINTS
  );
}
