/**
 * Transform MMOLB API responses into existing app types.
 *
 * Pure functions, no side effects. Stat computation matches the game UI's
 * "base stats" view (Equipment OFF, Boons OFF):
 *   BaseAttributeBonuses + ScheduledLevelUps + AugmentHistory
 *
 * Verified against Mariana Bach (level 25) screenshot comparison:
 *   Intimidation=350, Cunning=299, Acrobatics=252, Contact=50 (augment).
 */

import { POSITION_ORDER } from "./constants";
import type { PlayerData, PitchData, RosterPlayer } from "./types";
import type { GameStats } from "./evaluator-types";
import type {
  MmolbApiPlayer,
  MmolbApiPlayerRecord,
  MmolbApiTeam,
  MmolbApiTeamPlayer,
} from "./mmolb-api";

const STAT_SCALE = 100; // matches DB_STAT_SCALE in query-utils.ts

/**
 * Build a stat map from the three API attribute sources.
 * BaseAttributeBonuses: base generation + applied level-ups (including defense bonuses)
 * ScheduledLevelUps: chosen but not yet applied level-ups
 * AugmentHistory: augment attribute changes
 */
function buildStatMap(raw: MmolbApiPlayer): Record<string, number> {
  const sums = new Map<string, number>();

  const add = (attr: string, amount: number) => {
    const key = attr.toLowerCase();
    sums.set(key, (sums.get(key) ?? 0) + amount);
  };

  for (const b of raw.BaseAttributeBonuses ?? []) {
    add(b.attribute, b.amount);
  }

  for (const s of raw.ScheduledLevelUps ?? []) {
    // Exclude boon choices (levels 10/20/30) -- they don't add to base stats
    if (s.choice?.type === "boon") continue;
    if (s.choice?.attribute != null && s.choice?.amount != null) {
      add(s.choice.attribute, s.choice.amount);
    }
  }

  for (const a of raw.AugmentHistory ?? []) {
    if (a.attribute != null && a.amount != null) {
      add(a.attribute, a.amount);
    }
  }

  const stats: Record<string, number> = {};
  for (const [key, total] of sums) {
    stats[key] = Math.min(Math.round(total * STAT_SCALE), 1000);
  }
  return stats;
}

/** Convert API LesserDurability to 0-5 pip scale. Verified: API returns 0-5 directly. */
function normalizeDurability(value: number | undefined): number {
  const d = value ?? 5;
  if (d > 5) {
    console.warn(`[mmolb-transform] Unexpected LesserDurability ${d} (expected 0-5). Clamping.`);
  }
  return Math.min(Math.max(Math.round(d), 0), 5);
}

/**
 * Filter out playerrecord entries that belong to a previous incarnation.
 *
 * Between-season Recomps: any record from a season before Birthseason
 * belongs to a previous incarnation and should be excluded.
 *
 * Mid-season Recomps (Birthday > 1): the Birthseason record itself has
 * merged stats from both incarnations. We can't split those, so we keep
 * the record but flag the player as recomped via wasRecompedThisSeason.
 */
function filterPreRecompRecords(
  raw: MmolbApiPlayer,
  records: MmolbApiPlayerRecord[],
): MmolbApiPlayerRecord[] {
  if (raw.Birthseason == null || records.length === 0) return records;
  return records.filter((r) => r.Season >= raw.Birthseason!);
}

/**
 * Check if a player was recomposed mid-season.
 * Recomped players have Birthseason = current season AND Birthday > 1 (not there from the start).
 * Their season stats are from a different build and shouldn't be used.
 */
function wasRecompedThisSeason(
  raw: MmolbApiPlayer,
  playerRecords?: MmolbApiPlayerRecord[],
  currentSeasonId?: string,
): boolean {
  if (raw.Birthseason == null || raw.Birthday == null) return false;
  if (!currentSeasonId || !playerRecords?.length) return false;

  // Find the season number for the current SeasonID
  const currentRecord = playerRecords.find(
    (r) => r.SeasonID === currentSeasonId && r.SeasonStatus === "Regular Season"
  );
  if (!currentRecord) return false;

  // If born this season after day 1, they were recomped mid-season
  return raw.Birthseason === currentRecord.Season && raw.Birthday > 1;
}

