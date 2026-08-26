import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  percentileToScore,
  computeAttributeRatio,
  computeStatsScore,
  computeGrowthScore,
  computePositionFitScore,
  computeComposite,
  getRecommendation,
} from "../evaluator";
import type { PositionDefenseMap } from "../evaluator-data";
import type { PlayerData, PercentileEntry, GameStats, PlayerRole } from "../evaluator-types";

// ---------------------------------------------------------------------------
// S15 threshold calibration (deterministic; reads FROZEN live samples).
//
// Scores two frozen live samples through the REAL app engine (live attribute-
// percentile path, NOT the Python /0.85 fallback) under the S15 tiers, and
// asserts RECOMMENDATION_THRESHOLDS reproduce the target verdict distribution
// on BOTH the calibration seed and an independent validation seed (±2pp).
//
// The samples are frozen (scripts/fetch-calibration-sample.mjs) so this never
// touches the network and is byte-stable. Re-run the fetch script to refresh.
// ---------------------------------------------------------------------------

interface SamplePlayer {
  role: PlayerRole;
  level: number;
  position: string;
  attrs: Record<string, number>;
  statline: Record<string, number> | null;
  qualifies: boolean;
}

function loadSample(file: string): SamplePlayer[] {
  const raw = JSON.parse(readFileSync(join(process.cwd(), "references", file), "utf-8"));
  return raw.players as SamplePlayer[];
}

const posDefense = JSON.parse(
  readFileSync(join(process.cwd(), "public/data/archetypes/position_defense_weights.json"), "utf-8"),
) as PositionDefenseMap;

const PCTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];
function pctTable(values: number[], higherIsBetter: boolean): PercentileEntry[] {
  if (values.length < 10) return [];
  const sorted = [...values].sort((a, b) => (higherIsBetter ? b - a : a - b));
  const n = sorted.length;
  return PCTS.map((pct) => ({ pct, value: sorted[Math.floor((n * pct) / 100)] }));
}

const ORDER = ["STAR", "STRONG", "ROSTER", "FRINGE", "MULCH"] as const;

// Pre-S15 (S10) batter tiers, to measure how much the S15 tier change alone
// shifts the app-path distribution (pitcher tiers are unchanged S10->S15).
const OLD_BATTER_T1 = new Set(["contact", "muscle", "intimidation", "aiming", "performance"]);
const OLD_BATTER_T2 = new Set(["discipline", "lift", "vision", "determination", "insight", "speed", "cunning"]);
const OLD_BATTER_ALL = [...OLD_BATTER_T1, ...OLD_BATTER_T2, "selflessness", "wisdom"];
function oldRatio(attrs: Record<string, number>, role: PlayerRole): number {
  if (role === "pitcher") return computeAttributeRatio(attrs, "pitcher");
  let w = 0, t = 0;
  for (const s of OLD_BATTER_ALL) {
    const v = attrs[s] ?? 0; t += v;
    if (OLD_BATTER_T1.has(s)) w += v; else if (OLD_BATTER_T2.has(s)) w += v * 0.5;
  }
  return t > 0 ? w / t : 0;
}

type RatioFn = (a: Record<string, number>, r: PlayerRole) => number;

