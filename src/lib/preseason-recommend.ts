import {
  computeAttributeScore,
  computePositionFitScore,
  findBestFitPosition,
  getPlayerRole,
} from "./evaluator";
import type { PositionDefenseMap } from "./evaluator-data";
import { computeItemAdjustedStats } from "./equipped-stats";
import {
  FIELDING_POSITIONS,
  LOW_SAMPLE_OUTS,
  LOW_SAMPLE_PA,
  MIN_OUTS_STAFF,
  MIN_PA_LINEUP,
} from "./constants";
import type { PreseasonPlayerData } from "./preseason-data";

export type PitchingRole = "Starter" | "Closer" | "Reliever" | "Depth";

export interface PitchingStaffEntry {
  player: PreseasonPlayerData;
  rank: number | null;
  role: PitchingRole;
  performanceScore: number | null;
  attributeScore: number;
  blendedScore: number;
  roleEligible: boolean;
  lowSample: boolean;
  forcedStarter: boolean;
}

export interface PitchingStaffRec {
  entries: PitchingStaffEntry[];
  closerRank: number | null;
  eligibleCount: number;
  rankedCount: number;
  hasLowSample: boolean;
}

export type BattingDriver = "OBP" | "SLG" | "OPS" | "SO%";
export type BattingOrderMode = "recommended" | "OBP" | "OPS" | "SLG" | "SO%";

export interface BattingOrderEntry {
  player: PreseasonPlayerData;
  slot: number;
  driver: BattingDriver;
  value: number | null;
  lowSample: boolean;
  fallback: boolean;
}

export interface BattingOrderRec {
  lineup: BattingOrderEntry[];
  unplaced: PreseasonPlayerData[];
  qualifiedCount: number;
  incomplete: boolean;
  hasLowSample: boolean;
}

export interface PositionAssignment {
  player: PreseasonPlayerData;
  assignedPosition: string;
  personalBestPosition: string;
  fitScore: number | null;
  isPersonalBest: boolean;
  isLocked: boolean;
  keyStats: PositionFitStat[];
  positionOptions: PositionFitOption[];
}

export interface PositionFitStat {
  stat: string;
  value: number;
  weight: number;
}

export interface PositionFitOption {
  position: string;
  fitScore: number;
  keyStats: PositionFitStat[];
}

export interface PositionAlternative {
  position: string;
  player: PreseasonPlayerData;
  fitScore: number;
  keyStats: PositionFitStat[];
  isStarter: boolean;
}

export interface PositionAssignmentRec {
  fielders: PositionAssignment[];
  designatedHitter: PositionAssignment | null;
  bench: PositionAssignment[];
  pitchers: PreseasonPlayerData[];
  alternatives: PositionAlternative[];
  startingBatterIds: string[];
  battingOrderLocked: boolean;
  totalFit: number;
}

type Direction = "higher" | "lower";

function tieBreakByAttribute(
  a: PreseasonPlayerData,
  b: PreseasonPlayerData,
  role: "batter" | "pitcher",
): number {
  const attrDifference = computeAttributeScore(b, role) - computeAttributeScore(a, role);
  return attrDifference || a.mmolbPlayerId.localeCompare(b.mmolbPlayerId);
}

/** Best maps to 100, worst to 0, with tied values sharing their occupied mid-rank. */
function rankMetric(
  players: PreseasonPlayerData[],
  valueFor: (player: PreseasonPlayerData) => number | null,
  direction: Direction,
): Map<string, number> {
  if (players.length === 1) return new Map([[players[0].mmolbPlayerId, 50]]);

  const ranked = players
    .map((player) => ({ player, value: valueFor(player) }))
    .sort((a, b) => {
      if (a.value == null && b.value == null) return a.player.mmolbPlayerId.localeCompare(b.player.mmolbPlayerId);
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      const metricOrder = direction === "higher" ? b.value - a.value : a.value - b.value;
      return metricOrder || a.player.mmolbPlayerId.localeCompare(b.player.mmolbPlayerId);
    });
  const scores = new Map<string, number>();

  for (let start = 0; start < ranked.length;) {
    let end = start;
    while (end + 1 < ranked.length && ranked[end + 1].value === ranked[start].value) end += 1;
    const midRank = (start + end) / 2;
    const score = 100 * (1 - (midRank / (ranked.length - 1)));
    for (let index = start; index <= end; index += 1) {
      scores.set(ranked[index].player.mmolbPlayerId, score);
    }
    start = end + 1;
  }

  return scores;
}

