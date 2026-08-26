import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  computeAttributeScore,
  computeGrowthScore,
  computePositionFitScore,
  computeComposite,
  getRecommendation,
} from "../evaluator";
import type { PositionDefenseMap } from "../evaluator-data";
import type { PlayerData, PlayerRole } from "../evaluator-types";

// ---------------------------------------------------------------------------
// Cross-engine parity: the TS engine (evaluator.ts) and the Python CLI
// (mmolb/sample_eval.py) must produce the SAME rating for a shared fixture.
//
// Both now single-source the tiers from src/data/stat-tiers.json, so this guards
// that the shared math (tier-weighted ratio -> /0.85 attribute score, growth cap,
// composite weights, thresholds) stays identical across the two languages.
//
// Fixtures are no-stats / no-fit, so the attribute score uses the fallback /0.85
// path (identical to Python) rather than the app-only live-percentile path, and
// the stats/fit pillars are absent — isolating the shared attribute+growth math.
// The committed expected values were produced BY sample_eval.py --from-file
// (see references/parity-expected.json); re-run that to confirm the Python side.
// ---------------------------------------------------------------------------

const ref = (f: string) => JSON.parse(readFileSync(join(process.cwd(), "references", f), "utf-8"));
const fixture = ref("parity-fixture.json");
const expected = ref("parity-expected.json");
const posDefense = JSON.parse(
  readFileSync(join(process.cwd(), "public/data/archetypes/position_defense_weights.json"), "utf-8"),
) as PositionDefenseMap;

function rate(fx: { role: PlayerRole; stats: Record<string, number>; level: number; position: string; has_stats?: boolean }) {
  const player = { stats: fx.stats, level: fx.level, position: fx.position, lesserBoons: [], greaterBoons: [] } as unknown as PlayerData;
  const attr = computeAttributeScore(player, fx.role); // no percentile tables -> /0.85 fallback (matches Python)
  const growth = computeGrowthScore(player);
  const stats = fx.has_stats ? 50 : null; // Python uses a flat 50 when has_stats; fixtures are no-stats
  const fit = computePositionFitScore(player, fx.role, posDefense);
  const composite = computeComposite(attr, stats, growth, fit, fx.role);
  return { attribute_score: attr, growth_score: growth, composite, tier: getRecommendation(composite) };
}

describe("cross-engine parity (TS evaluator vs Python sample_eval)", () => {
  for (const key of ["batter", "pitcher"] as const) {
    it(`${key}: TS reproduces the Python-generated rating exactly`, () => {
      const got = rate(fixture[key]);
      expect(got).toEqual({
        attribute_score: expected[key].attribute_score,
        growth_score: expected[key].growth_score,
        composite: expected[key].composite,
        tier: expected[key].tier,
      });
    });
  }
});
