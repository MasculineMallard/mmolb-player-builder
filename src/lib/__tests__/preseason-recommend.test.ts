import { describe, expect, it } from "vitest";
import type { PositionDefenseMap } from "@/lib/evaluator-data";
import type {
  PreseasonBattingStats,
  PreseasonPitchingStats,
  PreseasonPlayerData,
} from "@/lib/preseason-data";
import {
  recommendBattingOrder,
  recommendPitchingStaff,
  recommendPositions,
} from "@/lib/preseason-recommend";

function player(
  id: string,
  position: string,
  options: {
    PA?: number;
    outs?: number;
    OBP?: number | null;
    SLG?: number | null;
    OPS?: number | null;
    ERA?: number | null;
    WHIP?: number | null;
    K9?: number | null;
    SO_PCT?: number | null;
    stats?: Record<string, number>;
  } = {},
): PreseasonPlayerData {
  const isPitcher = ["SP", "RP", "CL", "P"].includes(position);
  const PA = options.PA ?? (isPitcher ? 0 : 30);
  const outs = options.outs ?? (isPitcher ? 30 : 0);
  const batting: PreseasonBattingStats | null = isPitcher ? null : {
    PA,
    AB: PA,
    H: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    walks: 0,
    hitByPitch: 0,
    sacrificeFlies: 0,
    strikeouts: Math.round(PA * (options.SO_PCT ?? 0.2)),
    totalBases: 0,
    OBP: options.OBP ?? 0,
    SLG: options.SLG ?? 0,
    OPS: options.OPS ?? ((options.OBP ?? 0) + (options.SLG ?? 0)),
    SO_PCT: options.SO_PCT ?? 0.2,
  };
  const pitching: PreseasonPitchingStats | null = isPitcher ? {
    outs,
    IP: outs / 3,
    earnedRuns: 0,
    hitsAllowed: 0,
    walks: 0,
    strikeouts: 0,
    ERA: options.ERA ?? 3,
    WHIP: options.WHIP ?? 1,
    K9: options.K9 ?? 9,
  } : null;

  return {
    name: id,
    firstName: id,
    lastName: "Player",
    level: 20,
    teamName: "Test",
    teamEmoji: null,
    position,
    durability: 5,
    stats: options.stats ?? { velocity: 100, contact: 100 },
    lesserBoons: [],
    greaterBoons: [],
    mmolbPlayerId: id,
    pitches: [],
    isBench: false,
    preseasonBatting: batting,
    preseasonPitching: pitching,
    sampleSize: { PA, outs },
    dataWarnings: [],
  };
}

function roleMap(count: number, closerRank: number) {
  const pitchers = Array.from({ length: count }, (_, index) => player(`p${index + 1}`, "SP", {
    ERA: index + 1,
    WHIP: index + 1,
    K9: count - index,
  }));
  return Object.fromEntries(
    recommendPitchingStaff(pitchers, closerRank).entries.map((entry) => [entry.player.mmolbPlayerId, entry.role]),
  );
}

