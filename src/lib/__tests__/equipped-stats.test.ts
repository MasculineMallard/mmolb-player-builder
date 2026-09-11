import { describe, it, expect } from "vitest";
import { computeEquippedStats, hasGearEffect } from "../equipped-stats";
import type { PlayerData, ItemEffect } from "../types";

type BoonEffect = { bonuses: Record<string, number>; penalties: Record<string, number> };

function makePlayer(
  stats: Record<string, number>,
  opts: {
    lesserBoons?: string[];
    greaterBoons?: string[];
    equipment?: Record<string, ItemEffect[]>;
  } = {},
): PlayerData {
  const equipment = opts.equipment
    ? Object.fromEntries(
        Object.entries(opts.equipment).map(([slot, effects]) => [
          slot,
          { slot, name: `${slot} item`, emoji: "", effects },
        ]),
      )
    : undefined;
  return {
    name: "Test Player",
    firstName: "Test",
    lastName: "Player",
    level: 20,
    teamName: null,
    teamEmoji: null,
    position: "SS",
    durability: 5,
    stats,
    lesserBoons: opts.lesserBoons ?? [],
    greaterBoons: opts.greaterBoons ?? [],
    mmolbPlayerId: "x",
    pitches: [],
    equipment,
  };
}

const flat = (attribute: string, value: number): ItemEffect => ({ attribute, tier: 5, type: "flat", value });
const pct = (attribute: string, value: number): ItemEffect => ({ attribute, tier: 5, type: "pct", value });

describe("computeEquippedStats", () => {
  it("returns total = base when there are no items and no boons", () => {
    const player = makePlayer({ muscle: 600, contact: 400 });
    const eq = computeEquippedStats(player, new Map());
    expect(eq.muscle.total).toBe(600);
    expect(eq.contact.total).toBe(400);
    expect(hasGearEffect(eq)).toBe(false);
  });

  it("applies a +50% boon to the base value", () => {
    const boonLookup = new Map<string, BoonEffect>([
      ["Strong", { bonuses: { muscle: 50 }, penalties: { wisdom: 50 } }],
    ]);
    const player = makePlayer({ muscle: 600, wisdom: 200 }, { lesserBoons: ["Strong"] });
    const eq = computeEquippedStats(player, boonLookup);
    expect(eq.muscle.total).toBe(900); // 600 * 1.5
    expect(eq.wisdom.total).toBe(100); // 200 * 0.5
    expect(hasGearEffect(eq)).toBe(true);
  });

  it("stacks two +50% boons additively (+100% of base)", () => {
    const boonLookup = new Map<string, BoonEffect>([
      ["A", { bonuses: { muscle: 50 }, penalties: {} }],
      ["B", { bonuses: { muscle: 50 }, penalties: {} }],
    ]);
    const player = makePlayer({ muscle: 400 }, { lesserBoons: ["A", "B"] });
    const eq = computeEquippedStats(player, boonLookup);
    expect(eq.muscle.total).toBe(800); // 400 * (1 + 1.0)
  });

  it("adds flat item bonuses to a zero-base stat (Logan's Reaction case)", () => {
    // 0 base Reaction, two flat items totalling +180, no percent effect.
    const player = makePlayer(
      { reaction: 0, contact: 500 },
      { equipment: { hands: [flat("reaction", 100)], feet: [flat("reaction", 80)] } },
    );
    const eq = computeEquippedStats(player, new Map());
    expect(eq.reaction.itemFlat).toBe(180);
    expect(eq.reaction.total).toBe(180); // % of 0 base contributes nothing; flats still add
    expect(eq.contact.total).toBe(500);
    expect(hasGearEffect(eq)).toBe(true);
  });

  it("combines base, boon, item flat and item percent", () => {
    const boonLookup = new Map<string, BoonEffect>([
      ["Strong", { bonuses: { muscle: 50 }, penalties: {} }],
    ]);
    const player = makePlayer(
      { muscle: 600 },
      { lesserBoons: ["Strong"], equipment: { body: [flat("muscle", 28), pct("muscle", 3)] } },
    );
    const eq = computeEquippedStats(player, boonLookup);
    // 600 * (1 + 0.50 + 0.03) + 28 = 918 + 28 = 946
    expect(eq.muscle.total).toBe(946);
    expect(eq.muscle.itemFlat).toBe(28);
    expect(eq.muscle.itemPct).toBe(3);
    expect(eq.muscle.boonPct).toBeCloseTo(0.5);
  });

  it("clamps totals to the 0-1000 attribute range", () => {
    const boonLookup = new Map<string, BoonEffect>([
      ["Big", { bonuses: { muscle: 50 }, penalties: {} }],
      ["Weak1", { bonuses: {}, penalties: { vision: 50 } }],
      ["Weak2", { bonuses: {}, penalties: { vision: 50 } }],
    ]);
    const player = makePlayer({ muscle: 900, vision: 300 }, { lesserBoons: ["Big", "Weak1", "Weak2"] });
    const eq = computeEquippedStats(player, boonLookup);
    expect(eq.muscle.total).toBe(1000); // 900 * 1.5 = 1350 -> clamped to 1000
    expect(eq.vision.total).toBe(0); // 300 * (1 - 1.0) = 0 (never negative)
  });
});
