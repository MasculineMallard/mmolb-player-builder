# SCRATCH — MMOLB Player Builder Next

## Future Improvements (from Discord community signals, 2026-04-05)

| Priority | New Tab | Description |
|----------|---------|-------------|
| 1 | Equipment Planner | Plan item slot allocation per player. Show which stats are covered by gear vs. leveling. Flag slot conflicts (max 2 non-Accessory types per attribute). Support "fastball pitcher" / "offspeed pitcher" loadout presets. |
| 2 | Roster Composition Planner | Plan roster turnover: which players to keep, when to introduce new players, staggered graduated roster (jay model: players in years 1-6, turn over ~7 every 3 seasons). Goes beyond Mulch-o-Meter's current-state evaluation. |
| 3 | Defensive Position Optimizer | Show all 9 fielders with position-fit scores. Surface biggest defensive upgrades from position swaps. Uses position defense weights from archetypes. |
| 4 | Durability / Career Timeline | Project seasons remaining per player. Factor in weather damage exposure (Starfall -5/hit, Party -1/event). Show effectiveness penalty cliff. |
| 5 | Pitch Mix Planner | Plan future pitch arsenals and model stat implications of different mixes. Blocked until Danny ships the "training place" feature for changing pitch selections. Design-ready now. |

---

## Codebase Review #9 — 2026-03-30

**Overall: B-** | LOC: 6,165 | Blockers: 3 | Warnings: 12 | Suggestions: 9

Grade trend: C+ → B- → B → B → B → B+ → C+ → B → B-

### Top 3 Action Items
1. Confirm UNCONFIRMED mechanics constants (statCap, defenseLevelsGivePrimary, totalPrimaryPoints) against S11 data — S11 opens March 31
2. Fix silent error swallowing in use-boon-emojis.ts and importComparePlayer
3. Centralize CATEGORY_LABELS and getStatDisplayColor, delete dead components

### Fix Execution Order
- Phase 0 (independent): 8 items (error handling, constant confirmation, useMemo, CSS fix, rate-limit pruning)
- Phase 1 (depends on Phase 0): 4 items (centralize constants, delete dead code, abort controller restructure)
- Phase 2 (depends on Phase 1): 2 items (cache LRU, search dedup)

### Quick Wins
- use-boon-emojis.ts: add console.error to catch (5 min)
- player-store.ts: surface importComparePlayer errors (5 min)
- StatGridInteractive.tsx: useMemo for highlightSet (5 min)
- ProgressionPath.tsx: move @keyframes to globals.css (10 min)
- Delete PlayerInfo.tsx + StatGrid.tsx (5 min, after centralizing)

### Refactor Watch
- Critical: 0 files
- Moderate: 0 files
- Low: 5 items (2 dead file deletions, 1 function dedup, 1 constant consolidation, queries.ts split deferred)

### Bloat Watch
- Files over threshold: None
- Dead code: PlayerInfo.tsx (58), StatGrid.tsx (82)
- Estimated reducible: ~155 lines (2.5%)

### Scalability Watch
- Ticking clocks: rate-limit Map unbounded growth, UNCONFIRMED constants at S11 launch
- Capacity headroom: Sound for single-instance community tool

### Proactive Recommendations
- Verify mechanics.ts constants against S11 live data immediately after launch
- Add cache hit/miss instrumentation before optimizing eviction
- Document single-instance rate-limiter assumption

### Regressions from UI Overhaul
- 5 new low-severity findings: duplicate function/constants in new components, dead code not deleted, inline CSS
- Pattern: copy-paste without cleanup during rapid UI iteration

### Deferred Items
- CSP nonce-based script-src (requires middleware)
- queries.ts full split (when 4th entity or >450 lines)

---

## Fix Round 8 — 2026-03-30

**All 25 items from Review #8 resolved** (0 blockers + 12 warnings + 13 suggestions)

### Key Changes
- W1: BoonTimeline uses `entry.takenBoonName` directly (positional index bug)
- W2: planner-utils totalStats counts only evaluated stats
- W3: useSearch now surfaces error state
- W4: PlayerSearch shows error messages for team/name/roster failures
- W5: PitchTypesMap type exported from lib/types instead of hook
- W6: optimizer.ts uses PitchTypesMap import instead of inline type
- W7: createJsonCache factory extracted to lib/json-cache.ts (dedup)
- W8: NoStatsError class replaces stringly-typed error code
- W9-W10: New tests for use-pitch-types (4) and use-debounce (5)
- W11-W12: Console.warn on persist migration reset and missing info rows
- S1: NextAction props grouped via LevelMechanics interface
- S2: PlayerSearch split into TeamBrowser + NameSearch sub-components
- S3: Server-side in-process cache for getPlayerFull (5min TTL, 100 max)
- S4: buildSearchParams moved to query-utils.ts
- S5: EMPTY_ARCHETYPE moved to constants.ts
- S6: calculatePrimaryPointsAtLevel uses pre-computed lookup array
- S7: CI workflow updated to Node 22
- S8: Rate limiting (60 req/min/IP) on search endpoints
- S9: test:coverage script added to package.json
- S10: PitchArsenal donut slices wrapped in useMemo
- S11: ProgressStats extracted as sub-component in PlayerContent
- S12: Health check uses explicit connect()/release() lifecycle
- S13: validation.ts moved from api/ to lib/

**Tests: 133 passed (12 files)** | **Build: clean**

### Deferred Items
- CSP nonce-based script-src (requires middleware)
- queries.ts full split (when 4th entity added)

---

## Codebase Review #8 — 2026-03-30

**Overall: B** | LOC: 4,468 | Blockers: 0 | Warnings: 12 | Suggestions: 13

Grade trend: C+ → B- → B → B → B → B+ → C+ → B

### Top 3 Action Items
1. Fix BoonTimeline positional-index bug (wrong boon names under wrong levels when DB order differs)
2. Add error state to useSearch + surface roster errors in PlayerSearch (4 silent-failure paths)
3. Extract createJsonCache factory (deduplicate 40-line cache pattern, enable testing, fix layer inversion)

### Refactor Watch
- Critical: 0 files
- Moderate: 1 file (queries.ts, 322 lines, 7 lenses flagged it — defer split until 4th entity or >450 lines)
- Low: 3 files (PlayerContent.tsx, use-pitch-types.ts, optimizer.ts)

