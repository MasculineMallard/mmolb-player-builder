import { describe, it, expect } from "vitest";
import { calculateStatTargets } from "../optimizer";
import type { Archetype } from "../types";

describe("calculateStatTargets", () => {
  it("returns correct targets for 3 priority / 3 secondary", () => {
    const arch: Archetype = {
      name: "Test",
      description: "",
      priority_stats: ["a", "b", "c"],
      secondary_stats: ["d", "e", "f"],
      stat_weights: {},
    };
    const { corePer, supportPer } = calculateStatTargets(arch);
    // corePer = floor(1150 * 0.5 / 3) = 191
    expect(corePer).toBe(191);
    // supportPer = floor(1150 * 0.3 / 3) = 115
    expect(supportPer).toBe(115);
  });

  it("returns correct targets for 4 priority stats", () => {
    const arch: Archetype = {
      name: "Test",
      description: "",
      priority_stats: ["a", "b", "c", "d"],
      secondary_stats: ["e", "f"],
      stat_weights: {},
    };
    const { corePer, supportPer } = calculateStatTargets(arch);
    // corePer = floor(1150 * 0.5 / 4) = 143
    expect(corePer).toBe(143);
    // supportPer = floor(1150 * 0.3 / 2) = 172
    expect(supportPer).toBe(172);
  });

  it("does not cap corePer (no stat cap in S11)", () => {
    const arch: Archetype = {
      name: "Test",
      description: "",
      priority_stats: ["a"],
      secondary_stats: ["b"],
      stat_weights: {},
    };
    const { corePer } = calculateStatTargets(arch);
    // floor(1150 * 0.5 / 1) = 575, no cap in S11
    expect(corePer).toBe(575);
  });

  it("computes supportPer without overflow redistribution", () => {
    const arch: Archetype = {
      name: "Test",
      description: "",
      priority_stats: ["a"],
      secondary_stats: ["b"],
      stat_weights: {},
    };
    const { supportPer } = calculateStatTargets(arch);
    // floor(1150 * 0.3 / 1) = 345
    expect(supportPer).toBe(345);
  });
});
