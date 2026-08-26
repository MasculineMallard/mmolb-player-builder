import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { scoreBoons, type BoonData } from "../advisor";
import type { PlayerRole } from "../evaluator-types";

// ---------------------------------------------------------------------------
// Boon-advisor golden file (blocker #18).
//
// The S15 tier change intentionally shifts BoonAdvisor output: scoreBoons weights
// a boon's bonus/penalty by the stat's tier (advisor.TIER_WEIGHTS {T1:3,T2:2,T3:.8}),
// so discipline/insight (S10 T2 -> S15 T1) gain weight, intimidation (T1 -> T2) and
// cunning (T2 -> T3) lose it. This golden pins the top boons for a fixture batter +
// pitcher under S15 tiers, so any FUTURE change to boon scoring shows up as a diff to
// review. Regenerate intentionally with WRITE_GOLDEN=1.
// ---------------------------------------------------------------------------

const ref = (f: string) => JSON.parse(readFileSync(join(process.cwd(), "references", f), "utf-8"));
const boonsRaw = JSON.parse(readFileSync(join(process.cwd(), "public/data/boons_merged.json"), "utf-8"));
const boonList: BoonData[] = [...(boonsRaw.lesser_boons ?? []), ...(boonsRaw.greater_boons ?? [])];
const fixture = ref("parity-fixture.json");
const GOLDEN = join(process.cwd(), "src/lib/__tests__/__fixtures__/boon-scores-s15.json");

function topBoons(stats: Record<string, number>, role: PlayerRole, n: number) {
  return scoreBoons(stats, role, [], boonList).slice(0, n).map((b) => ({
    boonName: b.boonName, bonusStat: b.bonusStat, bonusTier: b.bonusTier,
    penaltyStat: b.penaltyStat, penaltyTier: b.penaltyTier, score: b.score,
  }));
}

describe("boon advisor golden (S15 tiers)", () => {
  const computed = {
    batter: topBoons(fixture.batter.stats, "batter", 8),
    pitcher: topBoons(fixture.pitcher.stats, "pitcher", 8),
  };

  if (process.env.WRITE_GOLDEN || !existsSync(GOLDEN)) {
    writeFileSync(GOLDEN, JSON.stringify(computed, null, 2) + "\n");
  }

  it("reproduces the committed top-8 boon ranking for batter and pitcher", () => {
    const golden = JSON.parse(readFileSync(GOLDEN, "utf-8"));
    expect(computed).toEqual(golden);
  });
});
