import { describe, it, expect } from "vitest";
import { getStatColor, slotToPosition } from "../utils";

describe("getStatColor", () => {
  it("returns great (blue) for values >= 500", () => {
    expect(getStatColor(500)).toBe("var(--scale-great)");
    expect(getStatColor(999)).toBe("var(--scale-great)");
  });

  it("returns good (soft blue) for values 350-499", () => {
    expect(getStatColor(350)).toBe("var(--scale-good)");
    expect(getStatColor(499)).toBe("var(--scale-good)");
  });

  it("returns mid (neutral) for values 200-349", () => {
    expect(getStatColor(200)).toBe("var(--scale-mid)");
    expect(getStatColor(349)).toBe("var(--scale-mid)");
  });

  it("returns poor (gold) for values 80-199", () => {
    expect(getStatColor(80)).toBe("var(--scale-poor)");
    expect(getStatColor(199)).toBe("var(--scale-poor)");
  });

  it("returns bad (amber) for values < 80", () => {
    expect(getStatColor(0)).toBe("var(--scale-bad)");
    expect(getStatColor(79)).toBe("var(--scale-bad)");
  });
});

describe("slotToPosition", () => {
  it("returns null for null input", () => {
    expect(slotToPosition(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(slotToPosition("")).toBeNull();
  });

  it("maps known slots to positions", () => {
    expect(slotToPosition("catcher")).toBe("C");
    expect(slotToPosition("firstbase")).toBe("1B");
    expect(slotToPosition("shortstop")).toBe("SS");
    expect(slotToPosition("startingpitcher")).toBe("SP");
    expect(slotToPosition("closer")).toBe("CL");
    expect(slotToPosition("bench")).toBe("Bench");
  });

  it("is case-insensitive", () => {
    expect(slotToPosition("Catcher")).toBe("C");
    expect(slotToPosition("FIRSTBASE")).toBe("1B");
    expect(slotToPosition("StartingPitcher")).toBe("SP");
  });

  it("falls back to uppercase for unknown slots", () => {
    expect(slotToPosition("mystery")).toBe("MYSTERY");
    expect(slotToPosition("outfield")).toBe("OUTFIELD");
  });

  it("maps pitcher slot variants", () => {
    expect(slotToPosition("startingpitcher1")).toBe("SP");
    expect(slotToPosition("startingpitcher5")).toBe("SP");
    expect(slotToPosition("reliefpitcher1")).toBe("RP");
    expect(slotToPosition("reliefpitcher3")).toBe("RP");
  });

  it("maps bench variants", () => {
    expect(slotToPosition("benchbatter")).toBe("Bench");
    expect(slotToPosition("benchbatter1")).toBe("Bench");
    expect(slotToPosition("benchpitcher")).toBe("Bench");
    expect(slotToPosition("benchpitcher3")).toBe("Bench");
  });
});