describe("recommendPitchingStaff", () => {
  it("computes exact rank-weighted performance and 75/25 blend values", () => {
    const result = recommendPitchingStaff([
      player("a", "SP", { ERA: 1, WHIP: 2, K9: 1 }),
      player("b", "SP", { ERA: 2, WHIP: 3, K9: 3 }),
      player("c", "SP", { ERA: 3, WHIP: 1, K9: 2 }),
    ]);
    const byId = Object.fromEntries(result.entries.map((entry) => [entry.player.mmolbPlayerId, entry]));

    expect(byId.a.performanceScore).toBeCloseTo(50.5);
    expect(byId.b.performanceScore).toBeCloseTo(50);
    expect(byId.c.performanceScore).toBeCloseTo(49.5);
    expect(byId.a.blendedScore).toBeCloseTo(62.875);
    expect(byId.b.blendedScore).toBeCloseTo(62.5);
    expect(byId.c.blendedScore).toBeCloseTo(62.125);
  });

  it("uses neutral rank 50 for a single pitcher and all-equal stats", () => {
    const single = recommendPitchingStaff([player("solo", "SP")]);
    expect(single.entries[0].performanceScore).toBe(50);
    expect(single.entries[0].blendedScore).toBe(62.5);

    const equal = recommendPitchingStaff([player("a", "SP"), player("b", "SP"), player("c", "SP")]);
    expect(equal.entries.map((entry) => entry.performanceScore)).toEqual([50, 50, 50]);
  });

  it("assigns the exact role map for closer ranks 4, 1, and 7", () => {
    expect(roleMap(9, 4)).toEqual({
      p1: "Starter", p2: "Starter", p3: "Starter", p4: "Closer", p5: "Starter",
      p6: "Starter", p7: "Reliever", p8: "Reliever", p9: "Reliever",
    });
    expect(roleMap(9, 1)).toEqual({
      p1: "Closer", p2: "Starter", p3: "Starter", p4: "Starter", p5: "Starter",
      p6: "Starter", p7: "Reliever", p8: "Reliever", p9: "Reliever",
    });
    expect(roleMap(9, 7)).toEqual({
      p1: "Starter", p2: "Starter", p3: "Starter", p4: "Starter", p5: "Starter",
      p6: "Reliever", p7: "Closer", p8: "Reliever", p9: "Reliever",
    });
  });

  it("clamps closer rank, fills roster roles, and flags below-floor fallbacks", () => {
    const three = recommendPitchingStaff([
      player("p1", "SP", { ERA: 1 }),
      player("p2", "SP", { ERA: 2 }),
      player("p3", "SP", { ERA: 3 }),
    ]);
    expect(three.closerRank).toBe(3);
    expect(three.entries.find((entry) => entry.role === "Closer")?.player.mmolbPlayerId).toBe("p3");

    const overflow = recommendPitchingStaff(Array.from({ length: 11 }, (_, index) => player(`x${index + 1}`, "SP", {
      ERA: index + 1,
      WHIP: index + 1,
      K9: 20 - index,
    })));
    expect(overflow.entries.filter((entry) => entry.role === "Depth")).toHaveLength(2);

    const tiny = player("tiny", "SP", { outs: 8, stats: { velocity: 1000 } });
    const regular = player("regular", "SP", { outs: 9, stats: { accuracy: 100 } });
    const floor = recommendPitchingStaff([tiny, regular], 1);
    expect(floor.entries.find((entry) => entry.player.mmolbPlayerId === "tiny")).toMatchObject({
      role: "Starter", roleEligible: false, rank: 2, lowSample: true,
    });
    expect(floor.entries.find((entry) => entry.player.mmolbPlayerId === "regular")?.role).toBe("Closer");

    const softBoundary = recommendPitchingStaff([
      player("outs29", "SP", { outs: 29 }),
      player("outs30", "SP", { outs: 30 }),
    ]);
    expect(softBoundary.entries.find((entry) => entry.player.mmolbPlayerId === "outs29")?.lowSample).toBe(true);
    expect(softBoundary.entries.find((entry) => entry.player.mmolbPlayerId === "outs30")?.lowSample).toBe(false);
  });

  it("always allocates three relievers when nine arms exist and can force a below-floor SP", () => {
    const qualified = Array.from({ length: 9 }, (_, index) => player(`q${index + 1}`, "SP", {
      ERA: index + 1,
      WHIP: index + 1,
      K9: 20 - index,
    }));
    const tiny = player("tiny", "SP", { outs: 0, stats: { velocity: 1000 } });
    const result = recommendPitchingStaff([...qualified, tiny], 4, new Set(["tiny"]));

    expect(result.entries.filter((entry) => entry.role === "Starter")).toHaveLength(5);
    expect(result.entries.filter((entry) => entry.role === "Reliever")).toHaveLength(3);
    expect(result.entries.filter((entry) => entry.role === "Closer")).toHaveLength(1);
    expect(result.entries.find((entry) => entry.player.mmolbPlayerId === "tiny")).toMatchObject({
      role: "Starter",
      forcedStarter: true,
      roleEligible: false,
      lowSample: true,
    });
  });

  it("uses attribute score then player id as deterministic tie-breaks", () => {
    const highAttr = player("z-high", "SP", { stats: { velocity: 100 } });
    const lowAttr = player("a-low", "SP", { stats: { accuracy: 100 } });
    expect(recommendPitchingStaff([lowAttr, highAttr]).entries[0].player.mmolbPlayerId).toBe("z-high");

    const idTie = recommendPitchingStaff([player("b", "SP"), player("a", "SP")]);
    expect(idTie.entries.map((entry) => entry.player.mmolbPlayerId)).toEqual(["a", "b"]);
  });
});

