/**
 * Build live percentile tables from MMOLB API team/player stats.
 *
 * Fetches all team rosters from the MMOLB API, computes batting and pitching
 * lines, then builds percentile tables. No MMOLDB dependency.
 * Results cached in memory AND persisted to disk so restarts don't lose data.
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync } from "fs";
import { join } from "path";
import type { PercentileEntry } from "./evaluator-types";
import { buildBaseStatMap } from "./mmolb-transform";

// ── Disk cache path ──

const CACHE_DIR = join(process.cwd(), ".cache");
const CACHE_FILE = join(CACHE_DIR, "percentiles.json");

// ── Cache ──

interface PercentileCache {
  batting: Record<string, PercentileEntry[]>;
  pitching: Record<string, PercentileEntry[]>;
  attributes: Record<string, PercentileEntry[]>;
  computedAt: string;
  playerCount: { batters: number; pitchers: number; attrSampled: number };
}

let cached: PercentileCache | null = null;
let isRefreshing = false;
let lastError: string | null = null;
let lastDiskCheck = 0;

// How often a reader re-reads the disk cache to pick up another instance's refresh.
const DISK_RECHECK_MS = 60_000;

// ── Disk persistence ──

function loadFromDisk(): PercentileCache | null {
  try {
    const raw = readFileSync(CACHE_FILE, "utf-8");
    const data: PercentileCache = JSON.parse(raw);
    if (data.batting && data.pitching && data.computedAt) return data;
  } catch (err) {
    // ENOENT (no cache written yet) is expected on first run; surface anything
    // else so a corrupt/unreadable cache isn't silently ignored.
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.warn("[percentiles] Could not read disk cache:", err instanceof Error ? err.message : String(err));
    }
  }
  return null;
}

function saveToDisk(data: PercentileCache): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    // Write-then-rename so a crash mid-write can't leave a truncated JSON file
    // (rename is atomic on the same filesystem).
    const tmp = `${CACHE_FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify(data), "utf-8");
    renameSync(tmp, CACHE_FILE);
  } catch (err) {
    console.error("[percentiles] Failed to write disk cache:", err);
  }
}

// Initialize from disk
cached = loadFromDisk();
if (cached) {
  console.log(`[percentiles] Loaded disk cache from ${cached.computedAt}`);
}

/**
 * Adopt the on-disk cache if it's newer than what we hold in memory (or we hold
 * nothing). The disk file is the cross-instance source of truth: the auto-refresh
 * scheduler is started from instrumentation.ts, which Next may bundle into a
 * different module instance than the API routes — so the scheduler's in-memory
 * `cached` is NOT shared with the route handlers. Reading back from disk bridges
 * that gap (and the multi-worker scale-out case) without a shared store.
 */
function syncFromDisk(): void {
  const disk = loadFromDisk();
  if (disk && (!cached || new Date(disk.computedAt) > new Date(cached.computedAt))) {
    cached = disk;
  }
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
  // Attribute tables are optional (sample may fail) but warn if missing
  if (!tables.attributes.BATTER_ATTR?.length || !tables.attributes.PITCHER_ATTR?.length) {
    console.warn("[percentiles] Attribute percentile tables missing or empty");
  }
  return true;
}

// ── MMOLB API types (minimal, just what we need) ──

interface ApiTeamPlayer {
  PlayerID: string;
  FirstName: string;
  LastName: string;
  Position: string;
  PositionType: string;
  Stats: Record<string, number>;
}

interface ApiFullPlayer {
  BaseAttributeBonuses: { attribute: string; amount: number }[];
  // Use ScheduledLevelUps (not AppliedLevelUps) to match the screenshot-verified
  // transform: BaseAttributeBonuses already includes applied level-ups.
  ScheduledLevelUps: { choice?: { type?: string; attribute?: string; amount?: number } }[];
  AugmentHistory: { attribute: string; amount: number }[];
  Position: string;
  PositionType: string;
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

    // 4. Sample 20% of players per team for attribute quality percentiles
    const samplePlayerIds: { id: string; isPitcher: boolean }[] = [];
    // Re-fetch teams to get player IDs (we only stored stats above)
    // Actually, we need to collect IDs during step 2. Let's use the IDs we saved.
    // We'll do a second pass sampling from allPlayers which has PlayerID.
    for (let i = 0; i < allPlayers.length; i += 5) {
      // Every 5th player ≈ 20%
      const p = allPlayers[i];
      if (p.PlayerID) {
        const isPitcher = PITCHER_POSITIONS.has(p.Position?.replace(/\d+$/, "") ?? "");
        samplePlayerIds.push({ id: p.PlayerID, isPitcher });
      }
    }
    console.log(`[percentiles] Sampling ${samplePlayerIds.length} players for attribute percentiles...`);