export function recommendPitchingStaff(
  pitchers: PreseasonPlayerData[],
  closerRank = 4,
  forcedStarterIds: ReadonlySet<string> = new Set(),
): PitchingStaffRec {
  const pitcherRows = pitchers.filter((player) => getPlayerRole(player.position) === "pitcher");
  const qualifying = pitcherRows.filter(
    (player) => player.preseasonPitching != null && player.sampleSize.outs >= MIN_OUTS_STAFF,
  );
  const eraRanks = rankMetric(qualifying, (player) => player.preseasonPitching?.ERA ?? null, "lower");
  const whipRanks = rankMetric(qualifying, (player) => player.preseasonPitching?.WHIP ?? null, "lower");
  const k9Ranks = rankMetric(qualifying, (player) => player.preseasonPitching?.K9 ?? null, "higher");

  const eligibleEntries = qualifying.map((player): PitchingStaffEntry => {
    const performanceScore =
      (0.34 * (eraRanks.get(player.mmolbPlayerId) ?? 50)) +
      (0.33 * (whipRanks.get(player.mmolbPlayerId) ?? 50)) +
      (0.33 * (k9Ranks.get(player.mmolbPlayerId) ?? 50));
    const attributeScore = computeAttributeScore(player, "pitcher");
    return {
      player,
      rank: null,
      role: "Depth",
      performanceScore,
      attributeScore,
      blendedScore: (0.75 * performanceScore) + (0.25 * attributeScore),
      roleEligible: true,
      lowSample: player.sampleSize.outs < LOW_SAMPLE_OUTS,
      forcedStarter: false,
    };
  }).sort((a, b) =>
    (b.blendedScore - a.blendedScore) ||
    (b.attributeScore - a.attributeScore) ||
    a.player.mmolbPlayerId.localeCompare(b.player.mmolbPlayerId),
  );

  const belowFloorEntries = pitcherRows
    .filter((player) => !qualifying.includes(player))
    .map((player): PitchingStaffEntry => {
      const attributeScore = computeAttributeScore(player, "pitcher");
      return {
        player,
        rank: null,
        role: "Depth",
        performanceScore: null,
        attributeScore,
        blendedScore: attributeScore,
        roleEligible: false,
        lowSample: true,
        forcedStarter: false,
      };
    })
    .sort((a, b) =>
      (b.attributeScore - a.attributeScore) ||
      a.player.mmolbPlayerId.localeCompare(b.player.mmolbPlayerId),
    );

  // Qualified arms stay ahead of attribute-only fallbacks. This preserves the
  // sample floor for ranking while still filling a complete 5 SP / 3 RP / 1 CL
  // staff whenever the roster has nine pitchers.
  const entries = [...eligibleEntries, ...belowFloorEntries];
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  const forcedEntries = entries
    .filter((entry) => forcedStarterIds.has(entry.player.mmolbPlayerId))
    .slice(0, 5);
  const forcedIds = new Set(forcedEntries.map((entry) => entry.player.mmolbPlayerId));
  forcedEntries.forEach((entry) => {
    entry.role = "Starter";
    entry.forcedStarter = true;
  });

  const closerCandidates = entries.filter((entry) => !forcedIds.has(entry.player.mmolbPlayerId));
  const requestedCloserRank = Math.max(Math.trunc(closerRank) || 1, 1);
  const closer = closerCandidates.length > 0
    ? [...closerCandidates].sort((a, b) => {
      const aDistance = Math.abs((a.rank ?? 1) - requestedCloserRank);
      const bDistance = Math.abs((b.rank ?? 1) - requestedCloserRank);
      return aDistance - bDistance || (a.rank ?? 1) - (b.rank ?? 1);
    })[0]
    : null;
  if (closer) closer.role = "Closer";

  let startersAssigned = forcedEntries.length;
  for (const entry of entries) {
    if (entry.role !== "Depth") continue;
    if (startersAssigned < 5) {
      entry.role = "Starter";
      startersAssigned += 1;
    }
  }

  let relieversAssigned = 0;
  for (const entry of entries) {
    if (entry.role !== "Depth") continue;
    if (relieversAssigned < 3) {
      entry.role = "Reliever";
      relieversAssigned += 1;
    }
  }

  return {
    entries,
    closerRank: closer?.rank ?? null,
    eligibleCount: eligibleEntries.length,
    rankedCount: entries.length,
    hasLowSample: entries.some((entry) => entry.lowSample),
  };
}

