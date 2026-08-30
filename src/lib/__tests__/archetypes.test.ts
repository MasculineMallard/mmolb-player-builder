import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeArchetypeFitPct } from "../optimizer";
import type { Archetype } from "../types";

// ---------------------------------------------------------------------------
// Archetype weight invariants + fit ordering (PR-B).
// Guards the S15 re-weighting: every archetype keeps the 3-priority(0.12) +
// 3-secondary(0.08) shape, stat_weights match priority/secondary, and equipment
// affixes track priority. Plus a named-fixture ranking so a wrong weight edit
// that changes which archetype a clear-profile player matches is caught.
// ---------------------------------------------------------------------------

const load = (f: string): Record<string, Archetype> =>
  JSON.parse(readFileSync(join(process.cwd(), "public/data/archetypes", f), "utf-8"));
const batters = load("batter_archetypes.json");
const pitchers = load("pitcher_archetypes.json");

function invariants(name: string, map: Record<string, Archetype>, isPitcher: boolean) {
  describe(`${name} archetype invariants`, () => {
    for (const [key, a] of Object.entries(map)) {
      it(`${key}: 3 priority @0.12 + 3 secondary @0.08, weights + affixes consistent`, () => {
        expect(a.priority_stats).toHaveLength(3);
        expect(a.secondary_stats).toHaveLength(3);
        const w = a.stat_weights as Record<string, number>;
        expect(Object.keys(w).sort()).toEqual([...a.priority_stats, ...a.secondary_stats].sort());
        for (const s of a.priority_stats) expect(w[s]).toBeCloseTo(0.12, 5);
        for (const s of a.secondary_stats) expect(w[s]).toBeCloseTo(0.08, 5);
        // equipment_affixes tracks the priority stats (existing invariant, kept in S15)
        expect((a as unknown as { equipment_affixes: string[] }).equipment_affixes).toEqual(a.priority_stats);
        if (isPitcher) {
          expect(Array.isArray((a as unknown as { dump_stats: string[] }).dump_stats)).toBe(true);
          expect((a as unknown as { dump_stats: string[] }).dump_stats.length).toBeGreaterThan(0);
        }
      });
    }
  });
}

invariants("batter", batters, false);
invariants("pitcher", pitchers, true);

function topArchetype(stats: Record<string, number>, map: Record<string, Archetype>, level: number): string {
  return Object.entries(map)
    .map(([key, a]) => ({ key, fit: computeArchetypeFitPct(stats, a, level) }))
    .sort((x, y) => y.fit - x.fit)[0].key;
}

describe("named-fixture archetype ranking (S15 weights)", () => {
  it("a muscle/lift/contact batter ranks Power Slugger #1", () => {
    const stats = { muscle: 350, lift: 350, contact: 300, intimidation: 250, discipline: 220, aiming: 220 };
    expect(topArchetype(stats, batters, 30)).toBe("power_slugger");
  });

  it("a velocity/control/presence pitcher ranks Fastball Command #1", () => {
    const stats = { velocity: 350, control: 350, presence: 300, accuracy: 250, rotation: 220, guts: 220 };
    expect(topArchetype(stats, pitchers, 30)).toBe("fastball_command");
  });
});
