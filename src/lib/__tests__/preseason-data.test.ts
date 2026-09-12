import { describe, expect, it } from "vitest";
import type { MmolbApiPlayer, MmolbApiPlayerRecord } from "@/lib/mmolb-api";
import type { RosterPlayer } from "@/lib/types";
import {
  buildPreseasonPlayerData,
  computePreseasonBatting,
  computePreseasonPitching,
  extractPreseasonStats,
} from "@/lib/preseason-data";

const CURRENT_SEASON_ID = "current";
const TEAM_ID = "team-1";

function record(
  SeasonStatus: string,
  SeasonID: string,
  Stats: Record<string, Record<string, number>>,
  id: string,
): MmolbApiPlayerRecord {
  return {
    FirstName: "Test",
    LastName: "Player",
    PlayerID: "player-1",
    Season: 16,
    SeasonID,
    SeasonStatus,
    Stats,
    _id: id,
  };
}

describe("extractPreseasonStats", () => {
  it("requires both current SeasonID and Offseason status", () => {
    const pastOffseason = record("Offseason", "past", { [TEAM_ID]: { plate_appearances: 99 } }, "past");
    const currentRegular = record("Regular Season", CURRENT_SEASON_ID, { [TEAM_ID]: { plate_appearances: 88 } }, "regular");
    const currentOffseason = record("Offseason", CURRENT_SEASON_ID, {
      [TEAM_ID]: { plate_appearances: 27 },
      "other-team": { plate_appearances: 41 },
    }, "current");

    expect(extractPreseasonStats([pastOffseason], CURRENT_SEASON_ID)).toBeNull();
    expect(extractPreseasonStats([currentRegular], CURRENT_SEASON_ID)).toBeNull();
    expect(extractPreseasonStats(
      [pastOffseason, currentRegular, currentOffseason],
      CURRENT_SEASON_ID,
      TEAM_ID,
    )).toEqual({ plate_appearances: 27 });
  });

  it("uses the first match when duplicate current Offseason records exist", () => {
    const first = record("Offseason", CURRENT_SEASON_ID, { [TEAM_ID]: { plate_appearances: 12 } }, "first");
    const second = record("Offseason", CURRENT_SEASON_ID, { [TEAM_ID]: { plate_appearances: 34 } }, "second");
    expect(extractPreseasonStats([first, second], CURRENT_SEASON_ID, TEAM_ID)).toEqual({
      plate_appearances: 12,
    });
  });
});

describe("computePreseasonBatting", () => {
  it("computes true OBP, SLG, derived total bases, and OPS", () => {
    const result = computePreseasonBatting({
      plate_appearances: 30,
      at_bats: 20,
      singles: 4,
      doubles: 2,
      triples: 1,
      home_runs: 1,
      walked: 4,
      hit_by_pitch: 1,
      sac_flies: 1,
      struck_out: 6,
      strikeouts: 99,
    });

    expect(result).not.toBeNull();
    expect(result?.H).toBe(8);
    expect(result?.totalBases).toBe(15);
    expect(result?.OBP).toBeCloseTo(13 / 26);
    expect(result?.SLG).toBeCloseTo(15 / 20);
    expect(result?.OPS).toBeCloseTo((13 / 26) + (15 / 20));
    expect(result?.SO_PCT).toBeCloseTo(6 / 30);
  });

  it("guards a zero OBP denominator and permits OBP when AB is zero", () => {
    const empty = computePreseasonBatting({ plate_appearances: 0 });
    expect(empty?.OBP).toBeNull();
    expect(empty?.SLG).toBeNull();
    expect(empty?.OPS).toBeNull();
    expect(empty?.SO_PCT).toBeNull();

    const walksOnly = computePreseasonBatting({ plate_appearances: 2, walked: 2 });
    expect(walksOnly?.OBP).toBe(1);
    expect(walksOnly?.SLG).toBeNull();
    expect(walksOnly?.OPS).toBeNull();
  });

  it("uses the batter strikeout field while pitching keeps its separate field", () => {
    expect(computePreseasonBatting({ plate_appearances: 10, struck_out: 2, strikeouts: 9 })?.SO_PCT).toBe(0.2);
    expect(computePreseasonPitching({ outs: 27, strikeouts: 9 })?.K9).toBe(9);
  });
});

describe("computePreseasonPitching", () => {
  it("derives fractional innings from outs and computes ERA, WHIP, and K/9", () => {
    const result = computePreseasonPitching({
      outs: 17,
      earned_runs: 2,
      hits_allowed: 5,
      walks: 2,
      strikeouts: 8,
    });

    expect(result?.IP).toBeCloseTo(17 / 3);
    expect(result?.ERA).toBeCloseTo((9 * 2) / (17 / 3));
    expect(result?.WHIP).toBeCloseTo(7 / (17 / 3));
    expect(result?.K9).toBeCloseTo((9 * 8) / (17 / 3));
  });

  it("returns null rate stats at zero outs and treats omitted counters as zero", () => {
    const noOuts = computePreseasonPitching({ earned_runs: 1 });
    expect(noOuts).toMatchObject({ outs: 0, IP: 0, ERA: null, WHIP: null, K9: null });

    const scoreless = computePreseasonPitching({ outs: 9, hits_allowed: 2, strikeouts: 4 });
    expect(scoreless).toMatchObject({ earnedRuns: 0, walks: 0, ERA: 0 });
  });
});

describe("buildPreseasonPlayerData", () => {
  it("preserves normalized equipment without applying it to base stats", () => {
    const rosterPlayer: RosterPlayer = {
      mmolbPlayerId: "player-1",
      firstName: "Test",
      lastName: "Fielder",
      name: "Test Fielder",
      level: 20,
      slot: "Lineup",
      position: "SS",
      isBench: false,
    };
    const raw = {
      _id: "player-1",
      FirstName: "Test",
      LastName: "Fielder",
      Level: 20,
      Position: "SS",
      PositionType: "Batter",
      TeamID: TEAM_ID,
      BaseAttributeBonuses: [{ attribute: "Reaction", amount: 0.1, source: "base" }],
      ScheduledLevelUps: [],
      AugmentHistory: [],
      PitchTypes: [],
      PitchSelection: [],
      LesserDurability: 5,
      GreaterDurability: 5,
      Equipment: {
        Hands: {
          Slot: "Hands",
          Name: "Quick Glove",
          Emoji: "",
          Effects: [{ Attribute: "Reaction", Tier: 4, Type: "FlatBonus", Value: 0.5 }],
        },
      },
    } as MmolbApiPlayer;

    const result = buildPreseasonPlayerData(rosterPlayer, raw, [], CURRENT_SEASON_ID, TEAM_ID);

    expect(result.stats.reaction).toBe(10);
    expect(result.equipment?.hands.effects[0]).toEqual({
      attribute: "reaction",
      tier: 4,
      type: "flat",
      value: 50,
    });
  });
});
