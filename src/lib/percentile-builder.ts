/**
 * Build live percentile tables from MMOLB API team/player stats.
 *
 * Fetches all team rosters from the MMOLB API, computes batting and pitching
 * lines, then builds percentile tables. No MMOLDB dependency.
 * Results cached in memory AND persisted to disk so restarts don't lose data.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { PercentileEntry } from "./evaluator-types";

// ── Disk cache path ──

const CACHE_DIR = join(process.cwd(), ".cache");
const CACHE_FILE = join(CACHE_DIR, "percentiles.json");

// ── Cache ──

interface PercentileCache {
  batting: Record<string, PercentileEntry[]>;
  pitching: Record<string, PercentileEntry[]>;
  computedAt: string;
  playerCount: { batters: number; pitchers: number };
}

let cached: PercentileCache | null = null;
let isRefreshing = false;
let lastError: string | null = null;

// ── Disk persistence ──

function loadFromDisk(): PercentileCache | null {
  try {
    const raw = readFileSync(CACHE_FILE, "utf-8");
    const data: PercentileCache = JSON.parse(raw);
    if (data.batting && data.pitching && data.computedAt) return data;
  } catch {
    // No cached file or invalid JSON
  }
  return null;
}

function saveToDisk(data: PercentileCache): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data), "utf-8");
  } catch (err) {
    console.error("[percentiles] Failed to write disk cache:", err);
  }
}

// Initialize from disk
cached = loadFromDisk();
if (cached) {
  console.log(`[percentiles] Loaded disk cache from ${cached.computedAt}`);
}

// ── Required keys for validation ──

const REQUIRED_BATTING_KEYS = ["AVG", "OBP", "SLG", "OPS", "K_PCT", "BB_PCT"];
const REQUIRED_PITCHING_KEYS = ["ERA", "WHIP", "K9", "BB9", "HR9"];

// ── Percentile math ──

function buildPercentileTable(values: number[], higherIsBetter: boolean): PercentileEntry[] {
  if (values.length < 10) return [];
  const sorted = [...values].sort((a, b) => higherIsBetter ? b - a : a - b);
  const n = sorted.length;
  return [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95].map(pct => ({
    pct,
    value: Math.round(sorted[Math.floor(n * pct / 100)] * 1000) / 1000,
  }));
}

function validate(tables: PercentileCache): boolean {
  for (const key of REQUIRED_BATTING_KEYS) {
    if (!Array.isArray(tables.batting[key]) || tables.batting[key].length < 10) return false;
  }
  for (const key of REQUIRED_PITCHING_KEYS) {
    if (!Array.isArray(tables.pitching[key]) || tables.pitching[key].length < 10) return false;
  }
  return true;
}

// ── MMOLB API types (minimal, just what we need) ──

interface ApiTeamPlayer {
  FirstName: string;
  LastName: string;
  Position: string;
  PositionType: string;
  Stats: Record<string, number>;
}

interface ApiTeam {
  Players: ApiTeamPlayer[];
  Bench?: Record<string, ApiTeamPlayer[]>;
}

interface ApiLeague {
  Teams: string[];
}

interface ApiState {
  GreaterLeagues: string[];
  LesserLeagues: string[];
}

const PITCHER_POSITIONS = new Set(["SP", "RP", "CL", "P"]);
const MIN_PA = 30;
const MIN_OUTS = 15;
const MIN_STEAL_ATTEMPTS = 5;

// ── Fetch helpers ──

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Core refresh ──

async function runRefresh(): Promise<void> {
  try {
    console.log("[percentiles] Fetching all teams from MMOLB API...");

    // 1. Get all team IDs from leagues
    const state = await fetchJson<ApiState>("https://mmolb.com/api/state");
    const leagueIds = [...state.GreaterLeagues, ...state.LesserLeagues];

    const teamIds: string[] = [];
    const leagueResults = await Promise.allSettled(
      leagueIds.map(id => fetchJson<ApiLeague>(`https://mmolb.com/api/league/${id}`))
    );
    for (const r of leagueResults) {
      if (r.status === "fulfilled") {
        for (const t of r.value.Teams) {
          if (typeof t === "string") teamIds.push(t);
        }
      }
    }
    console.log(`[percentiles] Found ${teamIds.length} teams across ${leagueIds.length} leagues`);

    // 2. Fetch team rosters in batches of 20 to avoid overwhelming the API
    const allPlayers: ApiTeamPlayer[] = [];
    const BATCH = 20;
    for (let i = 0; i < teamIds.length; i += BATCH) {
      const batch = teamIds.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(id => fetchJson<ApiTeam>(`https://mmolb.com/api/team/${id}`))
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          allPlayers.push(...r.value.Players);
          if (r.value.Bench) {
            for (const group of Object.values(r.value.Bench)) {
              if (Array.isArray(group)) allPlayers.push(...group);
            }
          }
        }
      }
    }
    console.log(`[percentiles] Fetched ${allPlayers.length} players`);

    // 3. Split into batters and pitchers, compute lines
    const batterLines: { avg: number; obp: number; slg: number; ops: number; kPct: number; bbPct: number; sbPct?: number }[] = [];
    const pitcherLines: { era: number; whip: number; k9: number; bb9: number; hr9: number }[] = [];

    for (const p of allPlayers) {
      const s = p.Stats;
      if (!s) continue;

      const isPitcher = PITCHER_POSITIONS.has(p.Position?.replace(/\d+$/, "") ?? "");

      if (isPitcher) {
        const outs = s.outs ?? 0;
        if (outs < MIN_OUTS) continue;
        const ip = outs / 3;
        pitcherLines.push({
          era: (s.earned_runs ?? 0) / ip * 9,
          whip: ((s.hits_allowed ?? 0) + (s.walks ?? 0)) / ip,
          k9: (s.strikeouts ?? 0) / ip * 9,
          bb9: (s.walks ?? 0) / ip * 9,
          hr9: (s.home_runs_allowed ?? 0) / ip * 9,
        });
      } else {
        const pa = s.plate_appearances ?? 0;
        if (pa < MIN_PA) continue;
        const singles = s.singles ?? 0;
        const doubles = s.doubles ?? 0;
        const triples = s.triples ?? 0;
        const hrs = s.home_runs ?? 0;
        const bb = s.walked ?? 0;
        const hbp = s.hit_by_pitch ?? 0;
        const so = s.struck_out ?? 0;
        const sb = s.stolen_bases ?? 0;
        const cs = s.caught_stealing ?? 0;

        const h = singles + doubles + triples + hrs;
        const ab = pa - bb - hbp - (s.sac_flies ?? 0);
        const tb = singles + 2 * doubles + 3 * triples + 4 * hrs;

        batterLines.push({
          avg: ab > 0 ? h / ab : 0,
          obp: pa > 0 ? (h + bb + hbp) / pa : 0,
          slg: ab > 0 ? tb / ab : 0,
          ops: (pa > 0 ? (h + bb + hbp) / pa : 0) + (ab > 0 ? tb / ab : 0),
          kPct: pa > 0 ? so / pa * 100 : 0,
          bbPct: pa > 0 ? bb / pa * 100 : 0,
          sbPct: (sb + cs) >= MIN_STEAL_ATTEMPTS ? sb / (sb + cs) : undefined,
        });
      }
    }

    console.log(`[percentiles] Computing: ${batterLines.length} batters, ${pitcherLines.length} pitchers`);

    // 4. Build percentile tables
    const battingTables: Record<string, PercentileEntry[]> = {
      AVG: buildPercentileTable(batterLines.map(b => b.avg), true),
      OBP: buildPercentileTable(batterLines.map(b => b.obp), true),
      SLG: buildPercentileTable(batterLines.map(b => b.slg), true),
      OPS: buildPercentileTable(batterLines.map(b => b.ops), true),
      K_PCT: buildPercentileTable(batterLines.map(b => b.kPct), false),
      BB_PCT: buildPercentileTable(batterLines.map(b => b.bbPct), true),
      SB_PCT: buildPercentileTable(
        batterLines.map(b => b.sbPct).filter((v): v is number => v !== undefined),
        true,
      ),
    };

    const pitchingTables: Record<string, PercentileEntry[]> = {
      ERA: buildPercentileTable(pitcherLines.map(p => p.era), false),
      WHIP: buildPercentileTable(pitcherLines.map(p => p.whip), false),
      K9: buildPercentileTable(pitcherLines.map(p => p.k9), true),
      BB9: buildPercentileTable(pitcherLines.map(p => p.bb9), false),
      HR9: buildPercentileTable(pitcherLines.map(p => p.hr9), false),
    };

    const result: PercentileCache = {
      batting: battingTables,
      pitching: pitchingTables,
      computedAt: new Date().toISOString(),
      playerCount: { batters: batterLines.length, pitchers: pitcherLines.length },
    };

    if (validate(result)) {
      cached = result;
      lastError = null;
      saveToDisk(result);
      console.log(`[percentiles] Refresh complete. ${batterLines.length} batters, ${pitcherLines.length} pitchers. Saved to disk.`);
    } else {
      lastError = "Validation failed: missing or incomplete percentile tables";
      console.error("[percentiles]", lastError);
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    console.error("[percentiles] Refresh failed:", lastError);
  } finally {
    isRefreshing = false;
  }
}

// ── Public API ──

export function triggerRefresh(): { status: number; message: string } {
  if (isRefreshing) {
    return { status: 409, message: "Refresh already in progress" };
  }
  isRefreshing = true;
  void runRefresh();
  return { status: 202, message: "Refresh started" };
}

export function getCachedPercentiles(): {
  batting: Record<string, PercentileEntry[]>;
  pitching: Record<string, PercentileEntry[]>;
  computedAt: string;
  playerCount: { batters: number; pitchers: number };
  source: "live";
} | { source: "none"; lastError: string | null } {
  if (cached) {
    return { ...cached, source: "live" };
  }
  return { source: "none", lastError };
}
