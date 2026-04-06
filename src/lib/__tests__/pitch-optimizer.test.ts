import { describe, it, expect } from "vitest";
import {
  calculatePitchEffectiveness,
  optimizePitchArsenal,
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
    // result = min(100, (132 / 300) * 100) = 44
    const score = calculatePitchEffectiveness(
      { velocity: 150, control: 90 },
      { priority_stats: ["velocity"], secondary_stats: ["control"] }
    );
    expect(score).toBe(44);
  });

  it("caps at 100", () => {
    // primaryScore = 500, secondaryScore = 500
    // raw = 500 * 0.7 + 500 * 0.3 = 500
    // result = min(100, (500 / 300) * 100) = 100 (capped)
    const score = calculatePitchEffectiveness(
      { velocity: 500, control: 500 },
      { priority_stats: ["velocity"], secondary_stats: ["control"] }
    );
    expect(score).toBe(100);
  });

  it("averages multiple primary stats", () => {
    // primaryScore = (120 + 60) / 2 = 90
    // secondaryScore = 0
    // raw = 90 * 0.7 = 63
    // result = min(100, (63 / 300) * 100) ≈ 21
    const score = calculatePitchEffectiveness(
      { velocity: 120, stuff: 60 },
      { priority_stats: ["velocity", "stuff"], secondary_stats: [] }
    );
    expect(score).toBeCloseTo(21, 5);
  });

  it("handles missing stats as 0", () => {
    // velocity=150, "missing" not in stats → 0
    // primaryScore = (150 + 0) / 2 = 75
    // raw = 75 * 0.7 = 52.5
    // result = (52.5 / 300) * 100 = 17.5
    const score = calculatePitchEffectiveness(
      { velocity: 150 },
      { priority_stats: ["velocity", "missing"], secondary_stats: [] }
    );
    expect(score).toBe(17.5);
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
    // changeup with highStats: primary=deception(100), secondary=control(600)
    // raw = 100*0.7 + 600*0.3 = 70 + 180 = 250
    // effectiveness = (250/300)*100 = 83.3 >= 50 → keep
    const advice = optimizePitchArsenal(
      highStats,
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
