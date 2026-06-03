import { describe, it, expect } from "vitest";
import {
  percentileToScore,
  computeStatsScore,
  computeComposite,
  getRecommendation,
} from "../evaluator";
import {
  BATTING_STAT_WEIGHTS,
  PITCHING_STAT_WEIGHTS,
  COMPOSITE_WEIGHTS,
  getCompositeWeights,
} from "../evaluator-data";
import type { PercentileEntry, GameStats } from "../evaluator-types";

// best-first tables (table[0] = best, table[last] = worst)
const hi: PercentileEntry[] = [
  { pct: 5, value: 100 },
  { pct: 50, value: 50 },
  { pct: 95, value: 10 },
]; // higher value = better
const lo: PercentileEntry[] = [
  { pct: 5, value: 1.0 },
  { pct: 50, value: 3.0 },
  { pct: 95, value: 6.0 },
]; // lower value = better

describe("percentileToScore", () => {
  it("returns a neutral 50 for an empty table (blocker #1 guard)", () => {
    expect(percentileToScore(0.5, [])).toBe(50);
  });

  it("caps at 97 for better-than-best, floors at 3 for worse-than-worst", () => {
    expect(percentileToScore(200, hi)).toBe(97);
    expect(percentileToScore(5, hi)).toBe(3);
  });

  it("interpolates the median to ~50 (higher-is-better)", () => {
    expect(percentileToScore(50, hi)).toBe(50);
  });

  it("handles lower-is-better tables (low value scores high)", () => {
    expect(percentileToScore(0.5, lo)).toBe(97); // better than best
    expect(percentileToScore(3.0, lo)).toBe(50); // median
    expect(percentileToScore(10, lo)).toBe(3); // worse than worst
  });
});

describe("computeStatsScore", () => {
  const tables = { batting: { OBP: hi, SLG: hi }, pitching: {} };

  it("returns null when there are no game stats", () => {
    expect(computeStatsScore("batter", null, tables)).toBeNull();
  });

  it("skips empty percentile tables without crashing (blocker #1 guard)", () => {
    const withEmpty = {
      batting: { OBP: hi, SLG: [] as PercentileEntry[] },
      pitching: {},
    };
    // SLG's table is empty (sparse early-season case); only OBP should score.
    const score = computeStatsScore("batter", { OBP: 50, SLG: 50 } as GameStats, withEmpty);
    expect(score).toBe(50);
  });

  it("weights and renormalizes the present stats", () => {
    // OBP=100 -> 97, SLG=10 -> 3, equal .30 weights -> (97 + 3) / 2 = 50
    const score = computeStatsScore("batter", { OBP: 100, SLG: 10 } as GameStats, tables);
    expect(score).toBe(50);
  });
});

describe("COMPOSITE_WEIGHTS / getCompositeWeights", () => {
  it("every scenario sums to 1.0", () => {
    for (const role of ["batter", "pitcher"] as const) {
      for (const key of ["all", "statsOnly", "fitOnly", "neither"] as const) {
        const w = COMPOSITE_WEIGHTS[role][key];
        expect(w.attr + w.stats + w.fit + w.growth).toBeCloseTo(1.0, 5);
      }
    }
  });

  it("batter all-pillar weights are 20/40/20/20 (engine + display single source)", () => {
    expect(getCompositeWeights("batter", true, true)).toEqual({
      attr: 0.2,
      stats: 0.4,
      fit: 0.2,
      growth: 0.2,
    });
  });

  it("selects the right scenario by which pillars are present", () => {
    expect(getCompositeWeights("batter", true, false)).toBe(COMPOSITE_WEIGHTS.batter.statsOnly);
    expect(getCompositeWeights("batter", false, true)).toBe(COMPOSITE_WEIGHTS.batter.fitOnly);
    expect(getCompositeWeights("pitcher", false, false)).toBe(COMPOSITE_WEIGHTS.pitcher.neither);
  });
});

describe("computeComposite", () => {
  it("computes a batter with all four pillars present", () => {
    // attr 80, stats 60, growth 20, fit 40 -> .20*80 + .40*60 + .20*40 + .20*20 = 52
    expect(computeComposite(80, 60, 20, 40, "batter")).toBe(52);
  });

  it("drops absent pillars (DH batter, no fit)", () => {
    // statsOnly: .25*80 + .50*60 + .25*20 = 55
    expect(computeComposite(80, 60, 20, null, "batter")).toBe(55);
  });
});

describe("getRecommendation", () => {
  it("maps composite scores to verdict tiers at the documented thresholds", () => {
    expect(getRecommendation(70)).toBe("STAR");
    expect(getRecommendation(65)).toBe("STAR");
    expect(getRecommendation(64)).toBe("STRONG");
    expect(getRecommendation(55)).toBe("STRONG");
    expect(getRecommendation(54)).toBe("ROSTER");
    expect(getRecommendation(42)).toBe("ROSTER");
    expect(getRecommendation(41)).toBe("FRINGE");
    expect(getRecommendation(35)).toBe("FRINGE");
    expect(getRecommendation(34)).toBe("MULCH");
    expect(getRecommendation(0)).toBe("MULCH");
  });
});

describe("stat weight invariants", () => {
  it("batting stat weights sum to 1.0", () => {
    const sum = Object.values(BATTING_STAT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("pitching stat weights sum to 1.0", () => {
    const sum = Object.values(PITCHING_STAT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
});
