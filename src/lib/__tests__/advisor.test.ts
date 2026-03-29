import { describe, it, expect } from "vitest";
import {
  recommendStatPriorities,
  recommendBoonsByLevel,
  getLevelUpSummary,
} from "../advisor";
import type { Archetype } from "../optimizer";

const mockArchetype: Archetype = {
  name: "Power Pitcher",
  description: "High velocity generates strikeouts.",
  priority_stats: ["velocity", "rotation", "control"],
  secondary_stats: ["stuff", "stamina", "presence"],
  stat_weights: {
    velocity: 0.12,
    rotation: 0.12,
    control: 0.12,
    stuff: 0.08,
    stamina: 0.08,
    presence: 0.08,
  },
  recommended_lesser_boons: ["Draconic", "Fire Elemental", "Charger"],
};

const mockStats: Record<string, number> = {
  velocity: 50,
  rotation: 40,
  control: 30,
  stuff: 20,
  stamina: 25,
  presence: 15,
};

describe("recommendStatPriorities", () => {
  it("returns recommendations sorted by priority score", () => {
    const recs = recommendStatPriorities(mockStats, mockArchetype, 5);
    expect(recs.length).toBeLessThanOrEqual(5);
    expect(recs.length).toBeGreaterThan(0);

    // Should be sorted by priorityScore descending
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].priorityScore).toBeGreaterThanOrEqual(
        recs[i].priorityScore
      );
    }
  });

  it("identifies core stats as core stat in reasoning", () => {
    const recs = recommendStatPriorities(mockStats, mockArchetype, 10);
    const velocityRec = recs.find((r) => r.statName === "velocity");
    expect(velocityRec?.reasoning).toContain("core stat");
  });

  it("identifies secondary stats as supporting stat", () => {
    const recs = recommendStatPriorities(mockStats, mockArchetype, 10);
    const staminaRec = recs.find((r) => r.statName === "stamina");
    expect(staminaRec?.reasoning).toContain("supporting stat");
  });

  it("respects edited stat targets", () => {
    const customArch = {
      ...mockArchetype,
      stat_targets: { velocity: 250 },
    };
    const recs = recommendStatPriorities(mockStats, customArch, 10);
    const velocityRec = recs.find((r) => r.statName === "velocity");
    expect(velocityRec?.target).toBe(250);
  });
});

describe("recommendBoonsByLevel", () => {
  it("returns 3 entries for S11 (levels 10, 20, 30)", () => {
    const timeline = recommendBoonsByLevel(1, mockArchetype);
    expect(timeline).toHaveLength(3);
    expect(timeline.map((t) => t.level)).toEqual([10, 20, 30]);
  });

  it("marks all as not acquired for level 1 player", () => {
    const timeline = recommendBoonsByLevel(1, mockArchetype);
    expect(timeline.every((t) => !t.acquired)).toBe(true);
  });

  it("marks first boon as acquired for level 15 player", () => {
    const timeline = recommendBoonsByLevel(15, mockArchetype);
    expect(timeline[0].acquired).toBe(true); // level 10
    expect(timeline[1].acquired).toBe(false); // level 20
    expect(timeline[2].acquired).toBe(false); // level 30
  });

  it("filters out taken boons", () => {
    const timeline = recommendBoonsByLevel(1, mockArchetype, {
      lesser: ["Draconic"],
      greater: [],
    });
    // "Draconic" should not appear in any recommendations
    for (const entry of timeline) {
      expect(
        entry.recommendations.map((r) => r.toLowerCase())
      ).not.toContain("draconic");
    }
  });

  it("does not recommend same boon at multiple levels", () => {
    const timeline = recommendBoonsByLevel(1, mockArchetype);
    // The top pick for level 10 should not appear in level 20 or 30
    const pick10 = timeline[0].recommendations[0]?.toLowerCase();
    if (pick10) {
      expect(
        timeline[1].recommendations.map((r) => r.toLowerCase())
      ).not.toContain(pick10);
    }
  });

  it("all entries are lesser category in S11", () => {
    const timeline = recommendBoonsByLevel(1, mockArchetype);
    expect(timeline.every((t) => t.boonCategory === "lesser")).toBe(true);
  });
});

describe("getLevelUpSummary", () => {
  it("returns progress percent and top 3 stats", () => {
    const summary = getLevelUpSummary(mockStats, mockArchetype);
    expect(summary.top3Stats.length).toBeLessThanOrEqual(3);
    expect(typeof summary.progressPercent).toBe("number");
    expect(summary.archetype).toBe("Power Pitcher");
  });
});
