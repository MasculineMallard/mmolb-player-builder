/**
 * Direct MMOLB game API client.
 *
 * Fetches live player/team data from mmolb.com when MMOLDB is stale or broken.
 * All endpoints are unauthenticated GET requests returning JSON.
 */

const MMOLB_API_BASE = "https://mmolb.com/api";
const API_TIMEOUT_MS = 10_000;

// ── Error types ──

export class MmolbApiNotFoundError extends Error {
  constructor(endpoint: string) {
    super(`MMOLB API 404: ${endpoint}`);
    this.name = "MmolbApiNotFoundError";
  }
}

// ── Raw API response types (PascalCase, matching MMOLB JSON) ──

export interface MmolbApiAttributeBonus {
  amount: number;
  attribute: string;
  source: string;
}

export interface MmolbApiBoonEntry {
  Name: string;
  Description: string;
  Emoji: string;
}

export interface MmolbApiScheduledLevelUp {
  choice: { amount: number; attribute: string; label: string; type: string };
  level: number;
  scheduled_at: string;
}

export interface MmolbApiAugment {
  amount: number;
  attribute: string;
  augment_name: string;
  timestamp: string;
}

export interface MmolbApiPlayer {
  _id: string;
  FirstName: string;
  LastName: string;
  Level: number;
  Position: string;
  PositionType: "Batter" | "Pitcher";
  TeamID: string;
  BaseAttributeBonuses: MmolbApiAttributeBonus[];
  ScheduledLevelUps: MmolbApiScheduledLevelUp[];
  AugmentHistory: MmolbApiAugment[];
  LesserBoon?: MmolbApiBoonEntry[];
  LesserBoons?: MmolbApiBoonEntry[];
  GreaterBoon?: MmolbApiBoonEntry[];
  GreaterBoons?: MmolbApiBoonEntry[];
  PitchTypes: string[];
  PitchSelection: number[];
  LesserDurability: number;
  GreaterDurability: number;
  Stats?: Record<string, Record<string, number>>;
  Birthseason?: number;
  Birthday?: number | string; // "Preseason" for non-recomps, numeric day for mid-season recomps
}

export interface MmolbApiTeamPlayer {
  PlayerID: string;
  FirstName: string;
  LastName: string;
  Level: number;
  Position: string;
  PositionType: "Batter" | "Pitcher";
  Slot: string;
  SlotLabel: string;
  SlotType: string;
}

export interface MmolbApiTeam {
  _id: string;
  Name: string;
  Emoji: string;
  Location: string;
  Players: MmolbApiTeamPlayer[];
  Bench: {
    Batters: MmolbApiTeamPlayer[];
    Pitchers: MmolbApiTeamPlayer[];
  };
}

// ── Fetch helpers ──

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${MMOLB_API_BASE}${path}`;
  const start = performance.now();

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT_MS) });
  } catch (err) {
    const ms = (performance.now() - start).toFixed(1);
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mmolb-api] ${path} FAILED ${ms}ms: ${msg}`);
    throw err;
  }

  const ms = (performance.now() - start).toFixed(1);

  if (res.status === 404) {
    console.warn(`[mmolb-api] ${path} 404 ${ms}ms`);
    throw new MmolbApiNotFoundError(path);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[mmolb-api] ${path} ${res.status} ${ms}ms: ${body.slice(0, 200)}`);
    throw new Error(`MMOLB API ${res.status}: ${path}`);
  }

  if (process.env.NODE_ENV !== "production" || Number(ms) > 500) {
    console.log(`[mmolb-api] ${path} ${res.status} ${ms}ms`);
  }

  return res.json() as Promise<T>;
}

// ── Player record types ──

export interface MmolbApiPlayerRecord {
  FirstName: string;
  LastName: string;
  PlayerID: string;
  Season: number;
  SeasonID: string;
  SeasonStatus: string;
  Stats: Record<string, Record<string, number>>;
  _id: string;
}

// ── Public API ──

export function fetchPlayer(id: string): Promise<MmolbApiPlayer> {
  return apiFetch<MmolbApiPlayer>(`/player/${id}`);
}

export function fetchTeam(id: string): Promise<MmolbApiTeam> {
  return apiFetch<MmolbApiTeam>(`/team/${id}`);
}

export function fetchPlayerRecord(id: string): Promise<{ records: MmolbApiPlayerRecord[] }> {
  return apiFetch<{ records: MmolbApiPlayerRecord[] }>(`/playerrecord/${id}`);
}

export interface MmolbApiState {
  SeasonID: string;
  Day: number;
  SeasonStatus: string;
}

let cachedState: { data: MmolbApiState; expires: number } | null = null;

export async function fetchState(): Promise<MmolbApiState> {
  if (cachedState && cachedState.expires > Date.now()) return cachedState.data;
  const data = await apiFetch<MmolbApiState>("/state");
  cachedState = { data, expires: Date.now() + 30 * 60 * 1000 }; // 30 min cache
  return data;
}
