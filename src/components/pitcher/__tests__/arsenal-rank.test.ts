import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rankArsenalArchetypes } from "../ArsenalArchetypes";
import type { Archetype } from "@/lib/types";

const archetypes = JSON.parse(
  readFileSync(join(process.cwd(), "public/data/archetypes/pitcher_archetypes.json"), "utf-8"),
) as Record<string, Archetype>;

describe("rankArsenalArchetypes (PR-D arsenal-first ranking)", () => {
  it("orders by pitch-fit desc, then stat-fit desc", () => {
    const stats = { velocity: 300, control: 250, presence: 240, rotation: 200, stuff: 180 };
    const ranked = rankArsenalArchetypes(archetypes, stats, ["sl", "fs", "ch"], {}, 30);
    for (let i = 1; i < ranked.length; i++) {
      const a = ranked[i - 1], b = ranked[i];
      const pa = a.pitchFit ?? -1, pb = b.pitchFit ?? -1;
      expect(pa).toBeGreaterThanOrEqual(pb);
      if (pa === pb) expect(a.statFit).toBeGreaterThanOrEqual(b.statFit);
    }
  });

  it("ranks the archetype whose full arsenal the player throws at #1 (matches the dropdown)", () => {
    // groundball_machine recommends exactly [si, kc, ch, fs] -> 100% pitch fit for this arsenal.
    const stats = { stuff: 300, accuracy: 260, presence: 240 };
    const ranked = rankArsenalArchetypes(archetypes, stats, ["si", "kc", "ch", "fs"], {}, 30);
    expect(ranked[0].pitchFit).toBe(100);
    expect(ranked[0].key).toBe("groundball_machine");
  });
});
