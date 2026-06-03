import pool from "./db";
import { asString, asStringOrNull, asNumber, buildSearchParams } from "./query-utils";
import type {
  PlayerSearchResult,
  TeamSearchResult,
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

  // Primary: fast query via team_player_versions (indexed)
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

  // Fallback: if no results, search player_versions directly (slower but
  // catches players missing from team_player_versions, e.g. new bench players)
  if (rows.length === 0) {
    const pvWhereClause = whereClause.replace(/tpv\./g, "pv.");
    const { rows: pvRows } = await timedQuery("searchPlayers-fallback", () =>
      pool.query(
        `SELECT
           pv.mmolb_player_id,
           pv.first_name,
           pv.last_name,
           pv.level,
           tv.name as team_name,
           tv.emoji as team_emoji
         FROM data.player_versions pv
         LEFT JOIN data.team_versions tv ON pv.mmolb_team_id = tv.mmolb_team_id
           AND tv.valid_until IS NULL
         WHERE pv.valid_until IS NULL
           AND (${pvWhereClause})
         ORDER BY pv.level DESC
         LIMIT ${limitParam}`,
        params
      )
    );
    return pvRows.map((row: Record<string, unknown>) => ({
      mmolbPlayerId: asString(row.mmolb_player_id),
      firstName: asString(row.first_name),
      lastName: asString(row.last_name),
      name: `${asString(row.first_name)} ${asString(row.last_name)}`,
      level: asNumber(row.level, 1),
      teamName: asStringOrNull(row.team_name),
      teamEmoji: asStringOrNull(row.team_emoji),
    }));
  }

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