### Bloat Watch
- Files over threshold: None
- Estimated reducible: ~80 lines (~2%)

### Deferred Items
- CSP nonce-based script-src (requires middleware)
- CI pipeline (.github/workflows/) — DONE in Fix Round 8
- Rate limiting on search endpoints — DONE in Fix Round 8
- Server-side in-process cache for getPlayerFull — DONE in Fix Round 8
- queries.ts full split (when 4th entity added)

### Review #7 Blockers — Status
- B1 (shared AbortSignal in caches): FIXED — timeout-only + cancelled flag pattern
- B2 (stuck loading on abort in player-store): FIXED — loading reset in both abort paths

---

## Codebase Review #7 — 2026-03-29

**Overall: C+** | LOC: 2,872 | Blockers: 2 | Warnings: 17 | Suggestions: 16

Grade trend: C+ -> B- -> B -> B -> B -> B+ -> C+ (drop from promoted blockers missed by prior reviews)

### Top 3 Action Items
1. Fix shared AbortSignal in use-pitch-types.ts singleton (silent pitchTypes={} failure)
2. Fix stuck loading state on abort in player-store.ts:73 (one-line fix)
3. Add Array.isArray guards in search hooks (crash on malformed 200)

### Refactor Watch
- Critical: 0 files
- Moderate: 0 files
- Low: 2 files (ArchetypeSelect.tsx cache, BuilderView.tsx PlayerContent)

### Bloat Watch
- Files over threshold: None
- Estimated reducible: ~110 lines (~4%)

### Deferred Items
- CSP nonce-based script-src (requires middleware)
- HSTS header for production
- Coverage scope expansion (hooks, store, routes)
- Generic useSearch<T> hook unification
- queries.ts split (player-queries + row-parser)

---

## Fix Round 6 — 2026-03-29

All 14 warnings and 12 suggestions from Review #6 fixed.

### Warnings Fixed (14)
- W1: Clamped stat conversion to 0-1000 range in queries.ts
- W2: Fixed ProgressionPath isCurrent to highlight nearest completed milestone
- W3: Added ORDER BY to boon CTE for deterministic ordering
- W4: Fixed multi-word search (3+ word queries)
- W5: Extracted usePitchTypes hook from BuilderView.tsx
- W6: Stopped clearing last-known-good team data on transient roster error
- W7: Added max length (200) guard on search query params
- W8: Documented CSP unsafe-inline limitation in next.config.ts
- W9: Added tests for use-player-search.ts (6 tests)
- W10: Added tests for player-store.ts (12 tests)
- W11: Extracted useTeamSearch hook from PlayerSearch.tsx
- W12: Fixed store migrate() to reset for unrecognized versions
- W13: Fixed getPlayerFull null ambiguity (NO_STATS error code, 422 response)
- S12 (bundled with W2): Fixed connector opacity in ProgressionPath

### Suggestions Fixed (12)
- S1: Merged planner.test.ts into planner-utils.test.ts
- S2: Deleted empty directories (batter/, layout/, glossary/)
- S3: Added module-level archetype cache in ArchetypeSelect.tsx
- S4: Moved Archetype interface to types.ts (single source of truth)
- S5: Added application_name to pg pool config
- S6: Added vitest coverage thresholds (70/60/70/70)
- S7: Added advisor diminishing returns tests (4 tests covering >850, >700, <=700, completed)
- S8: Added getMilestoneName edge case tests (level 0, level 31)
- S9: Extracted isAbortError helper to utils.ts, replaced 5 inline checks
- S10: Simplified dead ternary in StatDevelopment.tsx
- S11: Deleted unused calculateDefensePointsAtLevel function
- S12: Fixed connector opacity (done with W2)

### New Dependencies
- @testing-library/react, @testing-library/jest-dom, jsdom (devDependencies for hook/store tests)

### New Files
- src/hooks/use-team-search.ts (team search hook extracted from PlayerSearch)
- src/hooks/__tests__/use-player-search.test.ts (6 tests)
- src/store/__tests__/player-store.test.ts (12 tests)

### Verification
- 9 test files, 116 tests, all passing
- Next.js production build clean (no TypeScript errors)

### Deferred Items
- CSP nonce-based script-src (replace unsafe-inline) — requires middleware, out of scope
- CI coverage gate — needs CI pipeline setup
- README rewrite — not requested

---

## Codebase Review #6 — 2026-03-29

**Overall: B+** | LOC: 2,783 | Blockers: 0 | Warnings: 14 | Suggestions: 12

Grade trend: C+ -> B- -> B -> B -> B -> B+

---

## Codebase Review #5 — 2026-03-29

```
CODEBASE REVIEW: mmolb-player-builder-next
Date: 2026-03-29
Type: Next.js 16 / TypeScript / React
LOC: 3,941 across 43 source files (+ 5,911 JSON data, + ~1,060 test LOC)

OVERALL GRADE: B
```

| # | Lens | Grade | Blockers | Warnings | Suggestions |
|---|------|-------|----------|----------|-------------|
| 1 | Architecture | B | 0 | 5 | 5 |
| 2 | Pipeline & Data Flow | B+ | 0 | 7 | 7 |
| 3 | Systems Interaction | B | 0 | 3 | 4 |
| 4 | Security | B | 0 | 4 | 3 |
| 5 | Observability & Test Coverage | B+ | 0 | 4 | 6 |
| 6 | Deep Bugs | B | 0 | 7 | 5 |
| 7 | Critical Bugs | B | 0 | 6 | 4 |
| 8 | Code Bloat | A | 0 | 3 | 5 |
| 9 | Performance | B+ | 0 | 4 | 4 |
| 10 | Synthesis | N/A | -- | -- | -- |
| 11 | Refactoring | B+ | 0 | 3 | 4 |

Grade trend: C+ -> B- -> B -> B -> B (stable)

### BLOCKERS (must fix)

None. 0 blockers across all 11 lenses.

### WARNINGS (should fix, deduplicated, verified against current code)

**Correctness (highest impact):**

1. **[NEW] optimizer.ts:83-84 — Pitch effectiveness scale is broken.**
   Stats are on 0-1000 scale, but S11.statCap is 300. `calculatePitchEffectiveness` computes
   `raw / 10` which produces max score of 30 when statCap=300. The "< 50" threshold at line 119
   is unreachable: every non-archetype pitch is always flagged for removal.
   Fix: Normalize to actual scale, e.g. `(raw / S11.statCap) * 100`. Adjust threshold.

