import pool from "./db";
import { POSITION_ORDER } from "./constants";
import { slotToPosition } from "./utils";
import { asString, asStringOrNull, asNumber, DB_STAT_SCALE, buildSearchParams } from "./query-utils";
import { NoStatsError } from "./errors";
import type {
  PlayerData,
  PlayerSearchResult,
  TeamSearchResult,
  RosterPlayer,
  PitchData,
} from "./types";

async function timedQuery<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const ms = performance.now() - start;
    if (process.env.NODE_ENV !== "production" || ms > 500) {
      console.log(`[query] ${label} ${ms.toFixed(1)}ms`);
    }
    return result;
  } catch (err) {
    const ms = (performance.now() - start).toFixed(1);
    const code = (err as { code?: string }).code;
    const errType = code === "57014" ? "timeout" : code === "08006" ? "connection" : "error";
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[query] ${label} FAILED (${errType}) ${ms}ms: ${msg}`);
    throw err;
  }
}

export async function searchPlayers(
  nameQuery: string,
  limit = 10
): Promise<PlayerSearchResult[]> {
  const { whereClause, params, limitParam } = buildSearchParams(nameQuery, limit);

  const { rows } = await timedQuery("searchPlayers", () =>
    pool.query(
      `SELECT
         tpv.mmolb_player_id,
         tpv.first_name,
         tpv.last_name,
         pv.level,
         tv.name as team_name,
         tv.emoji as team_emoji
       FROM data.team_player_versions tpv
       JOIN data.player_versions pv ON tpv.mmolb_player_id = pv.mmolb_player_id
         AND pv.valid_until IS NULL
       JOIN data.team_versions tv ON tpv.mmolb_team_id = tv.mmolb_team_id
         AND tv.valid_until IS NULL
       WHERE tpv.valid_until IS NULL
         AND (${whereClause})
       ORDER BY pv.level DESC
       LIMIT ${limitParam}`,
      params
    )
  );

  return rows.map((row: Record<string, unknown>) => ({
    mmolbPlayerId: asString(row.mmolb_player_id),
    firstName: asString(row.first_name),
    lastName: asString(row.last_name),
    name: `${asString(row.first_name)} ${asString(row.last_name)}`,
    level: asNumber(row.level, 1),
    teamName: asStringOrNull(row.team_name),
    teamEmoji: asStringOrNull(row.team_emoji),
  }));
}

function parsePlayerRows(
  rows: Record<string, unknown>[],
  mmolbPlayerId: string
): PlayerData | null {
  let firstName: string | null = null;
  let lastName: string | null = null;
  let level = 1;
  let durabilityRaw = 1.0;
  let teamName: string | null = null;
  let teamEmoji: string | null = null;
  let positionSlot: string | null = null;
  const stats: Record<string, number> = {};
  const lesserBoons: string[] = [];
  const greaterBoons: string[] = [];
  const pitches: PitchData[] = [];

  for (const row of rows) {
    switch (row.data_type) {
      case "info":
        firstName = asStringOrNull(row.col1);
        lastName = asStringOrNull(row.col2);
        level = asNumber(row.col3, 1);
        teamName = asStringOrNull(row.col4);
        teamEmoji = asStringOrNull(row.col5);
        positionSlot = asStringOrNull(row.col6);
        durabilityRaw = asNumber(row.col7, 1.0);
        break;
      case "stat": {
        const attrName = asString(row.col1).trim().toLowerCase();
        if (!attrName) break;
        const baseTotal = asNumber(row.col2, 0);
        stats[attrName] = Math.min(Math.round(baseTotal * DB_STAT_SCALE), 1000);
        break;
      }
      case "boon": {
        const modType = asNumber(row.col2, 0);
        const boonName = asString(row.col1);
        if (modType === 2) greaterBoons.push(boonName);
        else if (modType === 1) lesserBoons.push(boonName);
        break;
      }
      case "pitch": {
        const frequency = asNumber(row.col2, 0);
        pitches.push({ name: asString(row.col1), frequency });
        break;
      }
      default:
        console.warn(`[query] getPlayerFull: unknown row type "${row.data_type}"`);
    }
  }

  if (!firstName || !lastName) {
    console.warn(`[query] getPlayerFull: no info row for player ${mmolbPlayerId}`);
    return null;
  }

  pitches.sort((a, b) => b.frequency - a.frequency);

  if (Object.keys(stats).length === 0) {
    console.warn(`[query] getPlayerFull: player ${mmolbPlayerId} exists but has no stats`);
    throw new NoStatsError(mmolbPlayerId);
  }

  return {
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
    level,
    teamName,
    teamEmoji,
    position: slotToPosition(positionSlot),
    durability: Math.round(durabilityRaw * 5),
    stats,
    lesserBoons,
    greaterBoons,
    mmolbPlayerId,
    pitches,
  };
}

// Simple in-process cache for player data (5 min TTL, max 100 entries)
const playerCache = new Map<string, { data: PlayerData | null; expires: number }>();
const PLAYER_CACHE_TTL = 5 * 60 * 1000;
const PLAYER_CACHE_MAX = 100;

export async function getPlayerFull(
  mmolbPlayerId: string
): Promise<PlayerData | null> {
  const cached = playerCache.get(mmolbPlayerId);
  if (cached && cached.expires > Date.now()) return cached.data;
  const { rows } = await timedQuery("getPlayerFull", () =>
    pool.query(
      `WITH player_info AS (
         SELECT
           pv.first_name,
           pv.last_name,
           pv.level,
           pv.durability,
           t.name as team_name,
           t.emoji as team_emoji,
           s.name as position_slot
         FROM data.player_versions pv
         LEFT JOIN data.team_versions t ON pv.mmolb_team_id = t.mmolb_team_id
           AND t.valid_until IS NULL
         LEFT JOIN taxa.slot s ON pv.slot = s.id
         WHERE pv.mmolb_player_id = $1
           AND pv.valid_until IS NULL
         ORDER BY pv.valid_from DESC
         LIMIT 1
       ),
       player_stats AS (
         SELECT
           a.name as attr_name,
           prav.base_total
         FROM data.player_report_attribute_versions prav
         JOIN taxa.attribute a ON prav.attribute = a.id
         WHERE prav.mmolb_player_id = $1
           AND prav.valid_until IS NULL
       ),
       player_boons AS (
         SELECT
           m.name as boon_name,
           pmv.modification_type
         FROM data.player_modification_versions pmv
         JOIN data.modifications m ON pmv.modification_id = m.id
         WHERE pmv.mmolb_player_id = $1
           AND pmv.valid_until IS NULL
         ORDER BY pmv.valid_from
       ),
       player_pitches AS (
         SELECT
           pt.name as pitch_name,
           pptv.frequency
         FROM data.player_pitch_type_versions pptv
         JOIN taxa.pitch_type pt ON pptv.pitch_type = pt.id
         WHERE pptv.mmolb_player_id = $1
           AND pptv.valid_until IS NULL
       )
       SELECT 'info' as data_type, pi.first_name as col1, pi.last_name as col2,
              pi.level::text as col3, pi.team_name as col4, pi.team_emoji as col5,
              pi.position_slot as col6, pi.durability::text as col7
       FROM player_info pi
       UNION ALL
       SELECT 'stat', ps.attr_name, ps.base_total::text, NULL, NULL, NULL, NULL, NULL
       FROM player_stats ps
       UNION ALL
       SELECT 'boon', pb.boon_name, pb.modification_type::text, NULL, NULL, NULL, NULL, NULL
       FROM player_boons pb
       UNION ALL
       SELECT 'pitch', pp.pitch_name, pp.frequency::text, NULL, NULL, NULL, NULL, NULL
       FROM player_pitches pp`,
      [mmolbPlayerId]
    )
  );

  let player: PlayerData | null;
  try {
    player = parsePlayerRows(rows, mmolbPlayerId);
  } catch (e) {
    if (e instanceof NoStatsError) {
      // Cache the null result so we don't re-query players with no stats
      if (playerCache.size >= PLAYER_CACHE_MAX) {
        const oldest = playerCache.keys().next().value;
        if (oldest !== undefined) playerCache.delete(oldest);
      }
      playerCache.set(mmolbPlayerId, { data: null, expires: Date.now() + PLAYER_CACHE_TTL });
    }
    throw e;
  }
  if (playerCache.size >= PLAYER_CACHE_MAX) {
    const oldest = playerCache.keys().next().value;
    if (oldest !== undefined) playerCache.delete(oldest);
  }
  playerCache.set(mmolbPlayerId, { data: player, expires: Date.now() + PLAYER_CACHE_TTL });
  return player;
}

export async function searchTeams(
  query: string,
  limit = 20
): Promise<TeamSearchResult[]> {
  const pattern = `${query.trim().toLowerCase()}%`;
  const { rows } = await timedQuery("searchTeams", () =>
    pool.query(
      `SELECT DISTINCT
         tv.mmolb_team_id,
         tv.name,
         tv.emoji,
         tv.location
       FROM data.team_versions tv
       WHERE tv.valid_until IS NULL
         AND (tv.name ILIKE $1 OR tv.location ILIKE $1)
       ORDER BY tv.name
       LIMIT $2`,
      [pattern, limit]
    )
  );

  return rows.map((row: Record<string, unknown>) => ({
    mmolbTeamId: asString(row.mmolb_team_id),
    name: asString(row.name),
    emoji: asStringOrNull(row.emoji),
    location: asStringOrNull(row.location),
  }));
}

/** Lightweight roster: just player IDs and names via team_player_versions (indexed, fast). */
export async function getTeamRosterLight(
  mmolbTeamId: string
): Promise<{ mmolbPlayerId: string; firstName: string; lastName: string; level: number }[]> {
  const { rows } = await timedQuery("getTeamRosterLight", () =>
    pool.query(
      `SELECT
         tpv.mmolb_player_id,
         tpv.first_name,
         tpv.last_name,
         pv.level
       FROM data.team_player_versions tpv
       JOIN data.player_versions pv
         ON tpv.mmolb_player_id = pv.mmolb_player_id
         AND pv.valid_until IS NULL
       WHERE tpv.mmolb_team_id = $1
         AND tpv.valid_until IS NULL
       ORDER BY pv.level DESC
       LIMIT 50`,
      [mmolbTeamId]
    )
  );

  return rows.map((row: Record<string, unknown>) => ({
    mmolbPlayerId: asString(row.mmolb_player_id),
    firstName: asString(row.first_name),
    lastName: asString(row.last_name),
    level: asNumber(row.level, 1),
  }));
}

export async function getTeamRoster(
  mmolbTeamId: string
): Promise<RosterPlayer[]> {
  const { rows } = await timedQuery("getTeamRoster", () =>
    pool.query(
      `SELECT
         pv.mmolb_player_id,
         pv.first_name,
         pv.last_name,
         pv.level,
         COALESCE(ts.name, s.name) as slot_name,
         CASE WHEN tpv.mmolb_player_id IS NOT NULL THEN false ELSE true END as is_bench
       FROM data.player_versions pv
       LEFT JOIN data.team_player_versions tpv
         ON pv.mmolb_player_id = tpv.mmolb_player_id
         AND tpv.mmolb_team_id = $1
         AND tpv.valid_until IS NULL
       LEFT JOIN taxa.slot ts ON tpv.slot = ts.id
       LEFT JOIN taxa.slot s ON pv.slot = s.id
       WHERE pv.valid_until IS NULL
         AND pv.mmolb_team_id = $1
         AND pv.level IS NOT NULL
       LIMIT 50`,
      [mmolbTeamId]
    )
  );

  const roster: RosterPlayer[] = rows.map((row: Record<string, unknown>) => ({
    mmolbPlayerId: asString(row.mmolb_player_id),
    firstName: asString(row.first_name),
    lastName: asString(row.last_name),
    name: `${asString(row.first_name)} ${asString(row.last_name)}`,
    level: asNumber(row.level, 1),
    slot: asStringOrNull(row.slot_name),
    position: slotToPosition(asStringOrNull(row.slot_name)) ?? "",
    isBench: row.is_bench === true,
  }));

  roster.sort((a, b) => {
    if (a.isBench !== b.isBench) return a.isBench ? 1 : -1;
    const posA = POSITION_ORDER[a.position] ?? 50;
    const posB = POSITION_ORDER[b.position] ?? 50;
    if (posA !== posB) return posA - posB;
    return b.level - a.level;
  });

  return roster;
}
