import { describe, it, expect } from "vitest";
import {
  calculatePitchEffectiveness,
  optimizePitchArsenal,
  computePitchFitPct,
} from "../optimizer";
import type { Archetype } from "../types";

describe("calculatePitchEffectiveness", () => {
  it("returns 0 for empty pitch data", () => {
    const score = calculatePitchEffectiveness(
      { velocity: 500 },
      { priority_stats: [], secondary_stats: [] }
    );
    expect(score).toBe(0);
  });

  it("returns 0 for empty stats", () => {
    const score = calculatePitchEffectiveness(
      {},
      { priority_stats: ["velocity"], secondary_stats: ["control"] }
    );
    expect(score).toBe(0);
  });

  it("weights primary stats at 0.7 and secondary at 0.3", () => {
    // primaryScore = 150, secondaryScore = 90
    // raw = 150 * 0.7 + 90 * 0.3 = 105 + 27 = 132
    // result = min(100, (132 / 1000) * 100) = 13.2
    const score = calculatePitchEffectiveness(
      { velocity: 150, control: 90 },
      { priority_stats: ["velocity"], secondary_stats: ["control"] }
    );
    expect(score).toBeCloseTo(13.2, 5);
  });

  it("caps at 100", () => {
    // primaryScore = 1000, secondaryScore = 1000
    // raw = 1000 * 0.7 + 1000 * 0.3 = 1000
    // result = min(100, (1000 / 1000) * 100) = 100 (capped)
    const score = calculatePitchEffectiveness(
      { velocity: 1000, control: 1000 },
      { priority_stats: ["velocity"], secondary_stats: ["control"] }
    );
    expect(score).toBe(100);
  });

  it("averages multiple primary stats", () => {
    // primaryScore = (120 + 60) / 2 = 90
    // secondaryScore = 0
    // raw = 90 * 0.7 = 63
    // result = min(100, (63 / 1000) * 100) = 6.3
    const score = calculatePitchEffectiveness(
      { velocity: 120, stuff: 60 },
      { priority_stats: ["velocity", "stuff"], secondary_stats: [] }
    );
    expect(score).toBeCloseTo(6.3, 5);
  });

  it("handles missing stats as 0", () => {
    // velocity=150, "missing" not in stats → 0
    // primaryScore = (150 + 0) / 2 = 75
    // raw = 75 * 0.7 = 52.5
    // result = (52.5 / 1000) * 100 = 5.25
    const score = calculatePitchEffectiveness(
      { velocity: 150 },
      { priority_stats: ["velocity", "missing"], secondary_stats: [] }
    );
    expect(score).toBe(5.25);
  });

  it("handles undefined priority_stats and secondary_stats", () => {
    const score = calculatePitchEffectiveness({ velocity: 500 }, {});
    expect(score).toBe(0);
  });
});

describe("optimizePitchArsenal", () => {
  const archetype: Archetype = {
    name: "Power Pitcher",
    description: "",
    priority_stats: ["velocity"],
    secondary_stats: ["control"],
    stat_weights: { velocity: 0.12, control: 0.08 },
    recommended_pitches: ["fastball", "slider"],
  };

  const pitchTypes = {
    fastball: {
      name: "Fastball",
      priority_stats: ["velocity"],
      secondary_stats: ["control"],
    },
    slider: {
      name: "Slider",
      priority_stats: ["control"],
      secondary_stats: ["stuff"],
    },
    changeup: {
      name: "Changeup",
      priority_stats: ["deception"],
      secondary_stats: ["control"],
    },
    knuckleball: {
      name: "Knuckleball",
      priority_stats: ["stuff"],
      secondary_stats: ["deception"],
    },
  };

  const highStats = { velocity: 800, control: 600, stuff: 400, deception: 100 };
  const lowStats = { velocity: 50, control: 50, stuff: 50, deception: 50 };

  it("keeps recommended pitches in current arsenal", () => {
    const advice = optimizePitchArsenal(
      highStats,
      ["fastball", "slider"],
      archetype,
      pitchTypes
    );
    expect(advice.keep).toContain("fastball");
    expect(advice.keep).toContain("slider");
    expect(advice.remove).toHaveLength(0);
    expect(advice.add).toHaveLength(0);
  });

  it("adds recommended pitches not in current arsenal", () => {
    const advice = optimizePitchArsenal(
      highStats,
      ["changeup"],
      archetype,
      pitchTypes
    );
    expect(advice.add.map((a) => a.pitchType)).toContain("fastball");
    expect(advice.add.map((a) => a.pitchType)).toContain("slider");
  });

  it("removes non-recommended pitches with low effectiveness", () => {
    // With lowStats, changeup effectiveness will be < 50
    const advice = optimizePitchArsenal(
      lowStats,
      ["fastball", "changeup"],
      archetype,
      pitchTypes
    );
    expect(advice.remove).toContain("changeup");
    expect(advice.keep).toContain("fastball");
  });

  it("keeps non-recommended pitches with high effectiveness", () => {
    // changeup: primary=deception, secondary=control
    // Need effectiveness >= 50, so boost deception and control
    const boostedStats = { velocity: 800, control: 900, stuff: 400, deception: 700 };
    // raw = 700*0.7 + 900*0.3 = 490 + 270 = 760
    // effectiveness = (760/1000)*100 = 76 >= 50 → keep
    const advice = optimizePitchArsenal(
      boostedStats,
      ["fastball", "changeup"],
      archetype,
      pitchTypes
    );
    expect(advice.keep).toContain("changeup");
  });

  it("limits add recommendations to 3", () => {
    const manyRecommendedArch: Archetype = {
      ...archetype,
      recommended_pitches: ["fastball", "slider", "changeup", "knuckleball"],
    };
    const advice = optimizePitchArsenal(
      highStats,
      [],
      manyRecommendedArch,
      pitchTypes
    );
    expect(advice.add.length).toBeLessThanOrEqual(3);
  });

  it("sorts add recommendations by effectiveness descending", () => {
    const advice = optimizePitchArsenal(
      highStats,
      [],
      archetype,
      pitchTypes
    );
    for (let i = 1; i < advice.add.length; i++) {
      expect(advice.add[i - 1].effectiveness).toBeGreaterThanOrEqual(
        advice.add[i].effectiveness
      );
    }
  });

  it("handles empty current pitches", () => {
    const advice = optimizePitchArsenal(highStats, [], archetype, pitchTypes);
    expect(advice.keep).toHaveLength(0);
    expect(advice.remove).toHaveLength(0);
    expect(advice.add.length).toBeGreaterThan(0);
  });

  it("handles archetype with no recommended pitches", () => {
    const noRecArch: Archetype = {
      ...archetype,
      recommended_pitches: [],
    };
    const advice = optimizePitchArsenal(
      lowStats,
      ["fastball", "changeup"],
      noRecArch,
      pitchTypes
    );
    // No recommended pitches → nothing to add
    expect(advice.add).toHaveLength(0);
    // Everything with effectiveness < 50 gets removed
    expect(advice.remove.length + advice.keep.length).toBe(2);
  });

  it("includes name and effectiveness in add entries", () => {
    const advice = optimizePitchArsenal(
      highStats,
      [],
      archetype,
      pitchTypes
    );
    for (const entry of advice.add) {
      expect(entry.name).toBeTruthy();
      expect(typeof entry.effectiveness).toBe("number");
      expect(entry.pitchType).toBeTruthy();
    }
  });
});

