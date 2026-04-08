import { describe, it, expect } from "vitest";
import {
  S11,
  calculatePrimaryPointsAtLevel,
  TOTAL_PRIMARY_POINTS,
} from "../mechanics";

describe("S11 mechanics", () => {
  it("has correct max level", () => {
    expect(S11.maxLevel).toBe(30);
  });

  it("has 3 boon levels, all lesser", () => {
    expect(S11.boonLevels).toEqual([10, 20, 30]);
  });

  it("has 3 defense bonus levels", () => {
    expect(S11.defenseBonusLevels).toEqual([5, 15, 25]);
  });
});

describe("calculatePrimaryPointsAtLevel", () => {
  it("returns 0 at level 1 (no levels gained yet)", () => {
    expect(calculatePrimaryPointsAtLevel(1)).toBe(0);
  });

  it("gives 50 points at level 2 (first level-up)", () => {
    expect(calculatePrimaryPointsAtLevel(2)).toBe(50);
  });

  it("gives 0 points at boon levels (10, 20, 30)", () => {
    // Level 10 is a boon level; levels 2-9 except defense level 5 give points
    // Levels 2,3,4 = 3*50 = 150
    // Level 5 = defense (no primary, conservative)
    // Levels 6,7,8,9 = 4*50 = 200
    // Level 10 = boon (0)
    // Total at 10: 350
    const atLevel9 = calculatePrimaryPointsAtLevel(9);
    const atLevel10 = calculatePrimaryPointsAtLevel(10);
    expect(atLevel10).toBe(atLevel9); // boon level adds nothing
  });

  it("skips defense levels when defenseLevelsGivePrimary is false", () => {
    // Levels 2,3,4 give primary (3*50 = 150)
    // Level 5 = defense (skip)
    const at4 = calculatePrimaryPointsAtLevel(4);
    const at5 = calculatePrimaryPointsAtLevel(5);
    expect(at4).toBe(150);
    expect(at5).toBe(150); // defense level adds nothing
  });

  it("calculates total at max level (30)", () => {
    // Levels 2-30 = 29 levels
    // Minus 3 boon levels (10, 20, 30) = 26
    // Minus 3 defense levels (5, 15, 25) = 23 primary levels
    // 23 * 50 = 1150
    expect(calculatePrimaryPointsAtLevel(30)).toBe(1150);
    expect(TOTAL_PRIMARY_POINTS).toBe(1150);
  });

  it("matches S11.totalPrimaryPoints constant", () => {
    expect(TOTAL_PRIMARY_POINTS).toBe(S11.totalPrimaryPoints);
  });
});

