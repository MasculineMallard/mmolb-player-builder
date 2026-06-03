# ARCHITECTURE — mmolb-player-builder-next (POP)

**Last updated:** 2026-05-31 (Codebase Review #10) · **LOC:** 12,601 (10,829 src + 1,772 test) · **Files:** 90 (.ts/.tsx)

Structural index for the next reviewer. Current-state facts only — review findings live in `SCRATCH.md` and `REVIEW.html`. The hotspot table is the exception (tracks cross-review persistence).

## What this is
POP ("Player Optimization Planner") — an MMOLB player evaluation and build-planning web app. Personal/community tool, single developer, no auth, no PII. Served under basePath `/pop`. No LLM/AI integration; all scoring is deterministic math.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Zustand 5 · base-ui · `pg` 8 · vitest. Reads from two external read-only sources: Postgres `mmoldb.beiju.me` (public guest account, SELECT-only) and HTTP `mmolb.com`. **Note:** Next 16 has breaking changes vs older docs — see `AGENTS.md` ("This is NOT the Next.js you know").

## Layer Architecture
```
app/ (routes, pages)  ─┐
components/ (UI)        ├─▶ depends on ─▶ lib/, store/, hooks/
hooks/ (client fetch)  ─┘
lib/ (engine + data)   ─▶ does NOT import upward into components/app  (clean direction, no cycles)
```
- **Data-access seam:** `player-data.ts` orchestrates `mmolb-api.ts` (external HTTP, API-first) + `queries.ts` (Postgres, DB-fallback) → `mmolb-transform.ts` (raw JSON → PlayerData). In-process caching (TTL + LRU + inflight-dedup + negative caching).
- **Scoring engine:** `evaluator.ts` (pure) turns a PlayerData into an EvaluatedPlayer; reasoning extracted to `evaluator-reasoning.ts`; reference data in `evaluator-data.ts`; game mechanics constants in `mechanics.ts`; archetype/target math in `optimizer.ts`.
- **Static game data:** `public/data/*.json` loaded via `json-cache.ts` (fetch-once singletons).
- **Live percentiles:** `percentile-builder.ts` crawls mmolb.com daily, builds percentile tables, persists to a disk cache; served via `/api/percentiles`; overrides the hardcoded S10/S11 fallback tables in `evaluator-data.ts`.

## Module Map (selected, by LOC)
| File | LOC | Purpose |
|------|-----|---------|
| lib/evaluator.ts | 503 | Scoring engine: percentile→score, composite, recommendation, archetype detection, position fit |
| lib/item-advisor.ts | 455 | 5-slot shop/item recommendation engine |
| components/shop/ShopView.tsx | 426 | Shop tool view |
| components/builder/PlayerContent.tsx | 415 | Builder player view |
| lib/percentile-builder.ts | 413 | Live percentile crawl/build/cache + daily scheduler (server-only) |
| lib/mmolb-transform.ts | 411 | Raw MMOLB API JSON → PlayerData (buildStatMap, extractGameStats, recomp detection) |
| lib/queries.ts | 394 | Postgres reads (search + parsePlayerRows) |
| components/builder/PlayerSearch.tsx | 385 | Player/team search + team browser |
| components/evaluator/roster-table.tsx | 363 | Roster evaluation table (Mulch-o-Meter) |
| app/mulch/page.tsx | 361 | Roster evaluation page (god-component — see hotspots) |
| lib/advisor.ts | 266 | Stat-priority + boon scoring (scoreBoons) |
| lib/evaluator-data.ts | 294 | Stat weights, tiers, fallback percentile tables, JSON loaders |
| lib/evaluator-reasoning.ts | 232 | Human-readable evaluation reasoning strings |

Routes: 6 pages (home, batter, pitcher, pitcher-shop, shop, mulch) + 8 API route handlers (health, percentiles, percentiles/refresh, players/[id], players/search, teams/[id]/roster, teams/[id]/roster-light, teams/search). 32 components, 6 hooks, 1 Zustand store, 12 vitest test files.

## High Fan-In (load-bearing)
`evaluator.ts`, `evaluator-data.ts`, `constants.ts`, `evaluator-types.ts`, `player-data.ts`, `mechanics.ts` — imported by many. Changes here ripple widely; the duplication problem (below) is largely failure to import from these.

## Key Design Decisions
- **API-first, DB-fallback:** live player/roster data comes from mmolb.com; the Postgres path is a fallback (and the search path). The `getPlayerFull`/`getTeamRoster` functions in `queries.ts` are currently unused (routes use `player-data.ts`).
- **Read-only external DB:** guest account, SELECT-only, schema-qualified queries (`data.*`, `taxa.*`), SSL off (public game data). All queries parameterized.
- **Live percentiles override hardcoded fallback:** evaluator scores against live tables when available, else S10/S11 hardcoded tables.
- **Single-instance assumption** is baked into the percentile scheduler (import-time setInterval), the rate-limiter, and all caches (per-process). Horizontal scale-out requires rework.

## Dead Code (as of #10)
`item-advisor.generateShopSummary` (never imported), `evaluator-data` H9 percentile table + `GameStats.H9` field (no weight uses it), `evaluator-data.LOWER_IS_BETTER` (exported, never consumed), `queries.ts` getPlayerFull/getTeamRoster/getTeamRosterLight (~150 LOC, unimported). Prior dead components PlayerInfo.tsx + StatGrid.tsx were deleted since #9.

## Persistent Review Hotspots
| File | Reviews flagged | Severity | Core issue |
|------|-----------------|----------|------------|
| lib/percentile-builder.ts | #10 (NEW) | Blocker | SB_PCT empty-table crash; impure import (setInterval+disk I/O); 2nd source of truth for stat tiers; AppliedLevelUps divergence; runRefresh 228-line fn |
| lib/evaluator.ts | #10 | Blocker root | `percentileToScore` no length guard; untested; composite-weight source duplicated outward |
| components/evaluator/player-detail.tsx | #10 (NEW) | Warning | Composite-weight display drift (batter 25/25/25/25 vs engine 20/40/20/20) |
| components/evaluator/roster-table.tsx | #10 (NEW) | Warning | Stale VERDICT_ORDER → dead verdict sort for 4/5 tiers |
| app/mulch/page.tsx | #10 (NEW) | Warning | God-component; uncapped ~50 parallel fetch fan-out; reinvents useTeamSearch |
| lib/db.ts | #10 | Suggestion | Hardcoded public guest password dev fallback; ssl off (documented, low risk) |
| lib/rate-limit.ts | #9, #10 | Suggestion | Per-process, lazy prune, spoofable x-forwarded-for (partially addressed since #9) |

## Known Tech Debt
- Engine subsystem (evaluator/transform/advisor/percentile) has zero test coverage.
- ~242 LOC reducible duplication: composite weights, archetype-fit (3-4×), position lists, defense maps (5×), DurabilityPips (4×), slot emojis, recommendation thresholds, JSON loaders.
- README is create-next-app boilerplate (documents none of the real system).
- Two open data-correctness questions pending real mmolb.com fixtures (AppliedLevelUps vs ScheduledLevelUps; flat-vs-nested Stats shape).
- `CURRENT_SEASON = "Season 12"` while mechanics/data are S11-labeled — reconcile.