function battingMetric(player: PreseasonPlayerData, driver: BattingDriver): number | null {
  if (driver === "SO%") return player.preseasonBatting?.SO_PCT ?? null;
  return player.preseasonBatting?.[driver] ?? null;
}

function sortBatters(
  players: PreseasonPlayerData[],
  driver: BattingDriver,
): PreseasonPlayerData[] {
  return [...players].sort((a, b) => {
    const aValue = battingMetric(a, driver);
    const bValue = battingMetric(b, driver);
    if (aValue == null && bValue != null) return 1;
    if (aValue != null && bValue == null) return -1;
    if (aValue != null && bValue != null && aValue !== bValue) {
      return driver === "SO%" ? aValue - bValue : bValue - aValue;
    }
    return tieBreakByAttribute(a, b, "batter");
  });
}

export function recommendBattingOrder(
  batters: PreseasonPlayerData[],
  mode: BattingOrderMode = "recommended",
): BattingOrderRec {
  const batterRows = batters.filter((player) => getPlayerRole(player.position) === "batter");
  const qualified = batterRows.filter(
    (player) => player.preseasonBatting != null && player.sampleSize.PA >= MIN_PA_LINEUP,
  );
  const remaining = [...qualified];
  const lineup: BattingOrderEntry[] = [];
  const drivers: BattingDriver[] = mode === "recommended"
    ? ["OBP", "OBP", "SLG", "SLG", "OPS", "OPS", "OPS", "OPS", "OPS"]
    : Array.from({ length: 9 }, () => mode);

  for (const driver of drivers) {
    if (remaining.length === 0) break;
    const player = sortBatters(remaining, driver)[0];
    remaining.splice(remaining.indexOf(player), 1);
    const value = battingMetric(player, driver);
    lineup.push({
      player,
      slot: lineup.length + 1,
      driver,
      value,
      lowSample: player.sampleSize.PA < LOW_SAMPLE_PA,
      fallback: value == null,
    });
  }

  const placedIds = new Set(lineup.map((entry) => entry.player.mmolbPlayerId));
  const unplaced = batterRows.filter((player) => !placedIds.has(player.mmolbPlayerId));
  return {
    lineup,
    unplaced,
    qualifiedCount: qualified.length,
    incomplete: lineup.length < 9,
    hasLowSample: lineup.some((entry) => entry.lowSample),
  };
}

interface AssignmentPair {
  playerIndex: number;
  positionIndex: number;
}

interface AssignmentSolution {
  score: number;
  pairs: AssignmentPair[];
}

function itemAdjustedPlayer(player: PreseasonPlayerData): PreseasonPlayerData {
  return { ...player, stats: computeItemAdjustedStats(player) };
}

interface AssignmentPriorityGroup {
  stat: string;
  positions: Array<{ position: string; rank: number }>;
}

function assignmentPriorityGroups(
  positionDefense: PositionDefenseMap,
  availablePositions: readonly string[],
): AssignmentPriorityGroup[] {
  const available = new Set(availablePositions);
  const byStat = new Map<string, Array<{ position: string; rank: number }>>();
  for (const [position, entry] of Object.entries(positionDefense)) {
    const priority = entry.assignment_priority;
    if (!priority || !available.has(position)) continue;
    const group = byStat.get(priority.stat) ?? [];
    group.push({ position, rank: priority.rank });
    byStat.set(priority.stat, group);
  }
  return [...byStat.entries()].flatMap(([stat, entries]) => {
    if (entries.length < 2) return [];
    return [{
      stat,
      positions: entries.sort((a, b) => b.rank - a.rank),
    }];
  });
}

