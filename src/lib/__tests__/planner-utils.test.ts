import { describe, it, expect } from "vitest";
import { calculateProgress, getMilestoneName, generateMilestones } from "../planner-utils";
import type { Archetype } from "../types";

const baseArchetype: Archetype = {
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
};

const mockStats: Record<string, number> = {
  velocity: 200,
  rotation: 150,
  control: 100,
  stuff: 80,
  stamina: 60,
  presence: 40,
};

describe("calculateProgress", () => {
  it("returns 0 progress at level 1 (no points earned)", () => {
    const result = calculateProgress(mockStats, baseArchetype, 1);
    expect(result.progressPercent).toBe(0);
    expect(result.statsOnTrack).toBe(0);
    expect(result.statsBehind).toBe(0);
    expect(result.expectedPointsAtLevel).toBe(0);
    expect(result.levelsRemaining).toBe(29);
    expect(result.currentLevel).toBe(1);
  });

  it("tracks on-track and behind stats at mid levels", () => {
    // At level 10: primary points = 350 (levels 2-4=150, 6-9=200, skip 5 defense, skip 10 boon)
    // Each priority stat weight is 0.12, totalWeight = 0.36
    // ratio per stat = 0.12 / 0.36 = 0.333...
    // expectedAtCurrent per stat = floor(350 * 0.333) = 116
    // velocity=200 >= 116 → on track
    // rotation=150 >= 116 → on track
    // control=100 < 116 → behind
    const result = calculateProgress(mockStats, baseArchetype, 10);
    expect(result.statsOnTrack).toBe(2);
    expect(result.statsBehind).toBe(1);
    expect(result.expectedPointsAtLevel).toBe(350);
  });

  it("computes correct progressPercent", () => {
    // At level 10: expectedAtCurrent per stat = floor(350 * 0.333) = 116
    // velocity: min(200, 116) = 116
    // rotation: min(150, 116) = 116
    // control: min(100, 116) = 100
    // totalProgress = 332, maxProgress = 348
    // percent = round(332/348 * 1000) / 10 = round(954.02) / 10 = 95.4
    const result = calculateProgress(mockStats, baseArchetype, 10);
    expect(result.progressPercent).toBe(95.4);
  });

  it("handles all stats at 0", () => {
    const zeroStats = { velocity: 0, rotation: 0, control: 0 };
    const result = calculateProgress(zeroStats, baseArchetype, 10);
    expect(result.progressPercent).toBe(0);
    expect(result.statsOnTrack).toBe(0);
    expect(result.statsBehind).toBe(3);
  });

  it("handles 4+ priority stats (no slice)", () => {
    const fourStatArch: Archetype = {
      name: "Versatile",
      description: "",
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
    const result = calculateProgress(mockStats, fourStatArch, 10);
    // All 4 priority stats should be tracked (not just 3)
    expect(result.statsOnTrack + result.statsBehind).toBe(4);
  });

  it("handles empty archetype with no priority stats", () => {
    const emptyArch: Archetype = {
      name: "Empty",
      description: "",
      priority_stats: [],
      secondary_stats: [],
      stat_weights: {},
    };
    const result = calculateProgress(mockStats, emptyArch, 15);
    expect(result.progressPercent).toBe(0);
    expect(result.statsOnTrack).toBe(0);
    expect(result.statsBehind).toBe(0);
    expect(result.totalStats).toBe(0);
  });

  it("returns correct totalStats from priority_stats length", () => {
    const result = calculateProgress(mockStats, baseArchetype, 5);
    expect(result.totalStats).toBe(3); // 3 priority stats
  });

  it("returns correct levelsRemaining and maxPoints", () => {
    const result = calculateProgress(mockStats, baseArchetype, 20);
    expect(result.levelsRemaining).toBe(10); // 30 - 20
    expect(result.maxPoints).toBe(1150);
  });

  it("handles missing stats gracefully (stat not in stats object)", () => {
    const partialStats = { velocity: 200 }; // rotation, control missing
    const result = calculateProgress(partialStats, baseArchetype, 10);
    // Only velocity is in stats; rotation and control are skipped via "continue"
    expect(result.statsOnTrack).toBe(1);
    expect(result.statsBehind).toBe(0);
  });

  it("caps expected points at 1000 per stat", () => {
    // Create an archetype with a single huge-weight priority stat
    const singleStatArch: Archetype = {
      name: "Mono",
      description: "",
      priority_stats: ["velocity"],
      secondary_stats: [],
      stat_weights: { velocity: 1.0 },
    };
    // At level 30 (1150 points), ratio = 1.0, expected = min(floor(1150 * 1.0), 1000) = 1000
    const result = calculateProgress({ velocity: 999 }, singleStatArch, 30);
    expect(result.statsBehind).toBe(1);
    expect(result.expectedPointsAtLevel).toBe(1150);
  });
});

describe("getMilestoneName", () => {
  it('returns "Start" for level 1', () => {
    expect(getMilestoneName(1)).toBe("Start");
  });

  it('returns "Lesser Boon" for boon levels (10, 20, 30)', () => {
    expect(getMilestoneName(10)).toBe("Lesser Boon");
    expect(getMilestoneName(20)).toBe("Lesser Boon");
    expect(getMilestoneName(30)).toBe("Lesser Boon");
  });

  it('returns "Defense Bonus" for defense levels (5, 15, 25)', () => {
    expect(getMilestoneName(5)).toBe("Defense Bonus");
    expect(getMilestoneName(15)).toBe("Defense Bonus");
    expect(getMilestoneName(25)).toBe("Defense Bonus");
  });

  it('returns "Level N" for non-special levels', () => {
    expect(getMilestoneName(2)).toBe("Level 2");
    expect(getMilestoneName(7)).toBe("Level 7");
    expect(getMilestoneName(14)).toBe("Level 14");
  });

  it('returns "Level N" for out-of-range levels', () => {
    expect(getMilestoneName(0)).toBe("Level 0");
    expect(getMilestoneName(31)).toBe("Level 31");
  });
});

describe("generateMilestones", () => {
  it("returns 7 milestones matching MILESTONE_LEVELS", () => {
    const milestones = generateMilestones(1);
    expect(milestones).toHaveLength(7);
    expect(milestones.map((m) => m.level)).toEqual([1, 5, 10, 15, 20, 25, 30]);
  });

  it("names each milestone correctly", () => {
    const milestones = generateMilestones(1);
    expect(milestones.map((m) => m.name)).toEqual([
      "Start",
      "Defense Bonus",
      "Lesser Boon",
      "Defense Bonus",
      "Lesser Boon",
      "Defense Bonus",
      "Lesser Boon",
    ]);
  });

  it("marks all as upcoming for level 0", () => {
    const milestones = generateMilestones(0);
    expect(milestones.every((m) => m.status === "upcoming")).toBe(true);
  });

  it("marks only level 1 as completed for level 1 player", () => {
    const milestones = generateMilestones(1);
    expect(milestones[0].status).toBe("completed"); // level 1
    expect(milestones[1].status).toBe("upcoming"); // level 5
  });

  it("marks levels up to currentLevel as completed", () => {
    const milestones = generateMilestones(15);
    expect(milestones[0].status).toBe("completed"); // 1
    expect(milestones[1].status).toBe("completed"); // 5
    expect(milestones[2].status).toBe("completed"); // 10
    expect(milestones[3].status).toBe("completed"); // 15
    expect(milestones[4].status).toBe("upcoming"); // 20
    expect(milestones[5].status).toBe("upcoming"); // 25
    expect(milestones[6].status).toBe("upcoming"); // 30
  });

  it("marks all as completed at max level", () => {
    const milestones = generateMilestones(30);
    expect(milestones.every((m) => m.status === "completed")).toBe(true);
  });
});