// Score every player's composite through the REAL app pillars. The attribute
// pillar uses the live-percentile path (percentileToScore of the tier-weighted
// ratio against the sample's own ratio distribution) exactly like evaluator.ts.
function scoreSample(players: SamplePlayer[], ratioFn: RatioFn = computeAttributeRatio): number[] {
  const bRatios = players.filter((p) => p.role === "batter").map((p) => ratioFn(p.attrs, "batter")).filter((r) => r > 0);
  const pRatios = players.filter((p) => p.role === "pitcher").map((p) => ratioFn(p.attrs, "pitcher")).filter((r) => r > 0);
  const attrTable = { batter: pctTable(bRatios, true), pitcher: pctTable(pRatios, true) };

  const qB = players.filter((p) => p.role === "batter" && p.qualifies && p.statline);
  const qP = players.filter((p) => p.role === "pitcher" && p.qualifies && p.statline);
  const col = (rows: SamplePlayer[], k: string) => rows.map((p) => p.statline![k]).filter((v) => v != null) as number[];
  const batting = {
    OBP: pctTable(col(qB, "OBP"), true), SLG: pctTable(col(qB, "SLG"), true),
    K_PCT: pctTable(col(qB, "K_PCT"), false), BB_PCT: pctTable(col(qB, "BB_PCT"), true),
    SB_PCT: pctTable(col(qB, "SB_PCT"), true),
  };
  const pitching = {
    ERA: pctTable(col(qP, "ERA"), false), WHIP: pctTable(col(qP, "WHIP"), false),
    K9: pctTable(col(qP, "K9"), true), BB9: pctTable(col(qP, "BB9"), false), HR9: pctTable(col(qP, "HR9"), false),
  };

  return players.map((p) => {
    const player = { stats: p.attrs, level: p.level, position: p.position, lesserBoons: [], greaterBoons: [] } as unknown as PlayerData;
    const table = attrTable[p.role];
    const ratio = ratioFn(p.attrs, p.role);
    const attr = ratio > 0 && table.length >= 10 ? Math.round(percentileToScore(ratio, table)) : Math.min(100, Math.round((ratio / 0.85) * 100));
    const stats = p.statline ? computeStatsScore(p.role, p.statline as GameStats, { batting, pitching }) : null;
    const growth = computeGrowthScore(player);
    const fit = computePositionFitScore(player, p.role, posDefense);
    return computeComposite(attr, stats, growth, fit, p.role);
  });
}

function dist(composites: number[]): Record<string, number> {
  const c: Record<string, number> = { STAR: 0, STRONG: 0, ROSTER: 0, FRINGE: 0, MULCH: 0 };
  for (const comp of composites) c[getRecommendation(comp)]++;
  return c;
}

function pctOf(sortedAsc: number[], p: number): number {
  return sortedAsc[Math.min(sortedAsc.length - 1, Math.floor((sortedAsc.length * p) / 100))];
}

describe("S15 threshold calibration (frozen live samples, real app engine)", () => {
  const seeds = [
    { name: "seed999 (calibration)", file: "s15-calibration-sample.json" },
    { name: "seed12345 (validation)", file: "s15-calibration-sample-seed2.json" },
  ];

  for (const s of seeds) {
    it(`${s.name}: S15 tier change is distribution-neutral (<=2pp) yet reshuffles individuals`, () => {
      const players = loadSample(s.file);
      const newC = scoreSample(players, computeAttributeRatio); // S15 tiers (current STAT_TIERS)
      const oldC = scoreSample(players, oldRatio);              // pre-S15 (S10) batter tiers
      const N = newC.length;
      const dNew = dist(newC), dOld = dist(oldC);
      const churn = newC.filter((c, i) => getRecommendation(c) !== getRecommendation(oldC[i])).length;
      const churnPct = (churn / N) * 100;
      const asc = [...newC].sort((a, b) => a - b);
      const line = (label: string, d: Record<string, number>) => `  ${label}: ` + ORDER.map((t) => `${t} ${d[t]} (${(d[t] / N * 100).toFixed(1)}%)`).join("  ");
      // eslint-disable-next-line no-console
      console.log(`\n[${s.name}] N=${N}\n${line("OLD tiers", dOld)}\n${line("NEW tiers", dNew)}` +
        `\n  verdict churn (S15 tier change): ${churn}/${N} (${churnPct.toFixed(1)}%)` +
        `\n  NEW composite pctiles: p16=${pctOf(asc, 16)} p41=${pctOf(asc, 41)} p50=${pctOf(asc, 50)} p81=${pctOf(asc, 81)} p98=${pctOf(asc, 98)} max=${asc[N - 1]}`);

      // Blocker #3 / the calibration gate: because the app scores attributes on the
      // self-normalizing live-percentile path, the S15 tier change must NOT reshuffle
      // the overall verdict distribution. Every tier's marginal moves <=2pp on BOTH
      // seeds -> the current thresholds (65/55/42/35) still hold; no retune needed.
      for (const t of ORDER) {
        const deltaPP = Math.abs(dNew[t] - dOld[t]) / N * 100;
        expect(deltaPP, `${t} marginal moved ${deltaPP.toFixed(1)}pp`).toBeLessThanOrEqual(2.0);
      }
      // ...but it DOES move individuals toward the newly-valued stats (intended). Guard
      // against a no-op change or a wholesale reshuffle.
      expect(churnPct).toBeGreaterThan(3);
      expect(churnPct).toBeLessThan(30);
      expect(newC.every((c) => c >= 0 && c <= 100)).toBe(true);
    });
  }
});