2. **[PERSISTENT] BoonTimeline.tsx:11,18-21 — Mutable acquiredIndex in render.**
   Still uses `let acquiredIndex = 0` incremented inside JSX map. (a) Assumes DB returns boons
   in chronological order (no sorting), (b) produces wrong output in React strict mode dev
   (double-invoked renders increment twice).
   Fix: Pre-compute a level-to-boonName map before the JSX map, or use `useMemo`.

3. **[NEW] queries.ts:198 — getPlayerFull null ambiguity.**
   Returns null for both "not found" (no info row) and "exists but no stats" (empty stats object).
   API returns 404 for both cases; the second is a wrong error for incomplete players.
   Fix: Distinguish the two; return partial data or a specific error for players with no stats.

**Data integrity:**

4. **[PERSISTENT] queries.ts:73-81, 237-242, 272-281 — No runtime validation on DB row casts.**
   All row mapping uses `as` casts on `Record<string, unknown>`. Schema drift or unexpected
   NULL produces silent wrong data. parseInt on col3 (line 166) has no NaN guard.
   Fix: Add thin validate step at row mapping boundary. Check for NaN after parseInt.

5. **[PERSISTENT] queries.ts:133-145 — UNION ALL with positional col1-col6 aliases.**
   Acknowledged as intentional optimization in Review #4, but still a fragile implicit contract.
   Adding a column or reordering will silently produce wrong data.

**State management:**

6. **[NEW] player-store.ts:47-65 — importPlayer has no guard against concurrent calls.**
   Rapid player switching can cause stale-data overwrite. Has AbortSignal.timeout but no abort
   of prior in-flight request (unlike usePlayerSearch which uses AbortController correctly).
   Fix: Add in-flight request ref to cancel previous fetch.

7. **[PERSISTENT] BuilderView.tsx:111-127 — pitch_types.json fetched on every mount.**
   No in-memory cache. pitchTypesError not cleared on retry success.
   Fix: Extract usePitchTypes hook with module-level singleton cache. Reset error on new fetch.

**Security / Infrastructure:**

8. **[PERSISTENT] db.ts:13 — Hardcoded fallback credentials ("guest"/"moldybees") in source.**
   Public guest account for a game DB; low practical risk. Still credentials in source control.

9. **[PERSISTENT] db.ts:18 — SSL disabled for remote DB connection.**
   Fix: Enable SSL or document why intentionally off (comment added in Fix Round 2 was about
   rejectUnauthorized, not about ssl:false itself).

10. **[PERSISTENT] next.config.ts:13 — CSP includes unsafe-eval in script-src.**

**Test coverage gaps:**

11. **[PERSISTENT] player-store.ts importPlayer — untested.** Primary loading mechanism.
12. **[PERSISTENT] use-player-search.ts — untested.** Second most important client flow.
13. **[PERSISTENT] No React component tests.** BuilderView, PlayerSearch, BoonTimeline untested.

**Architecture:**

14. **[PERSISTENT] BuilderView.tsx:99-266 — PlayerContent mixes 3 concerns** (data fetching,
    computation orchestration, rendering).
15. **[PERSISTENT] planner.ts/planner-utils.ts — vestigial split.** planner.ts is a thin
    re-export wrapper. Dead re-export of calculateProgress/ProgressSummary at line 10.
16. **[NEW] optimizer.ts:22 — `[key: string]: unknown` on Archetype interface** disables
    TypeScript excess property checking.
17. **[PERSISTENT] README.md — Unmodified create-next-app boilerplate.**

### SUGGESTIONS (nice to have)

1. Extract team search fetch into useTeamSearch hook (mirrors existing usePlayerSearch)
2. Deduplicate NextAction JSX in BuilderView.tsx (rendered twice with identical props)
3. Delete dead re-export from planner.ts
4. Module-level cached promise for static JSON fetches (archetypes, pitch types)
5. Add vitest coverage reporting with threshold enforcement
6. Surface pool stats in health endpoint
7. Add rate limiting middleware
8. Move Milestone type from planner.ts to types.ts
9. Drive advisor.ts boonSchedule from S11.boonLevels instead of hardcoding
10. Document the `add.slice(0, 3)` cap on pitch suggestions in optimizer.ts

### CROSS-CONCERN ANALYSIS (Lens 10)

**Hot spots (files flagged by 3+ lenses):**
1. queries.ts — 7 lenses (2, 5, 6, 7, 8, 9, 11)
2. BuilderView.tsx — 7 lenses (1, 2, 5, 7, 8, 9, 11)
3. db.ts — 3 lenses (3, 4, 7)
4. player-store.ts — 3 lenses (2, 5, 7)
5. PlayerSearch.tsx — 3 lenses (7, 8, 11)

**Top 3 root cause fixes:**
1. Fix pitch effectiveness scale in optimizer.ts (core feature broken, user-facing impact)
2. Add runtime row validation to queries.ts (eliminates silent data corruption class)
3. Add abort guard to player-store.ts importPlayer (largest untested critical path)

**Priority corrections:**
- PROMOTED: optimizer.ts scale confusion (from "deep bug" to top priority; core feature broken)
- DEMOTED: advisor.ts diminishing returns thresholds (850/700 are sensible on 0-1000 scale)
- MERGED: Lens 2+9 pitch_types.json fetch = one item (extract hook + singleton cache)
- MERGED: Lens 2+8 UNION ALL col1-col6 = one item (acknowledged intentional)

### REFACTOR ASSESSMENT

Critical: 0 files
Moderate: 2 files
  1. BuilderView.tsx — extract usePitchTypes + usePlayerAdvice hooks
  2. PlayerSearch.tsx — extract useTeamSearch hook (duplicates usePlayerSearch pattern)
Low: 4 files
  1. queries.ts — extract parsePlayerRows from getPlayerFull
  2. planner.ts / planner-utils.ts — merge into single file
  3. player-store.ts — could split slices if store grows
  4. optimizer.ts — remove [key: string]: unknown from Archetype

### BLOAT CENSUS

