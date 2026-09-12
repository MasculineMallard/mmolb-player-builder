import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeEquippedStats, computeItemAdjustedStats, hasGearEffect } from "../equipped-stats";
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

// Boon lookup built from the REAL committed data, so these tests also lock the
// data fix (lesser boons are +25% / -10%, not the old wrong +50% / -50%).
const boonsRaw = JSON.parse(
  readFileSync(join(process.cwd(), "public/data/boons_merged.json"), "utf-8"),
);
const realBoonLookup = new Map<string, BoonEffect>();
for (const b of [...(boonsRaw.lesser_boons ?? []), ...(boonsRaw.greater_boons ?? [])]) {
  realBoonLookup.set(b.name, { bonuses: b.bonuses ?? {}, penalties: b.penalties ?? {} });
}

describe("computeEquippedStats — formula", () => {
  it("returns total = base when there are no items and no boons", () => {
    const player = makePlayer({ muscle: 600, contact: 400 });
    const eq = computeEquippedStats(player, new Map());
    expect(eq.muscle.total).toBe(600);
    expect(eq.contact.total).toBe(400);
    expect(hasGearEffect(eq)).toBe(false);
  });

  it("applies a boon percentage to the base value", () => {
    // Synthetic boon values to exercise the formula directly.
    const boonLookup = new Map<string, BoonEffect>([
      ["Strong", { bonuses: { muscle: 25 }, penalties: { wisdom: 10 } }],
    ]);
    const player = makePlayer({ muscle: 600, wisdom: 200 }, { lesserBoons: ["Strong"] });
    const eq = computeEquippedStats(player, boonLookup);
    expect(eq.muscle.total).toBe(750); // 600 * 1.25
    expect(eq.wisdom.total).toBe(180); // 200 * 0.90
    expect(hasGearEffect(eq)).toBe(true);
  });

  it("stacks two boons on the same stat additively", () => {
    const boonLookup = new Map<string, BoonEffect>([
      ["A", { bonuses: { muscle: 25 }, penalties: {} }],
      ["B", { bonuses: { muscle: 25 }, penalties: {} }],
    ]);
    const player = makePlayer({ muscle: 400 }, { lesserBoons: ["A", "B"] });
    const eq = computeEquippedStats(player, boonLookup);
    expect(eq.muscle.total).toBe(600); // 400 * (1 + 0.50)
  });

  it("adds flat item bonuses to a zero-base stat (Logan's Reaction case)", () => {
    // 0 base Reaction, two flat items totalling +180, no percent effect.
    const player = makePlayer(
      { reaction: 0, contact: 500 },
      { equipment: { hands: [flat("reaction", 100)], feet: [flat("reaction", 80)] } },
    );
    const eq = computeEquippedStats(player, new Map());
    expect(eq.reaction.itemFlat).toBe(180);
    expect(eq.reaction.total).toBe(180); // (0 + 180) * 1 = 180
    expect(eq.contact.total).toBe(500);
    expect(hasGearEffect(eq)).toBe(true);
  });

  it("applies the percent multiplier to (base + flat), and boon amplifies the flat too", () => {
    const boonLookup = new Map<string, BoonEffect>([
      ["Strong", { bonuses: { muscle: 25 }, penalties: {} }],
    ]);
    const player = makePlayer(
      { muscle: 600 },
      { lesserBoons: ["Strong"], equipment: { body: [flat("muscle", 28), pct("muscle", 3)] } },
    );
    const eq = computeEquippedStats(player, boonLookup);
    // (600 + 28) * (1 + 0.25 + 0.03) = 628 * 1.28 = 803.84 -> 804
    expect(eq.muscle.total).toBe(804);
    expect(eq.muscle.itemFlat).toBe(28);
    expect(eq.muscle.itemPct).toBe(3);
    expect(eq.muscle.boonPct).toBeCloseTo(0.25);
  });

  it("clamps totals to the 0-1000 attribute range", () => {
    const boonLookup = new Map<string, BoonEffect>([
      ["Big", { bonuses: { muscle: 25 }, penalties: {} }],
      ["Huge", { bonuses: { muscle: 25 }, penalties: {} }],
      ["Weak1", { bonuses: {}, penalties: { vision: 50 } }],
      ["Weak2", { bonuses: {}, penalties: { vision: 50 } }],
    ]);
    const player = makePlayer(
      { muscle: 900, vision: 300 },
      { lesserBoons: ["Big", "Huge"], equipment: { body: [pct("muscle", 40)] } },
    );
    const eq = computeEquippedStats(player, boonLookup);
    expect(eq.muscle.total).toBe(1000); // 900 * (1 + 0.50 + 0.40) = 1710 -> clamped to 1000
    // vision has both a -50% test penalty twice; never goes negative
    const visionPlayer = makePlayer({ vision: 300 }, { lesserBoons: ["Weak1", "Weak2"] });
    expect(computeEquippedStats(visionPlayer, boonLookup).vision.total).toBe(0);
  });

  it("builds an item-only map without applying a player's boons", () => {
    const boonLookup = new Map<string, BoonEffect>([
      ["Quick", { bonuses: { reaction: 25 }, penalties: {} }],
    ]);
    const player = makePlayer(
      { reaction: 100 },
      { lesserBoons: ["Quick"], equipment: { hands: [flat("reaction", 20), pct("reaction", 10)] } },
    );

    expect(computeItemAdjustedStats(player).reaction).toBe(132);
    expect(computeEquippedStats(player, boonLookup).reaction.total).toBe(162);
  });
});