/** Exact small bipartite optimizer; at roster sizes this explores at most 8 * 2^13 states. */
function solveOptimalAssignment(scores: number[][]): AssignmentSolution {
  const playerCount = scores.length;
  const positionCount = scores[0]?.length ?? 0;
  if (playerCount === 0 || positionCount === 0) return { score: 0, pairs: [] };

  if (playerCount >= positionCount) {
    const memo = new Map<string, AssignmentSolution>();
    const solve = (positionIndex: number, usedPlayers: number): AssignmentSolution => {
      if (positionIndex === positionCount) return { score: 0, pairs: [] };
      const key = `${positionIndex}:${usedPlayers}`;
      const cached = memo.get(key);
      if (cached) return cached;
      let best: AssignmentSolution = { score: Number.NEGATIVE_INFINITY, pairs: [] };
      for (let playerIndex = 0; playerIndex < playerCount; playerIndex += 1) {
        if ((usedPlayers & (1 << playerIndex)) !== 0) continue;
        const rest = solve(positionIndex + 1, usedPlayers | (1 << playerIndex));
        const candidateScore = scores[playerIndex][positionIndex] + rest.score;
        if (candidateScore > best.score) {
          best = {
            score: candidateScore,
            pairs: [{ playerIndex, positionIndex }, ...rest.pairs],
          };
        }
      }
      memo.set(key, best);
      return best;
    };
    return solve(0, 0);
  }

  const memo = new Map<string, AssignmentSolution>();
  const solve = (playerIndex: number, usedPositions: number): AssignmentSolution => {
    if (playerIndex === playerCount) return { score: 0, pairs: [] };
    const key = `${playerIndex}:${usedPositions}`;
    const cached = memo.get(key);
    if (cached) return cached;
    let best: AssignmentSolution = { score: Number.NEGATIVE_INFINITY, pairs: [] };
    for (let positionIndex = 0; positionIndex < positionCount; positionIndex += 1) {
      if ((usedPositions & (1 << positionIndex)) !== 0) continue;
      const rest = solve(playerIndex + 1, usedPositions | (1 << positionIndex));
      const candidateScore = scores[playerIndex][positionIndex] + rest.score;
      if (candidateScore > best.score) {
        best = {
          score: candidateScore,
          pairs: [{ playerIndex, positionIndex }, ...rest.pairs],
        };
      }
    }
    memo.set(key, best);
    return best;
  };
  return solve(0, 0);
}

/** Exact assignment search with data-defined ordinal placement constraints. */
function solvePriorityConstrainedAssignment(
  scores: number[][],
  players: PreseasonPlayerData[],
  positions: string[],
  priorityGroups: AssignmentPriorityGroup[],
): AssignmentSolution {
  if (priorityGroups.length === 0 || players.length < positions.length) {
    return solveOptimalAssignment(scores);
  }

  let best: AssignmentSolution = { score: Number.NEGATIVE_INFINITY, pairs: [] };
  const pairs: AssignmentPair[] = [];

  const respectsPriorities = (): boolean => {
    const playerIndexByPosition = new Map(
      pairs.map((pair) => [positions[pair.positionIndex], pair.playerIndex]),
    );
    return priorityGroups.every((group) => {
      for (const higher of group.positions) {
        for (const lower of group.positions) {
          if (higher.rank <= lower.rank) continue;
          const higherPlayer = playerIndexByPosition.get(higher.position);
          const lowerPlayer = playerIndexByPosition.get(lower.position);
          if (higherPlayer == null || lowerPlayer == null) continue;
          const higherValue = Number(players[higherPlayer].stats[group.stat] ?? 0);
          const lowerValue = Number(players[lowerPlayer].stats[group.stat] ?? 0);
          if (higherValue < lowerValue) return false;
        }
      }
      return true;
    });
  };

  const visit = (positionIndex: number, usedPlayers: number, score: number) => {
    if (positionIndex === positions.length) {
      if (score > best.score && respectsPriorities()) {
        best = { score, pairs: [...pairs] };
      }
      return;
    }
    for (let playerIndex = 0; playerIndex < players.length; playerIndex += 1) {
      if ((usedPlayers & (1 << playerIndex)) !== 0) continue;
      pairs.push({ playerIndex, positionIndex });
      visit(
        positionIndex + 1,
        usedPlayers | (1 << playerIndex),
        score + scores[playerIndex][positionIndex],
      );
      pairs.pop();
    }
  };

  visit(0, 0, 0);
  return Number.isFinite(best.score) ? best : solveOptimalAssignment(scores);
}

