// One-time (re-runnable) live pull that FREEZES a player sample for threshold
// calibration. Writes references/s15-calibration-sample.json (seed 999, the
// calibration set) and references/s15-calibration-sample-seed2.json (seed 12345,
// the independent validation set). The calibration test reads these FROZEN files
// so threshold tuning is deterministic and reproducible offline (no network in
// the test). Re-run only to refresh the frozen sample against live S15 data.
//
//   node scripts/fetch-calibration-sample.mjs
//
// Per player we store exactly what the deterministic scorer needs to reproduce
// the app's four pillars: role, level, position, the base-attribute map (built
// identically to mmolb-transform.buildBaseStatMap), and the derived stat line
// (built identically to percentile-builder). No PII beyond in-game ids.

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REF_DIR = join(__dirname, "..", "references");

const SAMPLE_TEAMS = 14;
const SEEDS = [
  { seed: 999, out: "s15-calibration-sample.json" },
  { seed: 12345, out: "s15-calibration-sample-seed2.json" },
];
const PITCHER_POSITIONS = new Set(["SP", "RP", "CL", "P"]);
// Table-inclusion bars (match percentile-builder). Scoring bar (hasStats) is lower.
const MIN_PA = 30;
const MIN_OUTS = 15;
const SCORE_MIN_PA = 5;   // extractGameStats returns a batter line at >=5 PA
const SCORE_MIN_OUTS = 3; // extractGameStats returns a pitcher line at >=1 IP

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

