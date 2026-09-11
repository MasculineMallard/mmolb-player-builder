import { PRESEASON_STATUS, PITCHER_POSITIONS } from "./constants";
import { buildBaseStatMap } from "./mmolb-transform";
import type { MmolbApiPlayer, MmolbApiPlayerRecord } from "./mmolb-api";
import type { PlayerData, RosterPlayer } from "./types";

export interface PreseasonBattingStats {
  PA: number;
  AB: number;
  H: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  walks: number;
  hitByPitch: number;
  sacrificeFlies: number;
  totalBases: number;
  OBP: number | null;
  SLG: number | null;
  OPS: number | null;
}

export interface PreseasonPitchingStats {
  outs: number;
  IP: number;
  earnedRuns: number;
  hitsAllowed: number;
  walks: number;
  strikeouts: number;
  ERA: number | null;
  WHIP: number | null;
  K9: number | null;
}

export interface PreseasonSampleSize {
  PA: number;
  outs: number;
}

/** Pinned P1 -> P2 data contract. Game stats are Offseason-only. */
export interface PreseasonPlayerData extends PlayerData {
  isBench: boolean;
  preseasonBatting: PreseasonBattingStats | null;
  preseasonPitching: PreseasonPitchingStats | null;
  sampleSize: PreseasonSampleSize;
  /** Visible, per-player upstream failures; an empty array means a complete row. */
  dataWarnings: string[];
}

type RawStats = Record<string, number>;

/**
 * Select exactly the first current-season Offseason entry.
 * Both keys are required: status-only selection can silently reuse stale data.
 */
export function extractPreseasonStats(
  records: MmolbApiPlayerRecord[],
  currentSeasonId: string,
): Record<string, RawStats> | null;
export function extractPreseasonStats(
  records: MmolbApiPlayerRecord[],
  currentSeasonId: string,
  teamId: string,
): RawStats | null;
export function extractPreseasonStats(
  records: MmolbApiPlayerRecord[],
  currentSeasonId: string,
  teamId?: string,
): Record<string, RawStats> | RawStats | null {
  const match = records.find(
    (record) =>
      record.SeasonStatus === PRESEASON_STATUS &&
      record.SeasonID === currentSeasonId,
  );
  if (!match) return null;
  return teamId == null ? match.Stats : match.Stats[teamId] ?? null;
}

function stat(stats: RawStats, key: string): number {
  const value = stats[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Missing keys in an existing MMOLB stat block mean zero; no block means no sample. */
export function computePreseasonBatting(
  stats: RawStats | null | undefined,
): PreseasonBattingStats | null {
  if (!stats) return null;

  const PA = stat(stats, "plate_appearances");
  const AB = stat(stats, "at_bats");
  const singles = stat(stats, "singles");
  const doubles = stat(stats, "doubles");
  const triples = stat(stats, "triples");
  const homeRuns = stat(stats, "home_runs");
  const walks = stat(stats, "walked");
  const hitByPitch = stat(stats, "hit_by_pitch");
  const sacrificeFlies = stat(stats, "sac_flies");
  const H = singles + doubles + triples + homeRuns;
  const totalBases = singles + (2 * doubles) + (3 * triples) + (4 * homeRuns);
  const obpDenominator = AB + walks + hitByPitch + sacrificeFlies;
  const OBP = obpDenominator > 0
    ? (H + walks + hitByPitch) / obpDenominator
    : null;
  const SLG = AB > 0 ? totalBases / AB : null;

  return {
    PA,
    AB,
    H,
    singles,
    doubles,
    triples,
    homeRuns,
    walks,
    hitByPitch,
    sacrificeFlies,
    totalBases,
    OBP,
    SLG,
    OPS: OBP != null && SLG != null ? OBP + SLG : null,
  };
}

/** IP is always derived from outs; MMOLB does not use baseball's .1/.2 display notation here. */
export function computePreseasonPitching(
  stats: RawStats | null | undefined,
): PreseasonPitchingStats | null {
  if (!stats) return null;

  const outs = stat(stats, "outs");
  const earnedRuns = stat(stats, "earned_runs");
  const hitsAllowed = stat(stats, "hits_allowed");
  const walks = stat(stats, "walks");
  const strikeouts = stat(stats, "strikeouts");
  const IP = outs / 3;

  return {
    outs,
    IP,
    earnedRuns,
    hitsAllowed,
    walks,
    strikeouts,
    ERA: IP > 0 ? (9 * earnedRuns) / IP : null,
    WHIP: IP > 0 ? (walks + hitsAllowed) / IP : null,
    K9: IP > 0 ? (9 * strikeouts) / IP : null,
  };
}

function playerRole(position: string | null): "batter" | "pitcher" {
  const basePosition = position?.replace(/\d+$/, "") ?? "";
  return PITCHER_POSITIONS.has(basePosition) ? "pitcher" : "batter";
}

/**
 * Combine roster identity, live base attributes, and the selected Offseason block.
 * This deliberately never reads raw.Stats or PlayerData.gameStats for game production.
 */
export function buildPreseasonPlayerData(
  rosterPlayer: RosterPlayer,
  raw: MmolbApiPlayer | null,
  records: MmolbApiPlayerRecord[] | null,
  currentSeasonId: string,
  teamId: string,
  dataWarnings: string[] = [],
): PreseasonPlayerData {
  const position = raw?.Position ?? rosterPlayer.position ?? null;
  const role = playerRole(position);
  const selected = records
    ? extractPreseasonStats(records, currentSeasonId, teamId)
    : null;
  const preseasonBatting = role === "batter"
    ? computePreseasonBatting(selected)
    : null;
  const preseasonPitching = role === "pitcher"
    ? computePreseasonPitching(selected)
    : null;
  const lesserBoons = (raw?.LesserBoon ?? raw?.LesserBoons ?? []).map((boon) => boon.Name);
  const greaterBoons = (raw?.GreaterBoon ?? raw?.GreaterBoons ?? []).map((boon) => boon.Name);
  const pitches = (raw?.PitchTypes ?? []).map((name, index) => ({
    name: name.toLowerCase(),
    frequency: raw?.PitchSelection?.[index] ?? 0,
  })).sort((a, b) => b.frequency - a.frequency);

  return {
    name: raw ? `${raw.FirstName} ${raw.LastName}` : rosterPlayer.name,
    firstName: raw?.FirstName ?? rosterPlayer.firstName,
    lastName: raw?.LastName ?? rosterPlayer.lastName,
    level: raw?.Level ?? rosterPlayer.level,
    teamName: null,
    teamEmoji: null,
    position,
    durability: Math.min(Math.max(Math.round(raw?.LesserDurability ?? 5), 0), 5),
    stats: raw ? buildBaseStatMap(raw) : {},
    lesserBoons,
    greaterBoons,
    mmolbPlayerId: raw?._id ?? rosterPlayer.mmolbPlayerId,
    pitches,
    isBench: rosterPlayer.isBench,
    preseasonBatting,
    preseasonPitching,
    sampleSize: {
      PA: preseasonBatting?.PA ?? 0,
      outs: preseasonPitching?.outs ?? 0,
    },
    dataWarnings,
  };
}