function keyStatsForPosition(
  player: PreseasonPlayerData,
  position: string,
  positionDefense: PositionDefenseMap,
): PositionFitStat[] {
  const priority = positionDefense[position]?.assignment_priority;
  const highestPriorityRank = priority
    ? Math.max(...Object.values(positionDefense)
      .filter((entry) => entry.assignment_priority?.stat === priority.stat)
      .map((entry) => entry.assignment_priority?.rank ?? Number.NEGATIVE_INFINITY))
    : Number.NEGATIVE_INFINITY;
  const preferredTieStat = priority?.rank === highestPriorityRank ? priority.stat : null;
  return Object.entries(positionDefense[position]?.stat_weights ?? {})
    .sort(([aStat, aWeight], [bStat, bWeight]) =>
      bWeight - aWeight ||
      Number(bStat === preferredTieStat) - Number(aStat === preferredTieStat) ||
      aStat.localeCompare(bStat),
    )
    .slice(0, 2)
    .map(([stat, weight]) => ({
      stat,
      value: Number(player.stats[stat] ?? 0),
      weight,
    }));
}

function positionOptionsFor(
  player: PreseasonPlayerData,
  positionDefense: PositionDefenseMap,
): PositionFitOption[] {
  return FIELDING_POSITIONS
    .map((position) => ({
      position,
      fitScore: computePositionFitScore({ ...player, position }, "batter", positionDefense) ?? 0,
      keyStats: keyStatsForPosition(player, position, positionDefense),
    }))
    .sort((a, b) =>
      b.fitScore - a.fitScore ||
      FIELDING_POSITIONS.indexOf(a.position as typeof FIELDING_POSITIONS[number]) -
        FIELDING_POSITIONS.indexOf(b.position as typeof FIELDING_POSITIONS[number]),
    );
}

