import { describe, it, expect } from "vitest";
import {
  recommendStatPriorities,
  recommendBoonsByLevel,
} from "../advisor";
import type { Archetype } from "../types";

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

  it("gives correct targets for archetypes with 4+ priority stats", () => {
    const fourStatArch: Archetype = {
      name: "Versatile Pitcher",
      description: "Well-rounded.",
      priority_stats: ["velocity", "rotation", "control", "stuff"],
      secondary_stats: ["stamina", "presence"],
      stat_weights: {
        velocity: 0.10,
        rotation: 0.10,
        control: 0.10,
        stuff: 0.10,
        stamina: 0.08,
        presence: 0.08,
      },
    };

    const recs = recommendStatPriorities(mockStats, fourStatArch, 10);

    // All 4 priority stats should get the same corePer target (not 100)
    const velocityRec = recs.find((r) => r.statName === "velocity");
    const stuffRec = recs.find((r) => r.statName === "stuff");

    // corePer = floor(1150 * 0.5 / 4) = 143
    expect(velocityRec?.target).toBe(143);
    expect(stuffRec?.target).toBe(143);
    expect(stuffRec?.reasoning).toContain("core stat");
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

  it("marks no boons as acquired for level 15 player with no taken boons", () => {
    const timeline = recommendBoonsByLevel(15, mockArchetype);
    expect(timeline[0].acquired).toBe(false); // level 10 — not picked yet
    expect(timeline[1].acquired).toBe(false); // level 20
    expect(timeline[2].acquired).toBe(false); // level 30
  });

  it("marks first boon as acquired for level 15 player with 1 taken boon", () => {
    const timeline = recommendBoonsByLevel(15, mockArchetype, {
      lesser: ["Draconic"],
      greater: [],
    });
    expect(timeline[0].acquired).toBe(true); // level 10 — picked
    expect(timeline[0].takenBoonName).toBe("Draconic");
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

describe("recommendStatPriorities numeric values", () => {
  it("computes correct targets and gaps for 3/3 archetype", () => {
    const recs = recommendStatPriorities(mockStats, mockArchetype, 10);
    // corePer = floor(1150 * 0.5 / 3) = 191
    // supportPer = floor(1150 * 0.3 / 3) = 115
    const velocity = recs.find((r) => r.statName === "velocity")!;
    expect(velocity.target).toBe(191);
    expect(velocity.current).toBe(50);
    expect(velocity.gap).toBe(141);

    const stamina = recs.find((r) => r.statName === "stamina")!;
    expect(stamina.target).toBe(115);
    expect(stamina.current).toBe(25);
    expect(stamina.gap).toBe(90);
  });
});

describe("recommendStatPriorities diminishing returns", () => {
  const singleStatArch: Archetype = {
    name: "One Trick",
    description: "",
    priority_stats: ["velocity"],
    secondary_stats: [],
    stat_weights: { velocity: 1.0 },
  };

  it("applies 0.5x multiplier for stats above 850", () => {
    // target = min(floor(1150 * 0.5 / 1), 300) = 300
    // gap = 300 - 900 = -600 → completed → priorityScore = -1
    // But let's use a target above 900 via stat_targets
    const arch = { ...singleStatArch, stat_targets: { velocity: 950 } };
    const recs = recommendStatPriorities({ velocity: 900 }, arch, 5);
    const vel = recs.find((r) => r.statName === "velocity")!;
    // gap = 950 - 900 = 50, weight = 1.0, raw = 50 * 1.0 = 50
    // current > 850 → * 0.5 = 25
    expect(vel.priorityScore).toBe(25);
  });

  it("applies 0.75x multiplier for stats above 700 (but <= 850)", () => {
    const arch = { ...singleStatArch, stat_targets: { velocity: 900 } };
    const recs = recommendStatPriorities({ velocity: 750 }, arch, 5);
    const vel = recs.find((r) => r.statName === "velocity")!;
    // gap = 900 - 750 = 150, weight = 1.0, raw = 150
    // current > 700 → * 0.75 = 112.5
    expect(vel.priorityScore).toBe(112.5);
  });

  it("applies no multiplier for stats at or below 700", () => {
    const arch = { ...singleStatArch, stat_targets: { velocity: 900 } };
    const recs = recommendStatPriorities({ velocity: 700 }, arch, 5);
    const vel = recs.find((r) => r.statName === "velocity")!;
    // gap = 900 - 700 = 200, weight = 1.0, raw = 200
    // current <= 700 → no multiplier
    expect(vel.priorityScore).toBe(200);
  });

  it("sets priorityScore to -1 when gap <= 0 (stat completed)", () => {
    const recs = recommendStatPriorities({ velocity: 999 }, singleStatArch, 5);
    const vel = recs.find((r) => r.statName === "velocity")!;
    // target = 300, current = 999, gap = -699 → priorityScore = -1
    expect(vel.priorityScore).toBe(-1);
  });
});