// ---------------------------------------------------------------------------
// Golden test — calibrated against the live game.
//
// Parallax Wolfbox, Lv22 SP (Pueblo Spicy Green Chilies), boons Clockwork
// (+25% Control, -10% Stamina) + Cyclist (+25% Velocity, -10% Deception).
// Ground truth captured 2026-09-11 from the game's Attributes panel with the
// Equipment + Boons checkboxes ON. Base values are the "both OFF" column.
// Uses the REAL boons_merged.json (so a regression in either the formula or the
// boon magnitudes breaks this test).
// ---------------------------------------------------------------------------

describe("computeEquippedStats — Parallax Wolfbox golden (live-game calibrated)", () => {
  // Base stats = game "Equipment OFF / Boons OFF" column.
  const base: Record<string, number> = {
    velocity: 406, control: 341, stamina: 100, accuracy: 150,
    presence: 252, deception: 0, intuition: 101,
    // unchanged pitching stats (no equipment, no boon)
    stuff: 106, rotation: 96, persuasion: 230, guts: 142, defiance: 0,
  };

  // Equipment effects from the live payload (Value * 100 = display points).
  const equipment: Record<string, ItemEffect[]> = {
    charm: [flat("deception", 25), pct("accuracy", 14), flat("accuracy", 23), flat("composure", 21), flat("dexterity", 15)],
    body: [flat("presence", 27), pct("presence", 14), pct("intuition", 11), flat("arm", 20), pct("arm", 7)],
    feet: [pct("control", 10), flat("control", 16), pct("velocity", 10), flat("awareness", 17), flat("dexterity", 13)],
    hands: [flat("deception", 20), flat("accuracy", 25), pct("velocity", 11), flat("reaction", 14), flat("dexterity", 16)],
    head: [flat("accuracy", 21), flat("accuracy", 17), flat("deception", 17), flat("composure", 17), flat("composure", 16)],
  };

  const player = makePlayer(base, { lesserBoons: ["Clockwork", "Cyclist"], equipment });
  const eq = computeEquippedStats(player, realBoonLookup);

  // The game's "both ON" column — the target totals.
  const bothOn: Record<string, number> = {
    velocity: 593, control: 482, stamina: 90, accuracy: 269,
    presence: 318, deception: 56, intuition: 112,
  };

  for (const [stat, expected] of Object.entries(bothOn)) {
    it(`${stat}: both-on total matches the game (${expected})`, () => {
      expect(eq[stat].total).toBe(expected);
    });
  }

  it("leaves stats with no equipment and no boon at their base value", () => {
    for (const stat of ["stuff", "rotation", "persuasion", "guts", "defiance"]) {
      expect(eq[stat].total).toBe(base[stat]);
    }
  });

  it("uses the corrected boon magnitudes (+25% / -10%) from the data file", () => {
    expect(realBoonLookup.get("Clockwork")).toEqual({
      bonuses: { Control: 25 }, penalties: { Stamina: 10 },
    });
    expect(realBoonLookup.get("Cyclist")).toEqual({
      bonuses: { Velocity: 25 }, penalties: { Deception: 10 },
    });
  });
});