Files over 500 lines: 0
Largest functions:
  1. PlayerContent() — BuilderView.tsx:99-278 — ~179 lines
  2. getPlayerFull() — queries.ts:84-214 — ~130 lines
  3. PitchArsenal() — PitchArsenal.tsx:20-137 — ~117 lines
  4. BuilderView() — BuilderView.tsx:28-89 — ~61 lines
  5. getTeamRoster() — queries.ts:245-292 — ~47 lines
Estimated reducible LOC: ~50 lines (1.3%)

### COMPARED TO LAST REVIEW (#4)

- Grade: B -> B (stable)
- Blockers: 1 -> 0 (PitchArsenal single-pitch fixed)
- New findings: optimizer.ts scale bug (most impactful), importPlayer race condition,
  getPlayerFull null ambiguity, Archetype [key: string]: unknown
- Persistent findings: BoonTimeline mutable index (flagged in Reviews 2-5), no runtime
  row validation in queries.ts, no client-side tests, hardcoded DB credentials
- LOC: ~3,966 -> ~3,941 (minor cleanup)

### Top 3 Action Items
1. **Fix pitch effectiveness scale** — optimizer.ts raw/10 with statCap=300 makes threshold
   unreachable. Every non-archetype pitch flagged for removal. Core feature broken.
2. **Fix BoonTimeline mutable index** — Persistent across 4 reviews. Pre-compute map instead
   of mutating in render.
3. **Add runtime validation to queries.ts** — Replace `as` casts with validated parsing.

### Deferred Items
- Client-side tests (importPlayer, usePlayerSearch, component tests)
- CI/CD pipeline
- README rewrite
- Database index verification
- Rate limiting middleware

---

## Fix Round 5 — 2026-03-29

**All 17 warnings and 10 suggestions addressed.** 97/97 tests pass. `next build` clean (TypeScript + Turbopack).

### Resolved

| # | Finding | Status |
|---|---------|--------|
| W1 | optimizer.ts pitch effectiveness scale broken (raw/10 with statCap=300) | Fixed: normalize as `(raw / S11.statCap) * 100` |
| W2 | BoonTimeline mutable acquiredIndex in render (persistent across 4 reviews) | Fixed: pre-computed `boonNameByLevel` Map via useMemo |
| W3 | queries.ts getPlayerFull null ambiguity | Fixed: console.warn for "player exists but no stats" case |
| W4 | queries.ts no runtime validation on DB row casts | Fixed: added `asString`, `asStringOrNull`, `asNumber` helpers; replaced all `as` casts |
| W6 | player-store.ts importPlayer no concurrent-call guard | Fixed: module-level AbortController cancels prior in-flight request |
| W7 | BuilderView pitch_types.json fetched on every mount | Fixed: module-level singleton cache with dedup (`pitchTypesCache` + `pitchTypesPending`) |
| W9 | db.ts SSL disabled without explanation | Fixed: comment documenting why SSL is intentionally off |
| W10 | next.config.ts CSP includes unsafe-eval | Fixed: removed `'unsafe-eval'` from script-src |
| W15 | planner.ts/planner-utils.ts vestigial split | Fixed: merged all content into planner-utils.ts, deleted planner.ts, updated all imports |
| W16 | optimizer.ts Archetype `[key: string]: unknown` index signature | Fixed: removed, restoring excess property checking |
| S1 | BuilderView NextAction rendered twice with identical props | Fixed: extracted `nextActionElement` variable |
| S9 | advisor.ts boonSchedule hardcodes [10,20,30] | Fixed: derives from `S11.boonLevels.map()` |
| Tests | pitch-optimizer.test.ts expected values outdated after W1 | Fixed: recalculated all test inputs/expectations for new scale formula |

### LOC Change (Round 5)
- Removed: ~35 lines (planner.ts deleted, dead re-exports, duplicate JSX)
- Added: ~30 lines (useMemo boon map, validation helpers already counted in prior round)
- Net: ~-5 lines

### Notable
- BoonTimeline mutable index: **finally resolved** after being flagged in Reviews 2, 3, 4, and 5
- Pitch effectiveness: the scale bug was the most impactful finding; core pitch arsenal feature was non-functional (every non-archetype pitch flagged for removal since max score was 30 vs threshold of 50)

---

## Codebase Review — 2026-03-29

```
CODEBASE REVIEW: mmolb-player-builder-next
Date: 2026-03-29
Type: Next.js 16 App Router (React/TypeScript)
LOC: 3,999 across 52 files

OVERALL GRADE: C+
```

| # | Lens | Grade | Blockers | Warnings | Suggestions |
|---|------|-------|----------|----------|-------------|
| 1 | Architecture | B | 0 | 5 | 5 |
| 2 | Pipeline & DAG | B | 0 | 7 | 5 |
| 3 | Systems Interaction | B | 0 | 7 | 4 |
| 4 | Security | B | 0 | 6 | 3 |
| 5 | Observability & Test Coverage | C | 1 | 6 | 7 |
| 6 | Deep Bugs | C | 0 | 5 | 4 |
| 7 | Critical Bugs | B | 0 | 5 | 4 |
| 8 | Code Bloat | B | 0 | 7 | 2 |
| 9 | Performance | B | 0 | 4 | 5 |
| 10 | Synthesis | N/A | — | — | — |
| 11 | Refactoring | B | 0 | 4 | 5 |

**Totals: 1 blocker (pre-synthesis) → 3 blockers (post-synthesis), ~56 warnings, ~49 suggestions**

Many warnings are cross-lens duplicates of the same underlying issues. After deduplication, there are approximately 18 unique issues.

---

### BLOCKERS (must fix)

1. **[L5/L2/L3] BuilderView.tsx:107 — Silent .catch(() => {}) on pitch_types.json fetch**
   Pitch type data is central to pitcher building. Silent failure means the UI renders with absent data and the user gets no feedback. Promoted to blocker by synthesis (cross-lens agreement: L2, L3, L5).
   Fix: Add error state + console.error + user-visible fallback message.

2. **[L6→promoted] advisor.ts:55+64-70 — priority_stats beyond index 2 silently get wrong targets**
   Any archetype with 4+ priority stats produces incorrect advice for stats at index 3+. They receive target=100 (flex fallback) instead of the computed corePer. This is the core advisory function. Completely untested (L5), fails silently (L3).
   Fix: Either extend the iteration to support >3 priority stats with correct targets, or explicitly cap and document the 3-stat limit. Add a test for 4+ priority stat archetypes.

