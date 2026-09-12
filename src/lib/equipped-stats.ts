/**
 * Compute a player's *displayed* attribute totals with equipped items + boons
 * folded in — the "Equipment ON / Boons ON" view the game shows.
 *
 * This is DISPLAY-ONLY. It never feeds the evaluator, archetype fit, or the
 * percentile baseline (all of which stay on base stats, Equipment OFF / Boons
 * OFF — see mmolb-transform.buildBaseStatMap). It exists so the builder can show
 * "what a player actually has" at a glance without hand math.
 *
 * Model (calibrated against the live game — Parallax Wolfbox, Lv22 SP, all four
 * Equipment/Boons checkbox states, 2026-09-11; see the golden test):
 *   - Each lesser boon applies +25% to one attribute and -10% to another, on the
 *     base value; multiple boons on the same stat stack additively.
 *   - Item flats add fixed points to the attribute (FlatBonus, display scale).
 *   - Item percents are multipliers (Multiplier, ItemEffect.value = percent number).
 *   - The flat is added to the base FIRST, then the combined percent multiplier
 *     (items + boons) applies to that sum:
 *       total = (base + Σitem_flat) × (1 + Σitem_pct + Σboon_pct), clamp [0, 1000].
 *   Every calibrated stat reproduces the game's "both on" column exactly this way
 *   (e.g. Control (341+16)×(1+0.10+0.25)=482; Deception (0+62)×(1-0.10)=56).
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
    const raw = (base + itemFlat) * (1 + boonPct + itemPctNum / 100);
    const total = Math.max(0, Math.min(ATTR_MAX, Math.round(raw)));
    out[stat] = { base, itemFlat, itemPct: itemPctNum, boonPct, total };
  }
  return out;
}

/**
 * Build the attribute map used for an owned player's defensive placement.
 * Equipment is included, while boons are deliberately excluded: this is the
 * plotter's "items on" view, not a replacement for the base-stat evaluator.
 */
export function computeItemAdjustedStats(player: PlayerData): Record<string, number> {
  const itemOnlyPlayer: PlayerData = {
    ...player,
    lesserBoons: [],
    greaterBoons: [],
  };
  return Object.fromEntries(
    Object.entries(computeEquippedStats(itemOnlyPlayer, new Map())).map(([stat, value]) => [
      stat,
      value.total,
    ]),
  );
}

/** True if any stat's total differs from its base (i.e. the toggle is meaningful). */
export function hasGearEffect(equipped: Record<string, EquippedStat>): boolean {
  for (const s of Object.values(equipped)) {
    if (s.total !== s.base) return true;
  }
  return false;
}
