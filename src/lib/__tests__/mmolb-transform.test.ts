import { describe, it, expect } from "vitest";
import { transformPlayer, extractGameStats } from "../mmolb-transform";
import type { MmolbApiPlayer, MmolbApiPlayerRecord } from "../mmolb-api";

const SEASON_14_ID = "6a5484f39e6f05425fed49c1";

const BATTING_STATS = {
  at_bats: 44,
  plate_appearances: 52,
  singles: 5,
  doubles: 1,
  home_runs: 2,
  walked: 5,
  struck_out: 14,
  hit_by_pitch: 1,
  sac_flies: 1,
  stolen_bases: 2,
};

function player(overrides: Partial<MmolbApiPlayer>): MmolbApiPlayer {
  return {
    _id: "p1",
    FirstName: "Jorbit",
    LastName: "Sherman",
    Level: 30,
    Position: "RF",
    TeamID: "t1",
    LesserDurability: 5,
    BaseAttributeBonuses: [{ attribute: "Contact", amount: 1 }],
    Stats: { t1: { ...BATTING_STATS } },
    ...overrides,
  } as MmolbApiPlayer;
}

function record(season: number, seasonId: string): MmolbApiPlayerRecord {
  return {
    _id: `r${season}`,
    PlayerID: "p1",
    FirstName: "Jorbit",
    LastName: "Sherman",
    Season: season,
    SeasonID: seasonId,
    SeasonStatus: "Regular Season",
    Stats: { t1: { ...BATTING_STATS } },
  };
}

describe("mid-season recomp detection", () => {
  it("keeps stats for a player CREATED mid-season (no prior incarnation)", () => {
    // Jorbit Sherman: Birthseason 14 / Birthday 213, playerrecord only has S14.
    const p = transformPlayer(
      player({ Birthseason: 14, Birthday: 213 }),
      "Team",
      null,
      [record(14, SEASON_14_ID)],
      SEASON_14_ID,
      263,
    );

    expect(p.recomped).toBeUndefined();
    expect(p.gameStats).not.toBeNull();
    expect(p.gameStats?.PA).toBe(52);
  });

  it("suppresses stats for a player RECOMPED mid-season (has prior seasons)", () => {
    // Same Birthseason/Birthday, but playerrecord carries the previous
    // incarnation's seasons under the same PlayerID.
    const p = transformPlayer(
      player({ Birthseason: 14, Birthday: 213 }),
      "Team",
      null,
      [record(12, "s12"), record(13, "s13"), record(14, SEASON_14_ID)],
      SEASON_14_ID,
      263,
    );

    expect(p.recomped).toBe(true);
    expect(p.gameStats).toBeNull();
  });

  it("keeps stats for a player recomped in a PRIOR season", () => {
    // Honda Ripken II: Birthseason 11, long record history, current season 14.
    const p = transformPlayer(
      player({ Birthseason: 11, Birthday: 225 }),
      "Team",
      null,
      [record(10, "s10"), record(11, "s11"), record(14, SEASON_14_ID)],
      SEASON_14_ID,
      263,
    );

    expect(p.recomped).toBeUndefined();
    expect(p.gameStats?.PA).toBe(52);
  });

  it("keeps stats when Birthday is 'Preseason'", () => {
    const p = transformPlayer(
      player({ Birthseason: 14, Birthday: "Preseason" as unknown as number }),
      "Team",
      null,
      [record(12, "s12"), record(14, SEASON_14_ID)],
      SEASON_14_ID,
      263,
    );

    expect(p.recomped).toBeUndefined();
    expect(p.gameStats?.PA).toBe(52);
  });

  it("keeps stats when playerrecord is unavailable", () => {
    const p = transformPlayer(
      player({ Birthseason: 14, Birthday: 213 }),
      "Team",
      null,
      undefined,
      SEASON_14_ID,
      263,
    );

    expect(p.recomped).toBeUndefined();
    expect(p.gameStats?.PA).toBe(52);
  });
});

describe("extractGameStats E1 fallback (PR-G — keep cumulative fallback, decided 2026-08)", () => {
  const REG = (stats: Record<string, number>): MmolbApiPlayerRecord =>
    ({ Season: 15, SeasonID: "S15", SeasonStatus: "Regular Season", Stats: { t1: stats } }) as MmolbApiPlayerRecord;
  const line = (pa: number) => ({
    plate_appearances: pa, at_bats: Math.round(pa * 0.9), singles: 20, doubles: 4,
    triples: 1, home_runs: 3, walked: 6, hit_by_pitch: 1, sac_flies: 1, struck_out: 15,
  });

  it("prefers the current-season Regular Season record over the cumulative player.Stats", () => {
    const cumulative = { t1: line(999) }; // player.Stats: cumulative / unfiltered blob
    const gs = extractGameStats(cumulative, "batter", [REG(line(100))], "S15");
    expect(gs?.PA).toBe(100); // from the record, NOT the cumulative 999
  });

  it("KEEPS the cumulative player.Stats fallback when there is no current-season Regular Season record", () => {
    const cumulative = { t1: line(999) };
    const priorSeason = REG(line(50));
    priorSeason.SeasonID = "S14"; // not the current season -> no match -> fall back to player.Stats
    const gs = extractGameStats(cumulative, "batter", [priorSeason], "S15");
    expect(gs?.PA).toBe(999); // decided: keep the fallback (not N/A)
  });

  it("returns null only when there is neither a current-season record nor player.Stats", () => {
    expect(extractGameStats(undefined, "batter", [], "S15")).toBeNull();
  });
});