describe("computePitchFitPct", () => {
  const pitchTypesData = {
    sl: { name: "Slider", tier: 1 },
    fs: { name: "Splitter", tier: 1 },
    ch: { name: "Changeup", tier: 2 },
    ff: { name: "Fastball", tier: 3 },
    kc: { name: "Knuckle Curve", tier: 1 },
    fc: { name: "Cutter", tier: 2 },
  };

  const makeArch = (pitches: string[]): Archetype => ({
    name: "Test",
    description: "",
    priority_stats: [],
    secondary_stats: [],
    stat_weights: {},
    recommended_pitches: pitches,
  });

  it("returns null for archetype with no recommended pitches", () => {
    expect(computePitchFitPct(["sl"], makeArch([]), pitchTypesData)).toBeNull();
  });

  it("returns null for archetype with undefined recommended pitches", () => {
    const arch: Archetype = { name: "Test", description: "", priority_stats: [], secondary_stats: [], stat_weights: {} };
    expect(computePitchFitPct(["sl"], arch, pitchTypesData)).toBeNull();
  });

  it("returns 0 when player has none of the recommended pitches", () => {
    expect(computePitchFitPct(["ff"], makeArch(["sl", "fs", "ch"]), pitchTypesData)).toBe(0);
  });

  it("returns 100 when player has all recommended pitches", () => {
    expect(computePitchFitPct(["sl", "fs", "ch"], makeArch(["sl", "fs", "ch"]), pitchTypesData)).toBe(100);
  });

  it("returns 100 when player has extra pitches beyond recommended", () => {
    expect(computePitchFitPct(["sl", "fs", "ch", "ff", "kc"], makeArch(["sl", "fs", "ch"]), pitchTypesData)).toBe(100);
  });

  it("weights T1 pitches higher than T3", () => {
    // Recommended: sl(T1=1.5), ff(T3=0.75) → total=2.25
    // Player has ff only → matched=0.75 → 0.75/2.25=33%
    expect(computePitchFitPct(["ff"], makeArch(["sl", "ff"]), pitchTypesData)).toBe(33);
    // Player has sl only → matched=1.5 → 1.5/2.25=67%
    expect(computePitchFitPct(["sl"], makeArch(["sl", "ff"]), pitchTypesData)).toBe(67);
  });

  it("handles partial overlap with tier weighting", () => {
    // Fastball Command: sl(T1=1.5), fc(T2=1.0), ff(T3=0.75), kc(T1=1.5) → total=4.75
    // Player has sl + ff → matched=1.5+0.75=2.25 → 2.25/4.75=47%
    expect(computePitchFitPct(["sl", "ff"], makeArch(["sl", "fc", "ff", "kc"]), pitchTypesData)).toBe(47);
  });

  it("defaults to weight 1.0 for unknown pitch types", () => {
    // "xx" not in pitchTypesData → tier undefined → weight 1.0
    // Recommended: sl(1.5), xx(1.0) → total=2.5
    // Player has xx → matched=1.0 → 1.0/2.5=40%
    expect(computePitchFitPct(["xx"], makeArch(["sl", "xx"]), pitchTypesData)).toBe(40);
  });
});