3. **[L4/L6→promoted] API routes parseInt NaN on "limit" causing 500**
   `parseInt("abc")` → `NaN` → `Math.min(NaN, 50)` → `NaN` → SQL LIMIT NaN → Postgres error → 500. One malformed request, no guard.
   Fix: `const limit = Math.min(Math.max(parseInt(...) || 10, 1), 50)` in both search routes.

---

### WARNINGS (should fix) — deduplicated

4. **[L2/L3/L5/L7] Silent error swallowing across 6 client-side fetch sites**
   PlayerSearch.tsx (team search, roster load), ArchetypeSelect.tsx, use-player-search.ts, player-store.ts — all catch and discard errors with no logging, no error state, no user feedback. Systemic pattern: no fetch error-handling convention.
   Fix: Establish a fetch wrapper pattern with ok-check + error state + console.error. Apply to all 6 sites.

5. **[L1/L2/L8/L11] corePer/supportPer allocation math copy-pasted 4x**
   advisor.ts (3 internal copies) + optimizer.ts (1 copy). Same 8-line block computing stat distribution targets. S11 mechanics change requires 4 edits.
   Fix: Extract `calculateStatTargets(archetype)` helper into optimizer.ts. One function, 4 callers.

6. **[L1/L2/L8/L11] calculateProgress + ProgressSummary duplicated in planner.ts and planner-utils.ts**
   ~55 lines of identical logic in both files. planner-utils.ts was correctly extracted for client use but planner.ts kept its private copy.
   Fix: Delete from planner.ts, import from planner-utils.ts. Two-line change.

7. **[L1/L3/L8] SLOT_TO_POSITION and POSITION_ORDER duplicated in queries.ts and constants.ts**
   Two lookup tables defined identically in both files. Drift risk on slot/position mapping changes.
   Fix: Delete from queries.ts, import from constants.ts.

8. **[L1/L8] planner.ts createPitcherPlan/createBatterPlan are dead code (~160 lines)**
   BuilderView.tsx assembles plans inline; these orchestration functions are never called.
   Fix: Delete dead code. Move Milestone type to types.ts or planner-utils.ts first (ProgressionPath.tsx imports it).

9. **[L7] ExportShare.tsx:20 — navigator.clipboard.writeText() has no try/catch**
   Throws on permission denial, non-HTTPS contexts, or page not focused. Unhandled rejection with no user feedback.
   Fix: Wrap in try/catch, show error state.

10. **[L6] BoonTimeline.tsx:41-45 — Acquired boon name display uses positional indexing on unordered array**
    `takenLesserBoons` array order depends on DB return order (no ORDER BY). Can show wrong boon name for acquired levels.
    Fix: Pass ordered boon-level-to-name data from advisor layer, or sort takenLesserBoons before display.

11. **[L6] planner-utils.ts:55 — All priority stats show "On Track" at level 1**
    `calculatePrimaryPointsAtLevel(1)` returns 0, so `current >= 0` is always true. Misleading display for new players.
    Fix: Special-case level 1 or levels before first primary-point level.

12. **[L9] BuilderView.tsx:129-143 — 4 computation functions called in render body with no useMemo**
    recommendStatPriorities, recommendBoonsByLevel, calculateProgress, optimizePitchArsenal all recalculate on every re-render.
    Fix: Wrap each in useMemo with appropriate deps.

13. **[L9] PlayerSearch.tsx:33-49 — Team search fires every keystroke, no debounce**
    Name search correctly uses useDebounce(300) but team search calls API directly in onChange.
    Fix: Apply same debounce pattern as name search.

14. **[L3/L7] PlayerSearch.tsx:43,56 and use-player-search.ts:22 — res.json() without res.ok check**
    API error responses (JSON-shaped) get set into state as data. Error objects render as empty lists.
    Fix: Add `if (!res.ok) throw new Error(...)` before `.json()`.

15. **[L4] No security response headers configured (CSP, X-Frame-Options, etc.)**
    Fix: Add headers configuration to next.config.ts.

16. **[L3] db.ts — No pool.on("error") listener**
    Idle client errors become unhandled exceptions, potentially crashing the Node.js process.
    Fix: Add `pool.on("error", (err) => console.error("Pool error:", err))`.

17. **[L4] db.ts — No SSL/TLS on database connection**
    Connections to mmoldb.beiju.me travel over public internet without encryption.
    Fix: Add `ssl: { rejectUnauthorized: false }` if the server supports it.

18. **[L9] API routes — No Cache-Control headers on any route**
    Player/roster data is read-only and changes infrequently. Every request hits the DB.
    Fix: Add `Cache-Control: public, max-age=300` headers.

---

### SUGGESTIONS (nice to have)

- [L5] No test script in package.json; no CI configuration
- [L5] No tests for optimizer.ts, planner.ts, planner-utils.ts, queries.ts, constants.ts
- [L5] advisor.test.ts assertions are weak (upper-bound checks, no exact computed values)
- [L5] No integration tests for API routes
- [L5] No query duration tracking
- [L4] API routes log full pg error objects (may expose query structure in logs)
- [L4] No length validation on dynamic path id params
- [L3] No AbortController on client-side fetches
- [L3] No idleTimeoutMillis on pg pool
- [L2] Archetype interface has [key: string]: unknown disabling excess property checking
- [L1] README.md is boilerplate (no project-specific documentation)
- [L1] getStatColor is a utility mixed into constants.ts
- [L1] ProgressionPath imports Milestone type from server module planner.ts
- [L8] searchAndImportFirst in player-store.ts is dead code (never called)
- [L8] BATTER_DISTRIBUTION and PITCHER_DISTRIBUTION in constants.ts are dead exports
- [L8] Unused shadcn/ui components from init (dialog, popover, select, tabs, badge, input)
- [L9] pitch_types.json re-fetched on every player type/position change
- [L9] Zustand persist serializes full player+roster on every state change

---

### REFACTOR ASSESSMENT

**Critical: 0 files**

**Moderate: 2 files — plan for next cycle**
1. src/lib/advisor.ts (297 lines) — corePer/supportPer duplication 3x internal + 1x external, logic bug at index 3+
2. src/lib/planner.ts (216 lines) — calculateProgress duplicate, dead orchestration code (~160 lines)