// Deterministic Fisher-Yates using a seeded LCG so a given seed always picks the
// same teams (Math.random is unavailable/nondeterministic; this must be stable).
function seededSample(arr, n, seed) {
  const a = [...arr];
  let s = (seed >>> 0) || 1;
  const rand = () => {
    // Numerical Recipes LCG
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

// Mirror of mmolb-transform.buildBaseStatMap.
function buildBaseStatMap(raw) {
  const sums = new Map();
  const add = (attr, amount) => {
    if (attr == null || amount == null) return;
    const key = String(attr).toLowerCase();
    sums.set(key, (sums.get(key) ?? 0) + amount);
  };
  for (const b of raw.BaseAttributeBonuses ?? []) add(b.attribute, b.amount);
  for (const s of raw.ScheduledLevelUps ?? []) {
    if (s.choice?.type === "boon") continue;
    add(s.choice?.attribute, s.choice?.amount);
  }
  for (const a of raw.AugmentHistory ?? []) add(a.attribute, a.amount);
  const stats = {};
  for (const [k, total] of sums) stats[k] = Math.min(Math.round(total * 100), 1000);
  return stats;
}

// Player endpoint nests Stats as {teamId:{...}}; return the relevant flat block.
function extractStatBlock(raw) {
  const s = raw.Stats;
  if (!s || typeof s !== "object") return {};
  const tid = raw.TeamID;
  if (tid && s[tid] && typeof s[tid] === "object") return s[tid];
  for (const v of Object.values(s)) if (v && typeof v === "object") return v;
  return s;
}

// Mirror of percentile-builder's line computation, emitting evaluator GameStats keys.
function buildStatLine(block, isPitcher) {
  if (isPitcher) {
    const outs = block.outs ?? 0;
    if (outs < SCORE_MIN_OUTS) return { line: null, qualifies: false };
    const ip = outs / 3;
    return {
      line: {
        ERA: (block.earned_runs ?? 0) / ip * 9,
        WHIP: ((block.hits_allowed ?? 0) + (block.walks ?? 0)) / ip,
        K9: (block.strikeouts ?? 0) / ip * 9,
        BB9: (block.walks ?? 0) / ip * 9,
        HR9: (block.home_runs_allowed ?? 0) / ip * 9,
      },
      qualifies: outs >= MIN_OUTS,
    };
  }
  const pa = block.plate_appearances ?? 0;
  if (pa < SCORE_MIN_PA) return { line: null, qualifies: false };
  const singles = block.singles ?? 0, doubles = block.doubles ?? 0;
  const triples = block.triples ?? 0, hrs = block.home_runs ?? 0;
  const bb = block.walked ?? 0, hbp = block.hit_by_pitch ?? 0;
  const so = block.struck_out ?? 0, sb = block.stolen_bases ?? 0, cs = block.caught_stealing ?? 0;
  const h = singles + doubles + triples + hrs;
  const ab = pa - bb - hbp - (block.sac_flies ?? 0);
  const tb = singles + 2 * doubles + 3 * triples + 4 * hrs;
  const obp = pa > 0 ? (h + bb + hbp) / pa : 0;
  return {
    line: {
      AVG: ab > 0 ? h / ab : 0,
      OBP: obp,
      SLG: ab > 0 ? tb / ab : 0,
      OPS: obp + (ab > 0 ? tb / ab : 0),
      K_PCT: pa > 0 ? so / pa * 100 : 0,
      BB_PCT: pa > 0 ? bb / pa * 100 : 0,
      ...((sb + cs) >= 5 ? { SB_PCT: sb / (sb + cs) } : {}),
    },
    qualifies: pa >= MIN_PA,
  };
}

async function pool(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const res = await Promise.allSettled(batch.map(fn));
    for (const r of res) if (r.status === "fulfilled" && r.value) out.push(r.value);
  }
  return out;
}

async function buildSample(seed) {
  const state = await fetchJson("https://mmolb.com/api/state");
  const leagueIds = [...(state.GreaterLeagues ?? []), ...(state.LesserLeagues ?? [])];
  const teamIds = [];
  const leagues = await Promise.allSettled(
    leagueIds.map((id) => fetchJson(`https://mmolb.com/api/league/${id}`)));
  for (const r of leagues) {
    if (r.status === "fulfilled") {
      for (const t of r.value.Teams ?? []) if (typeof t === "string") teamIds.push(t);
    }
  }
  const sampledTeams = seededSample(teamIds, SAMPLE_TEAMS, seed);
  console.error(`  seed ${seed}: ${teamIds.length} teams, sampling ${sampledTeams.length}`);

  // Collect player ids from sampled team rosters (Players + Bench).
  const teams = await pool(sampledTeams, 10, (id) => fetchJson(`https://mmolb.com/api/team/${id}`));
  const playerIds = [];
  for (const td of teams) {
    for (const p of td.Players ?? []) if (p?.PlayerID) playerIds.push(p.PlayerID);
    const bench = td.Bench;
    if (bench && typeof bench === "object") {
      for (const group of Object.values(bench)) {
        if (Array.isArray(group)) for (const p of group) if (p?.PlayerID) playerIds.push(p.PlayerID);
      }
    }
  }
  console.error(`  seed ${seed}: ${playerIds.length} players`);

  const records = await pool([...new Set(playerIds)], 20, async (pid) => {
    const raw = await fetchJson(`https://mmolb.com/api/player/${pid}`);
    const position = raw.Position ?? "";
    const ptype = raw.PositionType ?? "";
    const isPitcher = ptype === "Pitcher" ||
      (ptype !== "Batter" && PITCHER_POSITIONS.has(position.replace(/\d+$/, "")));
    const role = isPitcher ? "pitcher" : "batter";
    const attrs = buildBaseStatMap(raw);
    if (Object.keys(attrs).length === 0) return null;
    const { line, qualifies } = buildStatLine(extractStatBlock(raw), isPitcher);
    return { role, level: raw.Level ?? 1, position, attrs, statline: line, qualifies };
  });
  return records;
}

mkdirSync(REF_DIR, { recursive: true });
for (const { seed, out } of SEEDS) {
  console.error(`Fetching calibration sample (seed ${seed})...`);
  const records = await buildSample(seed);
  const path = join(REF_DIR, out);
  writeFileSync(path, JSON.stringify({ seed, sampledAt_note: "S15 live pull; frozen for calibration", count: records.length, players: records }, null, 0) + "\n");
  const b = records.filter((r) => r.role === "batter").length;
  console.error(`  wrote ${records.length} players (${b} batter / ${records.length - b} pitcher) -> references/${out}`);
}
console.error("done.");