export function transformPlayer(
  raw: MmolbApiPlayer,
  teamName: string | null,
  teamEmoji: string | null,
  playerRecords?: MmolbApiPlayerRecord[],
  currentSeasonId?: string,
): PlayerData {
  const stats = buildStatMap(raw);

  // Filter out records from previous incarnations (between-season Recomps)
  const filteredRecords = playerRecords
    ? filterPreRecompRecords(raw, playerRecords)
    : undefined;

  const lesserBoons = (raw.LesserBoon ?? raw.LesserBoons ?? []).map(
    (b) => b.Name
  );
  const greaterBoons = (raw.GreaterBoon ?? raw.GreaterBoons ?? []).map(
    (b) => b.Name
  );

  const pitches: PitchData[] = (raw.PitchTypes ?? []).map((type, i) => ({
    name: type.toLowerCase(),
    frequency: raw.PitchSelection?.[i] ?? 0,
  }));
  pitches.sort((a, b) => b.frequency - a.frequency);

  const position = raw.Position ?? null;
  const role = position && ["SP", "RP", "CL", "P"].includes(position.replace(/\d+$/, ""))
    ? "pitcher" as const : "batter" as const;

  // Suppress stats for players recomped mid-season: their season stats
  // are from a different build and don't reflect the current player.
  let gameStats: GameStats | null = null;
  const recompedThisSeason = wasRecompedThisSeason(raw, filteredRecords, currentSeasonId);
  if (!recompedThisSeason) {
    gameStats = extractGameStats(raw.Stats, role, filteredRecords, currentSeasonId);
  }

  return {
    name: `${raw.FirstName} ${raw.LastName}`,
    firstName: raw.FirstName,
    lastName: raw.LastName,
    level: raw.Level,
    teamName,
    teamEmoji,
    position,
    durability: normalizeDurability(raw.LesserDurability),
    stats,
    lesserBoons,
    greaterBoons,
    mmolbPlayerId: raw._id,
    pitches,
    gameStats,
    ...(recompedThisSeason ? { recomped: true } : {}),
  };
}

// ── Game stats extraction ──

interface RawApiStats {
  // Batting
  at_bats?: number;
  plate_appearances?: number;
  singles?: number;
  doubles?: number;
  triples?: number;
  home_runs?: number;
  walked?: number;
  struck_out?: number;
  hit_by_pitch?: number;
  sac_flies?: number;
  stolen_bases?: number;
  caught_stealing?: number;
  // Pitching
  outs?: number;
  earned_runs?: number;
  hits_allowed?: number;
  walks?: number;
  strikeouts?: number;
  home_runs_allowed?: number;
  [key: string]: number | undefined;
}

/**
 * Merge raw stat entries from one or more sources into a single flat object.
 * Each source is a Record<teamId, Record<statName, number>>.
 * Skips _risp entries (RISP splits).
 */
function mergeRawStats(
  ...sources: (Record<string, Record<string, number>> | undefined)[]
): RawApiStats {
  const merged: RawApiStats = {};
  for (const source of sources) {
    if (!source) continue;
    for (const teamStats of Object.values(source)) {
      if (typeof teamStats !== "object") continue;
      for (const [k, v] of Object.entries(teamStats)) {
        if (typeof v === "number" && !k.endsWith("_risp")) {
          (merged as Record<string, number>)[k] =
            ((merged as Record<string, number>)[k] ?? 0) + v;
        }
      }
    }
  }
  return merged;
}

/**
 * Extract derived GameStats from MMOLB API data.
 *
 * Primary source: playerrecord (season history, survives roster moves).
 * Fallback: player.Stats (only populated for active roster players).
 *
 * For the current season, we find the latest Regular Season record
 * from playerrecord and merge stats across all team entries.
 */
