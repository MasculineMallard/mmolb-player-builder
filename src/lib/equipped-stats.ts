/**
 * Compute a player's *displayed* attribute totals with equipped items + boons
 * folded in — the "Equipment ON / Boons ON" view the game shows.
 *
 * This is DISPLAY-ONLY. It never feeds the evaluator, archetype fit, or the
 * percentile baseline (all of which stay on base stats, Equipment OFF / Boons
 * OFF — see mmolb-transform.buildBaseStatMap). It exists so the builder can show
 * "what a player actually has" at a glance without hand math.
 *
 * Model (from the mmolb skill references):
 *   - Boons apply ±50% to an attribute's BASE value, stacking additively
 *     (two +50% = +100% of base). boons.md: "displayed = base × (1 + Σboon%)".
 *   - Item flats add fixed points to the attribute (ItemEffect.value, display scale).
 *   - Item percents apply to the base attribute (ItemEffect.value = percent number).
 *   total = base × (1 + Σboon% + Σitem%) + Σitem_flat, clamped to [0, 1000].
 *
 * ASSUMPTION (documented, flagged for QA against the live game): boons multiply
 * BASE only, so item flats are NOT boon-amplified, and item percents are treated
 * as percent-of-base (not compounded on top of the boon). If the game turns out
 * to compound differently, it is a one-line change in the total formula below.
 */

import { computeBoonMultipliers } from "./item-advisor";
import type { PlayerData } from "./types";

interface BoonEffect {
  bonuses: Record<string, number>;
  penalties: Record<string, number>;
}

/** Attribute ceiling — the game clamps attributes to 0-1000. */
const ATTR_MAX = 1000;

export interface EquippedStat {
  /** Base attribute (Equipment OFF, Boons OFF). */
  base: number;
  /** Sum of flat item bonuses to this stat (display points). */
  itemFlat: number;
  /** Sum of item percent bonuses to this stat (percent number, e.g. 3 = +3%). */
  itemPct: number;
  /** Net boon percent for this stat as a fraction (e.g. 0.5 = +50%, -0.5 = -50%). */
  boonPct: number;
  /** Displayed total with items + boons, clamped to [0, 1000]. */
  total: number;
}

/**
 * Build a per-stat breakdown + total for a player's equipped items and boons.
 * Returns an entry for every stat that has a base value OR an item contribution.
 */
export function computeEquippedStats(
  player: PlayerData,
  boonLookup: Map<string, BoonEffect>,
): Record<string, EquippedStat> {
  const boonMult = computeBoonMultipliers(
    [...player.lesserBoons, ...player.greaterBoons],
    boonLookup,
  );

  // Sum actual equipped item effects per stat.
  const flat: Record<string, number> = {};
  const pct: Record<string, number> = {};
  for (const slot of Object.values(player.equipment ?? {})) {
    for (const e of slot.effects ?? []) {
      const key = e.attribute.toLowerCase();
      if (e.type === "flat") flat[key] = (flat[key] ?? 0) + e.value;
      else pct[key] = (pct[key] ?? 0) + e.value;
    }
  }

  const statKeys = new Set<string>([
    ...Object.keys(player.stats),
    ...Object.keys(flat),
    ...Object.keys(pct),
  ]);

  const out: Record<string, EquippedStat> = {};
  for (const stat of statKeys) {
    const base = player.stats[stat] ?? 0;
    const boonPct = (boonMult[stat] ?? 1) - 1;
    const itemFlat = flat[stat] ?? 0;
    const itemPctNum = pct[stat] ?? 0;
    const raw = base * (1 + boonPct + itemPctNum / 100) + itemFlat;
    const total = Math.max(0, Math.min(ATTR_MAX, Math.round(raw)));
    out[stat] = { base, itemFlat, itemPct: itemPctNum, boonPct, total };
  }
  return out;
}

/** True if any stat's total differs from its base (i.e. the toggle is meaningful). */
export function hasGearEffect(equipped: Record<string, EquippedStat>): boolean {
  for (const s of Object.values(equipped)) {
    if (s.total !== s.base) return true;
  }
  return false;
}
