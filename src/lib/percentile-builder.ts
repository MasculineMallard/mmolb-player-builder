/**
 * Build live percentile tables from mmoldb S11 game events.
 *
 * Uses a dedicated pg.Client (not the shared pool) with 120s timeout.
 * Queries all leagues for complete league-wide percentiles.
 * Results cached in memory AND persisted to disk so restarts don't lose data.
 */

import { Client } from "pg";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { PercentileEntry } from "./evaluator-types";
import { fetchState } from "./mmolb-api";

// ── Disk cache path ──

const CACHE_DIR = join(process.cwd(), ".cache");
const CACHE_FILE = join(CACHE_DIR, "percentiles.json");

// ── Cache ──

interface PercentileCache {
  batting: Record<string, PercentileEntry[]>;
  pitching: Record<string, PercentileEntry[]>;
  computedAt: string;
  playerCount: { batters: number; pitchers: number };
  season?: number;
}

let cached: PercentileCache | null = null;
let isRefreshing = false;
let lastError: string | null = null;

// ── Load from disk on startup ──

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
  console.log(`[percentiles] Loaded disk cache from ${cached.computedAt} (S${cached.season ?? "?"})`);
}

// ── Required keys for validation ──

const REQUIRED_BATTING_KEYS = ["AVG", "OBP", "SLG", "OPS", "K_PCT", "BB_PCT"];
const REQUIRED_PITCHING_KEYS = ["ERA", "WHIP", "K9", "BB9", "HR9"];

// ── Queries (season placeholder replaced at runtime) ──

function battingQuery(season: number): string {
  return `
  SELECT batter_name,
    COUNT(*) FILTER (WHERE et.ends_plate_appearance) as pa,
    COUNT(*) FILTER (WHERE et.is_hit AND ee.hit_base = 1) as singles,
    COUNT(*) FILTER (WHERE et.is_hit AND ee.hit_base = 2) as doubles,
    COUNT(*) FILTER (WHERE et.is_hit AND ee.hit_base = 3) as triples,
    COUNT(*) FILTER (WHERE et.name = 'HomeRun') as hrs,
    COUNT(*) FILTER (WHERE et.name = 'Walk') as bb,
    COUNT(*) FILTER (WHERE et.is_strikeout) as so,
    COUNT(*) FILTER (WHERE et.name = 'HitByPitch') as hbp,
    COUNT(*) FILTER (WHERE et.name = 'StolenBase') as sb,
    COUNT(*) FILTER (WHERE et.name = 'CaughtStealing') as cs
  FROM data.events_extended ee
  JOIN taxa.event_type et ON ee.event_type = et.id
  WHERE ee.season = ${season}
  GROUP BY batter_name
  HAVING COUNT(*) FILTER (WHERE et.ends_plate_appearance) >= 30
`;
}

function pitchingQuery(season: number): string {
  return `
  SELECT pitcher_name,
    SUM(ee.outs_after - ee.outs_before) as outs,
    COUNT(*) FILTER (WHERE et.is_hit) as hits_allowed,
    COUNT(*) FILTER (WHERE et.name = 'HomeRun') as hr_allowed,
    COUNT(*) FILTER (WHERE et.name = 'Walk') as walks,
    COUNT(*) FILTER (WHERE et.is_strikeout) as strikeouts,
    SUM(CASE WHEN top_of_inning
      THEN away_team_score_after - away_team_score_before
      ELSE home_team_score_after - home_team_score_before END) as runs_allowed
  FROM data.events_extended ee
  JOIN taxa.event_type et ON ee.event_type = et.id
  WHERE ee.season = ${season}
  GROUP BY pitcher_name
  HAVING SUM(ee.outs_after - ee.outs_before) >= 15
`;
}

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

// ── Get current season from MMOLB API ──

async function getCurrentSeason(): Promise<number> {
  try {
    const state = await fetchState();
    // SeasonID is an ObjectId, but the season number is in the events data
    // The state doesn't expose season number directly, so we parse from context
    // For now, hardcode the mapping or use a reasonable default
    // TODO: When the API exposes season number, use it directly
  } catch {
    // Fallback
  }
  return 11; // Current season
}

// ── Core refresh ──

async function runRefresh(): Promise<void> {
  const season = await getCurrentSeason();

  const client = new Client({
    host: process.env.MMOLDB_HOST || "mmoldb.beiju.me",
    port: parseInt(process.env.MMOLDB_PORT || "42416"),
    database: process.env.MMOLDB_DATABASE || "mmoldb",
    user: process.env.MMOLDB_USER || "guest",
    password: process.env.MMOLDB_PASSWORD ?? (process.env.NODE_ENV === "production" ? undefined : "moldybees"),
    ssl: false,
    statement_timeout: 120_000,
  });

  try {
    await client.connect();
    console.log(`[percentiles] Connected to mmoldb, querying season ${season}...`);

    const battingStart = performance.now();
    const battingResult = await client.query(battingQuery(season));
    console.log(`[percentiles] Batting: ${battingResult.rows.length} players in ${((performance.now() - battingStart) / 1000).toFixed(1)}s`);

    const pitchingStart = performance.now();
    const pitchingResult = await client.query(pitchingQuery(season));
    console.log(`[percentiles] Pitching: ${pitchingResult.rows.length} players in ${((performance.now() - pitchingStart) / 1000).toFixed(1)}s`);

    // Compute batting derived stats
    const batterLines = battingResult.rows.map((r: Record<string, string>) => {
      const pa = +r.pa;
      const h = +r.singles + +r.doubles + +r.triples + +r.hrs;
      const ab = pa - +r.bb - +r.hbp;
      const tb = +r.singles + 2 * +r.doubles + 3 * +r.triples + 4 * +r.hrs;
      const sb = +r.sb;
      const cs = +r.cs;
      return {
        avg: ab > 0 ? h / ab : 0,
        obp: pa > 0 ? (h + +r.bb + +r.hbp) / pa : 0,
        slg: ab > 0 ? tb / ab : 0,
        ops: (pa > 0 ? (h + +r.bb + +r.hbp) / pa : 0) + (ab > 0 ? tb / ab : 0),
        kPct: pa > 0 ? +r.so / pa * 100 : 0,
        bbPct: pa > 0 ? +r.bb / pa * 100 : 0,
        sbPct: (sb + cs) >= 5 ? sb / (sb + cs) : undefined,
      };
    });

    // Compute pitching derived stats
    const pitcherLines = pitchingResult.rows.map((r: Record<string, string>) => {
      const outs = +r.outs;
      const ip = outs / 3;
      return {
        era: ip > 0 ? +r.runs_allowed / ip * 9 : 0,
        whip: ip > 0 ? (+r.hits_allowed + +r.walks) / ip : 0,
        k9: ip > 0 ? +r.strikeouts / ip * 9 : 0,
        bb9: ip > 0 ? +r.walks / ip * 9 : 0,
        hr9: ip > 0 ? +r.hr_allowed / ip * 9 : 0,
      };
    });

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
      season,
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
    await client.end().catch(() => {});
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