export function extractGameStats(
  playerStats: Record<string, Record<string, number>> | undefined,
  role: "batter" | "pitcher",
  playerRecords?: MmolbApiPlayerRecord[],
  currentSeasonId?: string,
): GameStats | null {
  // Find current season Regular Season records from playerrecord
  let recordStats: Record<string, Record<string, number>> | undefined;
  if (playerRecords && playerRecords.length > 0 && currentSeasonId) {
    // Only use records matching the current season
    const currentSeason = playerRecords.find(
      (r) => r.SeasonID === currentSeasonId && r.SeasonStatus === "Regular Season"
    );
    if (currentSeason) {
      recordStats = currentSeason.Stats;
    }
  }

  // Merge: prefer playerrecord, fall back to player.Stats
  const merged = mergeRawStats(recordStats, !recordStats ? playerStats : undefined);

  if (role === "pitcher") {
    // Pitcher stats: outs-based (IP = outs / 3)
    const outs = merged.outs ?? 0;
    if (outs < 3) return null; // need at least 1 IP

    const ip = outs / 3;
    const er = merged.earned_runs ?? 0;
    const ha = merged.hits_allowed ?? 0;
    const bb = merged.walks ?? 0;
    const k = merged.strikeouts ?? 0;
    const hra = merged.home_runs_allowed ?? 0;

    return {
      IP: Math.round(ip * 10) / 10,
      ERA: Math.round((er / ip) * 9 * 100) / 100,
      WHIP: Math.round(((ha + bb) / ip) * 100) / 100,
      K9: Math.round((k / ip) * 9 * 10) / 10,
      BB9: Math.round((bb / ip) * 9 * 10) / 10,
      HR9: Math.round((hra / ip) * 9 * 10) / 10,
    };
  }

  // Batter stats
  const pa = merged.plate_appearances ?? 0;
  const ab = merged.at_bats ?? 0;
  if (pa < 5) return null;

  {
    const hits = (merged.singles ?? 0) + (merged.doubles ?? 0) +
      (merged.triples ?? 0) + (merged.home_runs ?? 0);
    const tb = (merged.singles ?? 0) + 2 * (merged.doubles ?? 0) +
      3 * (merged.triples ?? 0) + 4 * (merged.home_runs ?? 0);
    const hbp = merged.hit_by_pitch ?? 0;
    const bb = merged.walked ?? 0;
    const sf = merged.sac_flies ?? 0;
    const sb = merged.stolen_bases ?? 0;
    const cs = merged.caught_stealing ?? 0;

    const avg = ab > 0 ? hits / ab : 0;
    const obp = (ab + bb + hbp + sf) > 0
      ? (hits + bb + hbp) / (ab + bb + hbp + sf) : 0;
    const slg = ab > 0 ? tb / ab : 0;

    return {
      PA: pa,
      AVG: Math.round(avg * 1000) / 1000,
      OBP: Math.round(obp * 1000) / 1000,
      SLG: Math.round(slg * 1000) / 1000,
      OPS: Math.round((obp + slg) * 1000) / 1000,
      K_PCT: Math.round((merged.struck_out ?? 0) / pa * 1000) / 10,
      BB_PCT: Math.round(bb / pa * 1000) / 10,
      HR: merged.home_runs ?? 0,
      SB: sb,
      SB_PCT: (sb + cs) > 0 ? Math.round(sb / (sb + cs) * 1000) / 1000 : undefined,
    };
  }
}

function mapTeamPlayer(
  p: MmolbApiTeamPlayer,
  isBench: boolean
): RosterPlayer {
  return {
    mmolbPlayerId: p.PlayerID,
    firstName: p.FirstName,
    lastName: p.LastName,
    name: `${p.FirstName} ${p.LastName}`,
    level: p.Level,
    slot: p.SlotLabel ?? p.Slot ?? null,
    position: p.Position ?? "",
    isBench,
  };
}

export function transformTeamRoster(team: MmolbApiTeam): RosterPlayer[] {
  const roster: RosterPlayer[] = [];

  for (const p of team.Players ?? []) {
    roster.push(mapTeamPlayer(p, false));
  }
  for (const p of team.Bench?.Batters ?? []) {
    roster.push(mapTeamPlayer(p, true));
  }
  for (const p of team.Bench?.Pitchers ?? []) {
    roster.push(mapTeamPlayer(p, true));
  }

  roster.sort((a, b) => {
    if (a.isBench !== b.isBench) return a.isBench ? 1 : -1;
    const posA = POSITION_ORDER[a.position] ?? 50;
    const posB = POSITION_ORDER[b.position] ?? 50;
    if (posA !== posB) return posA - posB;
    return b.level - a.level;
  });

  return roster;
}

export function transformTeamRosterLight(
  team: MmolbApiTeam
): { mmolbPlayerId: string; firstName: string; lastName: string; level: number }[] {
  const all: MmolbApiTeamPlayer[] = [
    ...(team.Players ?? []),
    ...(team.Bench?.Batters ?? []),
    ...(team.Bench?.Pitchers ?? []),
  ];

  return all
    .map((p) => ({
      mmolbPlayerId: p.PlayerID,
      firstName: p.FirstName,
      lastName: p.LastName,
      level: p.Level,
    }))
    .sort((a, b) => b.level - a.level);
}