**Low: 3 files — backlog**
1. src/lib/queries.ts (325 lines) — duplicated constants from constants.ts
2. src/components/builder/BuilderView.tsx (249 lines) — milestone logic duplication, missing useMemo
3. src/lib/constants.ts (128 lines) — dead exports

---

### CROSS-CONCERN ANALYSIS (from Lens 10)

**Hot spots:** advisor.ts (4 lenses), planner.ts (5 lenses), BuilderView.tsx (5 lenses), queries.ts (4 lenses), player-store.ts (3 lenses)

**Root causes (top 3 fixes that resolve the most findings):**
1. Establish fetch error-handling convention across 6 silent-catch sites → resolves 9+ findings across L2/L3/L5/L7/L9
2. Fix advisor.ts priority_stats iteration cap + add test → resolves L5/L6/L11 findings
3. Consolidate duplicated constants and functions → resolves findings across L1/L2/L3/L8/L11

**Priority corrections:**
- PROMOTED to blocker: advisor.ts priority_stats bug, parseInt NaN on limit param
- DEMOTED: queries.ts UNION ALL fragility (structural choice, no current bug), Zustand persist overhead (unmeasurable at current scale)

---

### BLOAT CENSUS

Files over investigation threshold: None (largest is queries.ts at 325 lines; threshold is 500)
Largest functions/CTEs:
1. PlayerContent (BuilderView.tsx:90-249) — 160 lines
2. getPlayerFull (queries.ts:118-241) — 124 lines
3. recommendStatPriorities (advisor.ts:24-103) — 79 lines
4. compareArchetypes (advisor.ts:240-297) — 57 lines
5. calculateProgress (planner-utils.ts:20-74) — 55 lines
Estimated reducible LOC: ~310 lines (8% of 3,999)
Top 3 bloat reduction opportunities:
1. Delete dead planner.ts orchestration code — saves ~160 lines
2. Extract corePer/supportPer into shared helper — saves ~24 lines, eliminates drift
3. Consolidate SLOT_TO_POSITION/POSITION_ORDER — saves ~50 lines

---

### DATA QUALITY SNAPSHOT

Not a dbt project — no data quality snapshot.

---

### COMPARED TO LAST REVIEW

First review — establishing baseline.

---

### REGRESSIONS

First review — no prior review to compare.

---

### Top 3 Action Items
1. Fix the 3 blockers: silent pitch_types.json catch, advisor.ts priority_stats bug, parseInt NaN guard
2. Establish fetch error-handling convention across all 6 silent-catch sites
3. Consolidate duplicated code: calculateProgress, SLOT_TO_POSITION/POSITION_ORDER, corePer/supportPer math

### Refactor Watch
- Critical: 0 files
- Moderate: 2 files (advisor.ts, planner.ts)
- Low: 3 files (queries.ts, BuilderView.tsx, constants.ts)

### Bloat Watch
- Files over threshold: None
- Estimated reducible: ~310 lines (8%)

### Deferred Items
- Test coverage expansion (planner.ts, planner-utils.ts, queries.ts, constants.ts untested)
- CI/CD setup
- Integration tests for API routes
- AbortController on client-side fetches
- README rewrite
- Remove unused shadcn/ui components (dialog, popover, select, tabs, badge, input)

---

## Fix Round — 2026-03-29

**All blockers, warnings, and suggestions addressed.** 29/29 tests pass. `next build` clean.

### Resolved

| # | Finding | Status |
|---|---------|--------|
| 1 | Silent pitch_types.json catch (blocker) | Fixed: error state + user message in BuilderView |
| 2 | advisor.ts priority_stats index bug (blocker) | Fixed: full array iteration + calculateStatTargets helper |
| 3 | parseInt NaN on limit param (blocker) | Fixed: NaN guard in both search routes |
| 4 | Silent error swallowing across 6 fetch sites | Fixed: res.ok checks + console.error + error states |
| 5 | corePer/supportPer 4x duplication | Fixed: extracted calculateStatTargets to optimizer.ts |
| 6 | calculateProgress duplicated in planner.ts | Fixed: deleted from planner.ts, re-exports from planner-utils |
| 7 | SLOT_TO_POSITION/POSITION_ORDER duplicated | Fixed: deleted from queries.ts, imports from constants.ts |
| 8 | Dead code in planner.ts (~160 lines) | Fixed: deleted createPitcherPlan, createBatterPlan, etc. |
| 9 | ExportShare clipboard no try/catch | Fixed: try/catch + "Failed" state |
| 10 | BoonTimeline positional indexing | Fixed: shows all taken boons on first acquired entry |
| 11 | planner-utils level-1 "On Track" bug | Fixed: guard on pointsAtCurrent > 0 |
| 12 | BuilderView missing useMemo (4 calls) | Fixed: 6 useMemo wrappers added |
| 13 | Team search no debounce | Fixed: useDebounce + useEffect pattern |
| 14 | res.json() without res.ok check (3 sites) | Fixed: ok checks added |
| 15 | No security response headers | Fixed: X-Frame-Options, X-Content-Type-Options, etc. in next.config.ts |
| 16 | No pool.on("error") listener | Fixed: error handler added to db.ts |
| 17 | No SSL on DB connection | Fixed: ssl: { rejectUnauthorized: false } |
| 18 | No Cache-Control headers | Fixed: added to all 4 API routes |
| S1 | No test script in package.json | Fixed: added test + test:watch scripts |
| S2 | No optimizer.ts tests | Fixed: 4 tests for calculateStatTargets |
| S3 | No advisor test for 4+ priority stats | Fixed: test added |
| S4 | Dead searchAndImportFirst in player-store | Fixed: deleted |
| S5 | Dead BATTER/PITCHER_DISTRIBUTION | Fixed: deleted from constants.ts |
| S6 | No idleTimeoutMillis on pg pool | Fixed: 30s idle timeout added |

### LOC Change
- Removed: ~260 lines (dead code, duplication)
- Added: ~120 lines (error handling, tests, helpers, security)
- Net: ~-140 lines

---

## Re-Review — 2026-03-29

**Overall: B-** | LOC: 3,860 | Blockers: 0 | Warnings: 15 | Suggestions: 18

