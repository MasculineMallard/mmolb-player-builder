/**
 * Data orchestrator: MMOLB API first, MMOLDB fallback.
 *
 * Single entry point for player/team data. API routes import from here
 * instead of directly from queries.ts.
 *
 * - Player lookups: API-first, DB-fallback
 * - Team rosters: API-first, DB-fallback
 * - Search: DB-only (no MMOLB API search endpoint)
 */

import {
  fetchPlayer,
  fetchPlayerRecord,
  fetchState,
  fetchTeam,
  MmolbApiNotFoundError,
} from "./mmolb-api";
import {
  transformPlayer,
  transformTeamRoster,
  transformTeamRosterLight,
} from "./mmolb-transform";
import {
  searchPlayers as dbSearchPlayers,
  searchTeams as dbSearchTeams,
} from "./queries";
import { NoStatsError } from "./errors";
import type {
  PlayerData,
  PlayerSearchResult,
  TeamSearchResult,
  RosterPlayer,
} from "./types";

// ── Caches ──

const PLAYER_CACHE_TTL = 5 * 60 * 1000;
const PLAYER_CACHE_MAX = 100;

type PlayerCacheEntry =
  | { kind: "data"; data: PlayerData | null; expires: number }
  | { kind: "no-stats"; expires: number };

const playerCache = new Map<string, PlayerCacheEntry>();

const TEAM_META_TTL = 30 * 60 * 1000;
const TEAM_META_NEGATIVE_TTL = 60 * 1000; // 60s for failed lookups
const teamMetaCache = new Map<
  string,
  { name: string; emoji: string | null; expires: number }
>();

// Inflight dedup: prevents redundant concurrent fetches for the same ID
const playerInflight = new Map<string, Promise<PlayerData | null>>();
const teamRosterInflight = new Map<string, Promise<RosterPlayer[]>>();

function setPlayerCache(id: string, entry: PlayerCacheEntry) {
  if (playerCache.size >= PLAYER_CACHE_MAX) {
    const oldest = playerCache.keys().next().value;
    if (oldest !== undefined) playerCache.delete(oldest);
  }
  playerCache.set(id, entry);
}

function cacheTeamMeta(teamId: string, name: string, emoji: string | null) {
  teamMetaCache.set(teamId, { name, emoji, expires: Date.now() + TEAM_META_TTL });
}

// ── Team metadata resolution ──

function teamFullName(location: string | null | undefined, name: string): string {
  if (location && name && !name.startsWith(location)) {
    return `${location} ${name}`;
  }
  return name;
}

async function resolveTeamMeta(
  teamId: string
): Promise<{ name: string; emoji: string | null }> {
  const cached = teamMetaCache.get(teamId);
  if (cached && cached.expires > Date.now()) {
    return { name: cached.name, emoji: cached.emoji };
  }

  try {
    const team = await fetchTeam(teamId);
    const fullName = teamFullName(team.Location, team.Name);
    cacheTeamMeta(team._id, fullName, team.Emoji ?? null);
    return { name: fullName, emoji: team.Emoji ?? null };
  } catch {
    // Negative cache: avoid repeated 3s timeouts for the same team during outages
    teamMetaCache.set(teamId, { name: "", emoji: null, expires: Date.now() + TEAM_META_NEGATIVE_TTL });
    return { name: "", emoji: null };
  }
}

// ── Player ──

async function fetchPlayerFromApi(id: string): Promise<PlayerData | null> {
  // Fetch player data, season records, and current season ID in parallel
  const [raw, recordData, state] = await Promise.all([
    fetchPlayer(id),
    fetchPlayerRecord(id).catch(() => null),
    fetchState().catch(() => null),
  ]);

  const { name: teamName, emoji: teamEmoji } = await resolveTeamMeta(
    raw.TeamID
  );

  const player = transformPlayer(raw, teamName, teamEmoji, recordData?.records, state?.SeasonID, state?.Day);

  if (Object.keys(player.stats).length === 0) {
    throw new NoStatsError(id);
  }

  return player;
}

async function getPlayerInternal(id: string): Promise<PlayerData | null> {
  // 1. Cache check
  const cached = playerCache.get(id);
  if (cached && cached.expires > Date.now()) {
    if (cached.kind === "no-stats") throw new NoStatsError(id);
    return cached.data;
  }

  // 2. Try MMOLB API
  try {
    const player = await fetchPlayerFromApi(id);
    setPlayerCache(id, { kind: "data", data: player, expires: Date.now() + PLAYER_CACHE_TTL });
    return player;
  } catch (err) {
    // 404 = player doesn't exist. Don't fall back to stale DB data.
    if (err instanceof MmolbApiNotFoundError) {
      setPlayerCache(id, { kind: "data", data: null, expires: Date.now() + PLAYER_CACHE_TTL });
      return null;
    }
    // NoStatsError from transform: propagate (route handler catches for 422)
    if (err instanceof NoStatsError) throw err;
    // Other errors (timeout, 5xx, network): no DB fallback (stale data is worse than no data)
    console.error(
      `[player-data] API failed for ${id}:`,
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

export async function getPlayer(id: string, fresh = false): Promise<PlayerData | null> {
  if (fresh) {
    // Bypass cache and inflight dedup for forced refresh
    playerCache.delete(id);
    playerInflight.delete(id);
  }

  // Inflight dedup
  const existing = playerInflight.get(id);
  if (existing) return existing;

  const promise = getPlayerInternal(id);
  playerInflight.set(id, promise);
  try {
    return await promise;
  } finally {
    playerInflight.delete(id);
  }
}

// ── Team roster ──

async function getTeamRosterInternal(
  teamId: string
): Promise<RosterPlayer[]> {
  try {
    const team = await fetchTeam(teamId);
    // Cache team meta as side effect for future player lookups
    cacheTeamMeta(team._id, teamFullName(team.Location, team.Name), team.Emoji ?? null);
    return transformTeamRoster(team);
  } catch (err) {
    if (err instanceof MmolbApiNotFoundError) {
      return [];
    }
    console.error(
      `[player-data] API roster failed for ${teamId}:`,
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}

export async function getTeamRoster(
  teamId: string
): Promise<RosterPlayer[]> {
  const existing = teamRosterInflight.get(teamId);
  if (existing) return existing;

  const promise = getTeamRosterInternal(teamId);
  teamRosterInflight.set(teamId, promise);
  try {
    return await promise;
  } finally {
    teamRosterInflight.delete(teamId);
  }
}

// ── Team roster light ──

export async function getTeamRosterLight(
  teamId: string
): Promise<
  { mmolbPlayerId: string; firstName: string; lastName: string; level: number }[]
> {
  try {
    const team = await fetchTeam(teamId);
    cacheTeamMeta(team._id, teamFullName(team.Location, team.Name), team.Emoji ?? null);
    return transformTeamRosterLight(team);
  } catch (err) {
    if (err instanceof MmolbApiNotFoundError) {
      return [];
    }
    console.error(
      `[player-data] API roster-light failed for ${teamId}:`,
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}

// ── Search (DB-only, no MMOLB API search endpoint) ──

export function searchPlayers(
  query: string,
  limit?: number
): Promise<PlayerSearchResult[]> {
  return dbSearchPlayers(query, limit);
}

export function searchTeams(
  query: string,
  limit?: number
): Promise<TeamSearchResult[]> {
  return dbSearchTeams(query, limit);
}