    const BATTER_T1 = new Set(["contact", "muscle", "intimidation", "aiming", "performance"]);
    const BATTER_T2 = new Set(["discipline", "lift", "vision", "determination", "insight", "speed", "cunning"]);
    const BATTER_ALL = ["contact", "muscle", "intimidation", "aiming", "performance", "discipline", "lift", "vision", "determination", "insight", "speed", "cunning", "selflessness", "wisdom"];
    const PITCHER_T1 = new Set(["velocity", "control", "rotation", "stuff", "presence"]);
    const PITCHER_T2 = new Set(["deception", "guts", "persuasion", "stamina", "accuracy"]);
    const PITCHER_ALL = ["velocity", "control", "rotation", "stuff", "presence", "deception", "guts", "persuasion", "stamina", "accuracy", "intuition", "defiance"];

    function computeAttrQuality(attrs: Record<string, number>, isPitcher: boolean): number {
      const t1 = isPitcher ? PITCHER_T1 : BATTER_T1;
      const t2 = isPitcher ? PITCHER_T2 : BATTER_T2;
      const all = isPitcher ? PITCHER_ALL : BATTER_ALL;
      let weighted = 0;
      let total = 0;
      for (const stat of all) {
        const val = attrs[stat] ?? 0;
        total += val;
        if (t1.has(stat)) weighted += val * 1.0;
        else if (t2.has(stat)) weighted += val * 0.5;
      }
      return total > 0 ? weighted / total : 0;
    }

    const batterAttrQualities: number[] = [];
    const pitcherAttrQualities: number[] = [];

    const ATTR_BATCH = 20;
    for (let i = 0; i < samplePlayerIds.length; i += ATTR_BATCH) {
      const batch = samplePlayerIds.slice(i, i + ATTR_BATCH);
      const results = await Promise.allSettled(
        batch.map(({ id }) => fetchJson<ApiFullPlayer>(`https://mmolb.com/api/player/${id}`))
      );
      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status !== "fulfilled") continue;
        const attrs = buildBaseStatMap(r.value);
        const isPitcher = batch[j].isPitcher;
        const quality = computeAttrQuality(attrs, isPitcher);
        if (quality > 0) {
          if (isPitcher) pitcherAttrQualities.push(quality);
          else batterAttrQualities.push(quality);
        }
      }
    }
    console.log(`[percentiles] Attribute sample: ${batterAttrQualities.length} batters, ${pitcherAttrQualities.length} pitchers`);

    // 5. Build percentile tables
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

    const attributeTables: Record<string, PercentileEntry[]> = {
      BATTER_ATTR: buildPercentileTable(batterAttrQualities, true),
      PITCHER_ATTR: buildPercentileTable(pitcherAttrQualities, true),
    };

    const result: PercentileCache = {
      batting: battingTables,
      pitching: pitchingTables,
      attributes: attributeTables,
      computedAt: new Date().toISOString(),
      playerCount: { batters: batterLines.length, pitchers: pitcherLines.length, attrSampled: batterAttrQualities.length + pitcherAttrQualities.length },
    };

    // Drop empty tables (e.g. sparse early-season SB%) so nothing downstream
    // scores against an empty percentile table. A required key that comes up
    // empty is removed here and then caught by validate() below (refresh rejected).
    for (const tbls of [result.batting, result.pitching]) {
      for (const key of Object.keys(tbls)) {
        if (tbls[key].length === 0) delete tbls[key];
      }
    }

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
  attributes: Record<string, PercentileEntry[]>;
  computedAt: string;
  playerCount: { batters: number; pitchers: number; attrSampled: number };
  source: "live";
} | { source: "none"; lastError: string | null } {
  // Pull in another instance's refresh from disk (TTL-guarded to bound disk reads).
  const now = Date.now();
  if (!cached || now - lastDiskCheck > DISK_RECHECK_MS) {
    lastDiskCheck = now;
    syncFromDisk();
  }
  if (cached) {
    return { ...cached, source: "live" };
  }
  return { source: "none", lastError };
}

// ── Auto-refresh scheduler: production only, on startup if stale, then every 24h ──
// In dev mode, use POST /api/percentiles/refresh to trigger manually.
//
// Started once at server boot from src/instrumentation.ts (nodejs runtime only),
// instead of at module-import time, so importing this module for getCachedPercentiles
// (e.g. from the health route) doesn't side-effect a scheduler.

let schedulerStarted = false;

export function startPercentileScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  if (process.env.NODE_ENV !== "production") {
    console.log("[percentiles] Dev mode: auto-refresh disabled. Use POST /api/percentiles/refresh to trigger.");
    return;
  }

  const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
  const cacheAge = cached ? Date.now() - new Date(cached.computedAt).getTime() : Infinity;
  if (cacheAge > REFRESH_INTERVAL_MS) {
    console.log("[percentiles] Cache stale or missing, auto-refreshing on startup...");
    setTimeout(() => { if (!isRefreshing) { isRefreshing = true; void runRefresh(); } }, 5000);
  }
  setInterval(() => {
    if (!isRefreshing) {
      console.log("[percentiles] Daily auto-refresh triggered");
      isRefreshing = true;
      void runRefresh();
    }
  }, REFRESH_INTERVAL_MS);
}
