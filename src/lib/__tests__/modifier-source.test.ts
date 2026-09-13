import { describe, expect, it } from "vitest";
import {
  activeModifierVersion,
  isModifierSource,
  mergeModifierSource,
  nextModifierTransition,
  type BoonsMerged,
  type ModifierSource,
} from "../modifier-source";

const metadata: BoonsMerged = {
  lesser_boons: [
    { name: "Windowed", type: "lesser", emoji: "🪟", description: "test", bonuses: { Old: 99 }, penalties: {} },
    { name: "Soul in the Machine", type: "lesser", emoji: "🤖", description: "alias", bonuses: {}, penalties: {} },
    { name: "Local only", type: "lesser", emoji: "📍", description: "fallback", bonuses: { Guts: 5 }, penalties: {} },
  ],
  greater_boons: [],
};

const source: ModifierSource = {
  Windowed: [
    { valid_from: "2026-01-01T00:00:00Z", valid_until: "2026-04-01T00:00:00Z", effects: { Accuracy: 0.5 }, bonus_type: "Multiplier" },
    { valid_from: "2026-04-01T00:00:00Z", valid_until: null, effects: { Control: 0.25, Presence: -0.1 }, bonus_type: "Multiplier" },
  ],
  ROBO: [
    { valid_from: "2026-04-01T00:00:00Z", valid_until: null, effects: { Accuracy: 0.25, Deception: -0.1 }, bonus_type: "Multiplier" },
  ],
  "Celestial Infusion": [
    { valid_from: "2025-01-01T00:00:00Z", valid_until: null, effects: { Muscle: 0.25, Presence: 0.25 }, bonus_type: "Flat" },
  ],
};

describe("modifier source adapter", () => {
  it("selects active versions with an inclusive start and exclusive end", () => {
    expect(activeModifierVersion(source.Windowed, new Date("2026-03-31T23:59:59Z"))?.effects).toEqual({ Accuracy: 0.5 });
    expect(activeModifierVersion(source.Windowed, new Date("2026-04-01T00:00:00Z"))?.effects).toEqual({ Control: 0.25, Presence: -0.1 });
  });

  it("reports the next future validity boundary for client refresh", () => {
    expect(nextModifierTransition(source, new Date("2026-03-01T00:00:00Z"))).toBe("2026-04-01T00:00:00.000Z");
    expect(nextModifierTransition(source, new Date("2026-09-12T00:00:00Z"))).toBeNull();
  });

  it("overlays current multipliers, preserves local metadata, aliases ROBO, and exposes flat effects", () => {
    const merged = mergeModifierSource(source, new Date("2026-09-12T00:00:00Z"), metadata);
    expect(merged.lesser_boons[0]).toMatchObject({
      name: "Windowed",
      emoji: "🪟",
      bonuses: { Control: 25 },
      penalties: { Presence: 10 },
    });
    expect(merged.lesser_boons[1]).toMatchObject({ bonuses: { Accuracy: 25 }, penalties: { Deception: 10 } });
    expect(merged.lesser_boons[2]).toMatchObject({ bonuses: { Guts: 5 } });
    expect(merged.modifier_effects?.find((entry) => entry.name === "Celestial Infusion")).toEqual({
      name: "Celestial Infusion",
      multipliers: {},
      flats: { Muscle: 25, Presence: 25 },
    });
  });

  it("rejects malformed, non-finite, and implausibly large effect data", () => {
    expect(isModifierSource(source)).toBe(true);
    expect(isModifierSource({ Broken: [{ valid_from: "nope", valid_until: null, effects: {}, bonus_type: "Multiplier" }] })).toBe(false);
    expect(isModifierSource({ Broken: [{ valid_from: "2026-01-01Z", valid_until: null, effects: { Muscle: Number.NaN }, bonus_type: "Multiplier" }] })).toBe(false);
    expect(isModifierSource({ Broken: [{ valid_from: "2026-01-01Z", valid_until: null, effects: { Muscle: 11 }, bonus_type: "Multiplier" }] })).toBe(false);
    expect(isModifierSource({ Broken: [
      { valid_from: "2026-01-01T00:00:00Z", valid_until: null, effects: {}, bonus_type: "Multiplier" },
      { valid_from: "2026-02-01T00:00:00Z", valid_until: null, effects: {}, bonus_type: "Multiplier" },
    ] })).toBe(false);
    expect(isModifierSource({ Broken: [{
      valid_from: "2026-02-01T00:00:00Z",
      valid_until: "2026-01-01T00:00:00Z",
      effects: {},
      bonus_type: "Multiplier",
    }] })).toBe(false);
  });
});