export function recommendPositions(
  players: PreseasonPlayerData[],
  positionDefense: PositionDefenseMap,
  battingOrderIds?: readonly string[],
  positionLocks: Readonly<Partial<Record<string, string>>> = {},
): PositionAssignmentRec {
  const fitModel = positionDefense;
  const pitchers = players.filter((player) => getPlayerRole(player.position) === "pitcher");
  const batters = players
    .filter((player) => getPlayerRole(player.position) === "batter")
    .sort((a, b) => a.mmolbPlayerId.localeCompare(b.mmolbPlayerId));

  const recommendedIds = battingOrderIds ?? recommendBattingOrder(batters).lineup.map((entry) => entry.player.mmolbPlayerId);
  const batterById = new Map(batters.map((player) => [player.mmolbPlayerId, player]));
  const preferredStarters = [...new Set(recommendedIds)]
    .map((id) => batterById.get(id))
    .filter((player): player is PreseasonPlayerData => player != null);
  const preferredIds = new Set(preferredStarters.map((player) => player.mmolbPlayerId));
  const fallbackStarters = sortBatters(
    batters.filter((player) => !preferredIds.has(player.mmolbPlayerId)),
    "OPS",
  );
  const starterCount = Math.min(9, batters.length);
  const startingBatters = [...preferredStarters, ...fallbackStarters].slice(0, starterCount);
  const startingIds = new Set(startingBatters.map((player) => player.mmolbPlayerId));
  const battingOrderLocked = starterCount === 9 && preferredStarters.slice(0, 9).length === 9;
  const starterById = new Map(startingBatters.map((player) => [player.mmolbPlayerId, player]));
  const fitPlayerById = new Map(batters.map((player) => [
    player.mmolbPlayerId,
    itemAdjustedPlayer(player),
  ]));
  const fitPlayer = (player: PreseasonPlayerData) => fitPlayerById.get(player.mmolbPlayerId) ?? player;
  const lockedPlayerIds = new Set<string>();
  const makeAssignment = (
    player: PreseasonPlayerData,
    assignedPosition: string,
    isLocked: boolean,
  ): PositionAssignment => {
    const adjustedPlayer = fitPlayer(player);
    const personalBestPosition = findBestFitPosition(adjustedPlayer, fitModel);
    return {
      player,
      assignedPosition,
      personalBestPosition,
      fitScore: computePositionFitScore({ ...adjustedPlayer, position: assignedPosition }, "batter", fitModel) ?? 0,
      isPersonalBest: assignedPosition === personalBestPosition,
      isLocked,
      keyStats: keyStatsForPosition(adjustedPlayer, assignedPosition, fitModel),
      positionOptions: positionOptionsFor(adjustedPlayer, fitModel),
    };
  };
  const lockedAssignments = FIELDING_POSITIONS.flatMap((position): PositionAssignment[] => {
    const playerId = positionLocks[position];
    const player = playerId ? starterById.get(playerId) : null;
    if (!player || lockedPlayerIds.has(player.mmolbPlayerId)) return [];
    lockedPlayerIds.add(player.mmolbPlayerId);
    return [makeAssignment(player, position, true)];
  });
  const lockedPositions = new Set(lockedAssignments.map((assignment) => assignment.assignedPosition));
  const remainingPositions = FIELDING_POSITIONS.filter((position) => !lockedPositions.has(position));
  const remainingPlayers = startingBatters.filter((player) => !lockedPlayerIds.has(player.mmolbPlayerId));
  const scoreMatrix = remainingPlayers.map((player) =>
    remainingPositions.map((position) =>
      computePositionFitScore({ ...fitPlayer(player), position }, "batter", fitModel) ?? 0,
    ),
  );
  const adjustedRemainingPlayers = remainingPlayers.map((player) => fitPlayer(player));
  const solution = solvePriorityConstrainedAssignment(
    scoreMatrix,
    adjustedRemainingPlayers,
    remainingPositions,
    assignmentPriorityGroups(fitModel, remainingPositions),
  );
  const optimizedAssignments = solution.pairs
    .map(({ playerIndex, positionIndex }): PositionAssignment => {
      const player = remainingPlayers[playerIndex];
      const assignedPosition = remainingPositions[positionIndex];
      return makeAssignment(player, assignedPosition, false);
    });
  const fielders = [...lockedAssignments, ...optimizedAssignments]
    .sort((a, b) =>
      FIELDING_POSITIONS.indexOf(a.assignedPosition as typeof FIELDING_POSITIONS[number]) -
      FIELDING_POSITIONS.indexOf(b.assignedPosition as typeof FIELDING_POSITIONS[number]),
    );
  const fieldedIds = new Set(fielders.map((assignment) => assignment.player.mmolbPlayerId));
  const designatedHitter = startingBatters.find((player) => !fieldedIds.has(player.mmolbPlayerId)) ?? null;
  const benchBatters = batters.filter((player) => !startingIds.has(player.mmolbPlayerId));
  const asSpillover = (player: PreseasonPlayerData, assignedPosition: "DH" | "Bench"): PositionAssignment => ({
    player,
    assignedPosition,
    personalBestPosition: findBestFitPosition(fitPlayer(player), fitModel),
    fitScore: null,
    isPersonalBest: false,
    isLocked: false,
    keyStats: [],
    positionOptions: positionOptionsFor(fitPlayer(player), fitModel).slice(0, 3),
  });

  const assignmentByPosition = new Map(fielders.map((assignment) => [assignment.assignedPosition, assignment]));
  const alternatives = FIELDING_POSITIONS.flatMap((position): PositionAlternative[] => {
    const assignedId = assignmentByPosition.get(position)?.player.mmolbPlayerId;
    const alternate = batters
      .filter((player) => player.mmolbPlayerId !== assignedId)
      .map((player) => ({
        player,
        fitScore: computePositionFitScore({ ...fitPlayer(player), position }, "batter", fitModel) ?? 0,
      }))
      .sort((a, b) => b.fitScore - a.fitScore || tieBreakByAttribute(a.player, b.player, "batter"))[0];
    if (!alternate) return [];
    return [{
      position,
      player: alternate.player,
      fitScore: alternate.fitScore,
      keyStats: keyStatsForPosition(fitPlayer(alternate.player), position, fitModel),
      isStarter: startingIds.has(alternate.player.mmolbPlayerId),
    }];
  });

  return {
    fielders,
    designatedHitter: designatedHitter ? asSpillover(designatedHitter, "DH") : null,
    bench: benchBatters.map((player) => asSpillover(player, "Bench")),
    pitchers,
    alternatives,
    startingBatterIds: startingBatters.map((player) => player.mmolbPlayerId),
    battingOrderLocked,
    totalFit: fielders.reduce((sum, assignment) => sum + (assignment.fitScore ?? 0), 0),
  };
}