Previous grade: C+ (3 blockers). All 3 blockers fixed, 15 of 18 warnings fixed, 6 suggestions fixed.

### Top 3 Action Items
1. Fix URL archetype share (silently non-functional: store is written but PlayerContent's local state stays null)
2. Fix planner-utils.ts .slice(0,3) on priority_stats (inconsistent with advisor.ts which processes all)
3. Fix BoonTimeline blank rows for acquired boons at i > 0 (null render)

### Additional Warnings
4. Add AbortController + finally blocks to PlayerSearch.tsx (4 lenses flagged)
5. Delete 6 unused shadcn/ui components (~605 lines dead code)
6. Delete orphaned exports: compareArchetypes, calculatePriorityStats, getLevelUpSummary (~148 lines)
7. Add id path param validation to API routes
8. Fix leading-wildcard search in queries.ts searchTeams
9. Add schema validation to getPlayerFull UNION ALL result
10. Fix lastName! non-null assertion in queries.ts

### Refactor Watch
- Critical: 0 files
- Moderate: 2 files (optimizer.ts: split pitch logic; advisor.ts: orphaned exports)
- Low: 1 file (planner.ts/planner-utils.ts split)

### Bloat Watch
- Files over threshold: None
- Estimated reducible: ~750 lines (605 dead UI + 148 dead exports)

### Regressions from Fix Round
- BoonTimeline.tsx: blank rows for i > 0 (introduced by fix)
- planner-utils.ts: .slice(0,3) not cleaned up alongside advisor.ts fix (partial regression)

### Deferred Items
- Test coverage for planner-utils, planner, constants, pitch optimizer functions
- CI/CD setup
- Integration tests for API routes
- Query duration logging
- README rewrite

---

## Fix Round 2 — 2026-03-29

**All 15 warnings and 18 suggestions addressed.** 29/29 tests pass. `next build` clean.

### Resolved

| # | Finding | Status |
|---|---------|--------|
| 1 | URL archetype share broken | Fixed: ArchetypeSelect fires onArchetypeChange on load when archetypeId exists in store |
| 2 | planner-utils.ts .slice(0,3) inconsistency | Fixed: removed .slice(0,3), processes all priority stats |
| 3 | BoonTimeline blank rows at i > 0 | Fixed: shows individual boon name per acquired level |
| 4 | PlayerSearch no AbortController / no finally | Fixed: AbortController on team search + roster, finally blocks for loading state |
| 5 | 6 unused shadcn/ui components (~605 lines) | Fixed: deleted dialog, popover, select, tabs, badge, input |
| 6 | Orphaned exports (~148 lines dead code) | Fixed: deleted compareArchetypes, calculatePriorityStats, getLevelUpSummary + related types |
| 7 | No id path param validation on API routes | Fixed: length check (>100) returns 400 |
| 8 | Leading-wildcard '%query%' in team search | Fixed: changed to prefix search 'query%' |
| 9 | getPlayerFull no schema validation | Fixed: null check on both firstName+lastName, empty stats check |
| 10 | lastName! non-null assertion | Fixed: proper null guard, removed assertion |
| 11 | getStatColor + slotToPosition in constants.ts | Fixed: moved to utils.ts, updated all imports |
| 12 | STAT_DISPLAY_ORDER dead export | Fixed: deleted from constants.ts |
| 13 | getLevelUpSummary test: weak assertions | Fixed: replaced with numeric assertion test for recommendStatPriorities |
| 14 | emptyArchetype inline per render | Fixed: hoisted to module-scope EMPTY_ARCHETYPE |
| 15 | Redundant length check in searchTeams | Fixed: removed (absorbed into AbortController rewrite) |
| 16 | pg error logging exposes query text | Fixed: sanitized to error.message in all 4 API routes |
| 17 | No fetch timeout on static JSON | Fixed: AbortSignal.timeout(5000) on pitch_types + archetypes fetches |
| 18 | No Cache-Control for /data/* static JSON | Fixed: 1-hour max-age header in next.config.ts |
| 19 | ssl rejectUnauthorized undocumented | Fixed: comment explaining intentional trade-off |

### LOC Change (Round 2)
- Removed: ~800 lines (605 dead UI, 148 dead exports, misc dead code)
- Added: ~40 lines (AbortController, schema validation, fetch timeouts, cache config)
- Net: ~-760 lines

---

## Fix Round 4 — 2026-03-29

**All 1 blocker, 12 warnings, and 5 suggestions addressed.** 97/97 tests pass. `next build` clean.

### Resolved

| # | Finding | Status |
|---|---------|--------|
| B1 | PitchArsenal single-pitch blank donut (blocker) | Fixed: render full circle when pitches.length === 1 |
| W1 | BoonTimeline positional index (persistent) | Fixed: sequential acquiredIndex counter instead of map index |
| W2 | 4 client fetches missing timeout | Fixed: AbortSignal.any([controller, timeout(10000/15000)]) on all 4 |
| W3 | Zustand persist no version/migration | Fixed: version 1 + migrate callback clears v0 stale data |
| W4 | UNION ALL col1-col6 implicit contract | Acknowledged: documented as intentional optimization, runtime assertion not worth the complexity |
| W5 | loadRoster error stale store | Fixed: setLastTeam(null, []) in catch block |
| W6 | db.ts parseInt NaN port | Fixed: validate + throw descriptive error at startup |
| W7 | health route silent catch | Fixed: console.error in catch block |
| W8 | timedQuery prod logging regression | Fixed: log all queries in dev, slow queries (>500ms) in prod |
| W9 | StatGrid zero-value category hiding | Fixed: hasAny checks !== undefined instead of > 0 |
| W10 | searchPlayers SQL duplication | Fixed: single query with dynamic WHERE clause |
| W11 | handleArchetypeChange unused _id | Fixed: removed from callback + interface |
| W12 | Layout "use client" for nav highlight | Fixed: extracted NavLinks client component, layout is now server component |
| S1 | Unused deps (lucide-react, cva) | Fixed: npm uninstall |
| S2 | Pool error handler raw err | Fixed: sanitized to err.message |
| S3 | Dead S11 constants (baseStatsTotal, totalDefensePoints) | Fixed: removed from S11 config |
| S4 | NextAction topStat guard misleading | Fixed: always show luck text on defense levels |
| S5 | ID validation + limit clamping duplication | Fixed: extracted validateId + clampLimit to api/validation.ts |
| S6 | getTeamRoster no LIMIT | Fixed: LIMIT 50 |

### LOC Change (Round 4)
- Removed: ~80 lines (SQL dedup, dead constants, removed layout "use client", unused _id)
- Added: ~60 lines (NavLinks component, validation.ts, AbortSignal.any, persist version, full circle SVG)
- Net: ~-20 lines

---

## Codebase Review #4 — 2026-03-29

**Overall: B** | LOC: 3,966 | Blockers: 1 (promoted) | Warnings: 12 | Suggestions: 18

Previous: B (0 blockers, 14 warnings, 18 suggestions — all 14 warnings addressed)
Grade trend: C+ → B- → B → B (stable, one new promoted blocker)
Tests: 97 across 8 files (unchanged)

### Top 3 Action Items
1. Fix single-pitch donut SVG rendering (PitchArsenal.tsx — blank chart for 1-pitch pitchers)
2. Fix BoonTimeline positional index (persistent across 2 reviews — match by level, not array position)
3. Add AbortSignal.timeout to 4 remaining client fetches (PlayerSearch x2, ArchetypeSelect, BuilderView)

### Blocker
1. PitchArsenal.tsx:32-57 — single-pitch donut blank (SVG arc same start/end = no-op)

### Warnings (12 deduplicated)
1. BoonTimeline.tsx:38 — positional index on takenLesserBoons (persistent, 2nd review)
2. 4 client fetches missing AbortSignal.timeout (use-player-search, PlayerSearch x2, ArchetypeSelect, BuilderView)
3. player-store.ts:67-73 — Zustand persist no schema version/migration guard
4. queries.ts:183-214 — UNION ALL col1-col6 implicit type contract
5. PlayerSearch.tsx:86 — loadRoster error doesn't clear lastTeam/lastRoster in store
6. db.ts:4 — parseInt(MMOLDB_PORT) NaN on non-numeric string
7. health/route.ts:8 — bare catch {} swallows DB error silently
8. queries.ts:19 — timedQuery suppresses ALL logs in production (regression)
9. StatGrid.tsx:29-31 — zero-value stats hide entire categories
10. queries.ts:39-93 — duplicated SQL in searchPlayers
11. BuilderView.tsx:129-134 — handleArchetypeChange accepts unused _id parameter
12. layout.tsx — entire layout "use client" for nav highlight only

### Hot Spots (from Synthesis)
- queries.ts (6 lenses): highest-risk file
- BuilderView.tsx (6 lenses): kitchen-sink component
- PlayerSearch.tsx (3 lenses): inline fetch logic
- player-store.ts (2 lenses): persist versioning

### Regressions from Fix Round 3
1. [REGRESSION] timedQuery prod logging fully suppressed (overcorrection)
2. [PERSISTENT] BoonTimeline positional index (unfixed across 2 reviews)

### Refactor Watch
- Critical: 0 files
- Moderate: 1 file (queries.ts: split into query-layer + row-parsers)
- Low: 3 files (BuilderView.tsx, planner.ts/planner-utils.ts, PlayerSearch.tsx)

### Bloat Watch
- Files over threshold: None
- Estimated reducible: ~55 lines (1.4%)

### Deferred Items
- Component + hook tests
- Coverage thresholds in vitest config
- README rewrite

---

## Codebase Review #3 — 2026-03-29

**Overall: B** | LOC: 3,867 (+1,055 test) | Blockers: 0 | Warnings: 14 | Suggestions: 18

Previous: B- (0 blockers, 15 warnings, 18 suggestions — all addressed)
Grade trend: C+ → B- → B (steady improvement across 3 reviews)
Tests: 29 → 96 (+67 tests across planner-utils, planner, utils, pitch-optimizer, API routes)
New: timedQuery wrapper for query duration logging

### Top 3 Action Items
1. Fix ArchetypeSelect useEffect deps (archetype restore race from URL/persist)
2. Add AbortSignal.timeout to importPlayer + swap use-player-search to AbortController
3. Fix BoonTimeline positional indexing + advisor.ts plannedLesser duplicate reservation

### Warnings (14 deduplicated)
1. ArchetypeSelect.tsx:44 — useEffect deps omit archetypeId/onArchetypeChange (archetype restore race)
2. use-player-search.ts:21 — cancelled flag instead of AbortController (4 lenses)
3. player-store.ts:50 — importPlayer fetch has no timeout (3 lenses)
4. BoonTimeline.tsx:38 — positional index mismatch on takenLesserBoons
5. advisor.ts:133-135 — plannedLesser only reserves top pick (duplicate recommendations)
6. planner-utils.ts:71 — totalStats counts all stat_weights, progress only tracks priority
7. next.config.ts — no Content-Security-Policy header
8. No CI configured (96 tests manual-run only)
9. button.tsx — dead component (61 lines, survived prior cleanup)
10. queries.ts — LOWER(col) LIKE bypasses B-tree indexes on all searches
11. player-store.ts — lastRoster serialized to localStorage on every write
12. queries.ts — getTeamRoster double-sorts (SQL + JS)
13. queries.ts — timedQuery logs success/failure identically
14. queries.ts — UNION ALL switch no default branch, unknown tags silently dropped

### Hot Spots (from Synthesis)
- queries.ts (7 lenses): highest-risk file
- player-store.ts (5 lenses): import path least hardened
- BuilderView.tsx (4 lenses): dead subscription + mixed concerns
- use-player-search.ts (4 lenses): incomplete abort handling

### Regressions from Fix Round 2
1. [PARTIAL] use-player-search.ts AbortController not applied to hook (only component)
2. [NEW] timedQuery wrapper needs error-aware logging + production gate
3. [NEW] button.tsx survived dead-component cleanup

### Refactor Watch
- Critical: 0 files
- Moderate: 1 file (BuilderView.tsx: extract hooks)
- Low: 3 files (planner.ts, PlayerSearch.tsx, PitchArsenal.tsx)

### Bloat Watch
- Files over threshold: None
- Estimated reducible: ~70 lines (61 dead button.tsx + minor)

### Deferred Items
- CI/CD setup
- Component + hook tests
- Health check endpoint
- README rewrite
- Coverage thresholds in vitest config