describe("recommendBattingOrder", () => {
  it("fills OBP 1-2, SLG 3-4, then OPS with greedy dedup", () => {
    const batters = Array.from({ length: 10 }, (_, index) => player(`b${index + 1}`, "C", {
      OBP: index === 0 ? 0.6 : index === 1 ? 0.5 : 0.2,
      SLG: index === 2 ? 0.9 : index === 3 ? 0.8 : 0.3,
      OPS: 1.5 - (index * 0.1),
    }));
    const result = recommendBattingOrder(batters);
    expect(result.lineup.slice(0, 4).map((entry) => entry.player.mmolbPlayerId)).toEqual(["b1", "b2", "b3", "b4"]);
    expect(result.lineup.map((entry) => entry.player.mmolbPlayerId)).toHaveLength(9);
    expect(new Set(result.lineup.map((entry) => entry.player.mmolbPlayerId)).size).toBe(9);
    expect(result.lineup.map((entry) => entry.driver)).toEqual([
      "OBP", "OBP", "SLG", "SLG", "OPS", "OPS", "OPS", "OPS", "OPS",
    ]);
  });

  it("enforces the PA floor, reports an incomplete lineup, and toggles soft flags at 25 PA", () => {
    const pa9 = player("pa9", "C", { PA: 9, OBP: 1 });
    const pa10 = player("pa10", "C", { PA: 10, OBP: 0.9 });
    const pa24 = player("pa24", "C", { PA: 24, OBP: 0.8 });
    const pa25 = player("pa25", "C", { PA: 25, OBP: 0.7 });
    const result = recommendBattingOrder([pa9, pa10, pa24, pa25]);

    expect(result.lineup.map((entry) => entry.player.mmolbPlayerId)).not.toContain("pa9");
    expect(result.incomplete).toBe(true);
    expect(result.lineup.find((entry) => entry.player.mmolbPlayerId === "pa24")?.lowSample).toBe(true);
    expect(result.lineup.find((entry) => entry.player.mmolbPlayerId === "pa25")?.lowSample).toBe(false);
  });

  it("breaks batting ties by attribute score and then player id", () => {
    const lowAttr = player("a-low", "C", { OBP: 0.5, stats: { vision: 100 } });
    const highAttr = player("z-high", "C", { OBP: 0.5, stats: { contact: 100 } });
    const idA = player("a", "C", { OBP: 0.4, stats: { contact: 100 } });
    const idB = player("b", "C", { OBP: 0.4, stats: { contact: 100 } });
    const result = recommendBattingOrder([lowAttr, highAttr, idB, idA]);

    expect(result.lineup.slice(0, 4).map((entry) => entry.player.mmolbPlayerId)).toEqual([
      "z-high", "a-low", "a", "b",
    ]);
  });

  it("supports OBP, OPS, SLG, and lowest-SO% alternate sorts", () => {
    const batters = [
      player("a", "C", { OBP: 0.5, SLG: 0.3, OPS: 0.8, SO_PCT: 0.3 }),
      player("b", "C", { OBP: 0.4, SLG: 0.8, OPS: 1.2, SO_PCT: 0.1 }),
      player("c", "C", { OBP: 0.3, SLG: 0.6, OPS: 0.9, SO_PCT: 0.2 }),
    ];

    expect(recommendBattingOrder(batters, "OBP").lineup.map((entry) => entry.player.mmolbPlayerId)).toEqual(["a", "b", "c"]);
    expect(recommendBattingOrder(batters, "OPS").lineup.map((entry) => entry.player.mmolbPlayerId)).toEqual(["b", "c", "a"]);
    expect(recommendBattingOrder(batters, "SLG").lineup.map((entry) => entry.player.mmolbPlayerId)).toEqual(["b", "c", "a"]);
    expect(recommendBattingOrder(batters, "SO%").lineup.map((entry) => entry.player.mmolbPlayerId)).toEqual(["b", "c", "a"]);
  });
});

const defense: PositionDefenseMap = {
  C: { stat_weights: { awareness: 1 }, primary_stats: ["awareness"], secondary_stats: [] },
  "1B": { stat_weights: { arm: 1 }, primary_stats: ["arm"], secondary_stats: [] },
  "2B": { stat_weights: { agility: 1 }, primary_stats: ["agility"], secondary_stats: [] },
  "3B": { stat_weights: { reaction: 1 }, primary_stats: ["reaction"], secondary_stats: [] },
  SS: { stat_weights: { dexterity: 1 }, primary_stats: ["dexterity"], secondary_stats: [] },
  LF: { stat_weights: { acrobatics: 1 }, primary_stats: ["acrobatics"], secondary_stats: [] },
  CF: { stat_weights: { composure: 1 }, primary_stats: ["composure"], secondary_stats: [] },
  RF: { stat_weights: { patience: 1 }, primary_stats: ["patience"], secondary_stats: [] },
};

