import { describe, it, expect } from "vitest";
import { positionFitTarget } from "../evaluator-data";

// positionFitTarget is the single source of truth for per-stat defense targets,
// used by BOTH computePositionFitScore (the Fit score) and explainFit (the
// reasoning display). Locking the values here guards against the two drifting
// (the reasoning previously derived targets from stat weight, disagreeing with
// the score's fixed 140/80/200).
describe("positionFitTarget", () => {
  it("measures every catcher stat against 200", () => {
    expect(positionFitTarget("C", "awareness", new Set(["awareness"]))).toBe(200);
    expect(positionFitTarget("C", "composure", new Set(["awareness"]))).toBe(200);
  });

  it("targets 140 for primary stats and 80 for the rest (non-catcher)", () => {
    const primary = new Set(["reaction"]);
    expect(positionFitTarget("SS", "reaction", primary)).toBe(140);
    expect(positionFitTarget("SS", "composure", primary)).toBe(80);
    expect(positionFitTarget("1B", "awareness", primary)).toBe(80);
  });
});