describe("recommendPositions", () => {
  it("uses per-cell position overrides and finds a known non-greedy optimum", () => {
    const players = [
      player("a-flex", "C", { stats: { awareness: 200, arm: 126 } }),
      player("b-catcher", "C", { stats: { awareness: 198 } }),
      player("c-2b", "2B", { stats: { agility: 140 } }),
      player("d-3b", "3B", { stats: { reaction: 140 } }),
      player("e-ss", "SS", { stats: { dexterity: 140 } }),
      player("f-lf", "LF", { stats: { acrobatics: 140 } }),
      player("g-cf", "CF", { stats: { composure: 140 } }),
      player("h-rf", "RF", { stats: { patience: 140 } }),
    ];
    const result = recommendPositions(players, defense);
    const byPosition = Object.fromEntries(result.fielders.map((assignment) => [assignment.assignedPosition, assignment]));

    expect(result.fielders).toHaveLength(8);
    expect(result.totalFit).toBe(789);
    expect(byPosition.C.player.mmolbPlayerId).toBe("b-catcher");
    expect(byPosition["1B"].player.mmolbPlayerId).toBe("a-flex");
    expect(byPosition["1B"]).toMatchObject({ personalBestPosition: "C", isPersonalBest: false, fitScore: 90 });
  });

  it("honors a position lock and re-optimizes every remaining fielding spot", () => {
    const players = [
      player("a-flex", "C", { stats: { awareness: 200, arm: 126 } }),
      player("b-catcher", "C", { stats: { awareness: 198 } }),
      player("c-2b", "2B", { stats: { agility: 140 } }),
      player("d-3b", "3B", { stats: { reaction: 140 } }),
      player("e-ss", "SS", { stats: { dexterity: 140 } }),
      player("f-lf", "LF", { stats: { acrobatics: 140 } }),
      player("g-cf", "CF", { stats: { composure: 140 } }),
      player("h-rf", "RF", { stats: { patience: 140 } }),
    ];

    const automatic = recommendPositions(players, defense);
    const locked = recommendPositions(players, defense, undefined, { C: "a-flex" });
    const automaticByPosition = Object.fromEntries(automatic.fielders.map((assignment) => [assignment.assignedPosition, assignment]));
    const lockedByPosition = Object.fromEntries(locked.fielders.map((assignment) => [assignment.assignedPosition, assignment]));

    expect(automaticByPosition.C.player.mmolbPlayerId).toBe("b-catcher");
    expect(lockedByPosition.C).toMatchObject({
      isLocked: true,
      player: { mmolbPlayerId: "a-flex" },
    });
    expect(lockedByPosition["1B"].player.mmolbPlayerId).toBe("b-catcher");
    expect(new Set(locked.fielders.map((assignment) => assignment.player.mmolbPlayerId)).size).toBe(8);
    expect(new Set(locked.startingBatterIds)).toEqual(new Set(automatic.startingBatterIds));
  });

  it("handles missing defense stats, ignores gameStats, and spills extras to DH/bench", () => {
    const base = [
      player("a", "C", { stats: { awareness: 200 } }),
      player("b", "1B", { stats: { arm: 140 } }),
      player("c", "2B", { stats: { agility: 140 } }),
      player("d", "3B", { stats: { reaction: 140 } }),
      player("e", "SS", { stats: { dexterity: 140 } }),
      player("f", "LF", { stats: { acrobatics: 140 } }),
      player("g", "CF", { stats: { composure: 140 } }),
      player("h", "RF", { stats: { patience: 140 } }),
    ];
    const missing = player("missing", "DH", { stats: {}, OPS: 2 });
    missing.gameStats = { PA: 999, OBP: 1, SLG: 4, OPS: 5 };
    const bench = player("bench", "C", { stats: {}, OPS: 1 });
    const pitcher = player("pitcher", "SP");
    const startingNine = [...base.map((entry) => entry.mmolbPlayerId), missing.mmolbPlayerId];
    const result = recommendPositions([...base, missing, bench, pitcher], defense, startingNine);

    expect(result.fielders).toHaveLength(8);
    expect(result.designatedHitter?.player.mmolbPlayerId).toBe("missing");
    expect(result.bench.map((assignment) => assignment.player.mmolbPlayerId)).toContain("bench");
    expect(result.pitchers.map((entry) => entry.mmolbPlayerId)).toEqual(["pitcher"]);
    expect(new Set(result.startingBatterIds)).toEqual(new Set(startingNine));
    expect(result.battingOrderLocked).toBe(true);
    expect(result.alternatives).toHaveLength(8);
    expect(result.bench[0].positionOptions).toHaveLength(3);
  });

  it("exposes the two highest-weighted raw stats for each assigned position", () => {
    const weightedDefense: PositionDefenseMap = {
      ...defense,
      "1B": {
        stat_weights: { reaction: 0.12, composure: 0.07, awareness: 0.05 },
        primary_stats: ["reaction"],
        secondary_stats: ["composure", "awareness"],
      },
    };
    const players = Array.from({ length: 8 }, (_, index) => player(`raw-${index}`, "C", {
      stats: { reaction: 321 - index, composure: 210 - index, awareness: 99 },
    }));
    const result = recommendPositions(players, weightedDefense, players.map((entry) => entry.mmolbPlayerId));
    const firstBase = result.fielders.find((entry) => entry.assignedPosition === "1B");

    expect(firstBase?.keyStats.map((entry) => entry.stat)).toEqual(["reaction", "composure"]);
    expect(firstBase?.keyStats.map((entry) => entry.value)).toEqual([
      firstBase?.player.stats.reaction,
      firstBase?.player.stats.composure,
    ]);
  });
});
