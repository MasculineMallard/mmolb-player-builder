# Fix Round — Review #10 (2026-06-01)

Final verification (all green): `npm run build` ✓ compiles + TypeScript passes (2.2s) · `npm run test` ✓ 158 tests (13 files) · `npm run lint` ✓ 0 errors (16 pre-existing warnings, no new ones).

**Second pass (2026-06-01, same day): all remaining deferred Phase 3/4 structural work implemented.** See "Phase 3 — second pass" and "Phase 4 — second pass" below. Visual output still needs a Railway preview to QA (project rule: no local dev server).

## Phase 0 — DONE ✅
- **Blocker 1** (empty percentile table white-screen): `percentileToScore` returns 50 for empty table; `computeStatsScore` skips empty tables; `percentile-builder` omits empty tables before `validate()`. (Chose "omit empty + guard" over "add SB_PCT to required keys" — the latter would wrongly reject good early-season data since SB% is legitimately sparse early.)
- **Blocker 2**: created `src/app/error.tsx`, `not-found.tsx`, `global-error.tsx`.
- **Composite-weight drift**: `COMPOSITE_WEIGHTS` + `getCompositeWeights` single source in evaluator-data; `computeComposite` and `player-detail.WeightedBreakdown` both consume it. (player-detail batter weights now match engine 20/40/20/20.)
- **VERDICT_ORDER**: `RECOMMENDATION_ORDER` (5 verdicts) in evaluator-types; roster-table uses it (was stale 3-tier; "sort by verdict" now works for all tiers).
- item-advisor: strip trailing position index (`SS1`→`SS`) before defense lookup.
- radar-chart: `useMemo` for labels/t1Set/maxVal (stops redraw-every-render).
- shadcn → devDependencies.
- `checkRateLimit` added to `/api/percentiles/refresh`.
- Deleted dead code: `generateShopSummary`, H9 table + `GameStats.H9`, `LOWER_IS_BETTER`.
- `console.warn` on 3 silent catches: loadFromDisk, resolveTeamMeta, loadLivePercentiles.
- mulch fan-out: bounded concurrency (8).

## Phase 1 — DONE ✅
- New `src/lib/__tests__/evaluator.test.ts` (15 tests): percentileToScore empty guard, computeStatsScore skip-empty, computeComposite, getRecommendation thresholds, getCompositeWeights sums, weight-sum=1.0. Exported `computeComposite` + `getRecommendation` for testability.
- Deleted dead `queries.ts` functions (`getPlayerFull`/`getTeamRoster`/`getTeamRosterLight` + `parsePlayerRows` + local playerCache) — confirmed zero importers; pruned unused imports. queries.ts now = timedQuery + searchPlayers + searchTeams.

## Phase 2 — DONE ✅ (resolved via live mmolb.com fixture capture)
- **Q1 (AppliedLevelUps vs ScheduledLevelUps)**: extracted shared `buildBaseStatMap` from the screenshot-verified mmolb-transform; percentile-builder now uses it (was reading `AppliedLevelUps`, which either double-counts points already in BaseAttributeBonuses or drops scheduled ones). Confirmed against live API: `BaseAttributeBonuses` is the comprehensive source; both level-up arrays empty on a maxed player.
- **Q2 (flat-vs-nested Stats)**: FALSE POSITIVE — verified the `/api/team` endpoint returns FLAT `Players[].Stats` (statName→int), so `runRefresh` is correct. The `/api/player` endpoint is nested-by-team (which is why the transform flattens it). No change needed.

## Phase 3 — PARTIAL ✅/⏳
DONE (build-verified):
- Archetype-fit formula consolidated into `optimizer.computeArchetypeFitPct` (was duplicated 3× in evaluator/ArchetypeSelect/PlayerContent — confirmed identical). Pruned now-unused `calculateFitTargets` imports.
- `buildBaseStatMap` consolidation (done in Phase 2).
- Atomic disk write in percentile-builder (temp + rename).

DONE in first pass (build-verified):
- Archetype-fit formula consolidated; `buildBaseStatMap` consolidation; atomic disk write (see Phase 2).

## Phase 3 — second pass — DONE ✅ (build + test + lint green; visual QA pending on Railway preview)
- **Scheduler → instrumentation**: moved the import-time `setInterval`/`setTimeout` block out of `percentile-builder.ts` into an exported `startPercentileScheduler()` (idempotent via a `schedulerStarted` guard, production-gated as before). New `src/instrumentation.ts` `register()` calls it on the `nodejs` runtime only. Verified Next compiled it: `.next/server/instrumentation.js` emitted with an nft trace, so `register()` runs at boot. ⚠️ The *daily-refresh actually firing* in prod still needs a Railway log check (`[percentiles]` startup line). Net effect: importing the module for `getCachedPercentiles` (e.g. the health route) no longer side-effects a scheduler.
  - *Optional compute/cache module split:* NOT done — explicitly optional, low value for the single Railway instance; would add churn without verifiable benefit.
- **Shared `DurabilityPips`** → `src/components/ui/durability-pips.tsx`. Replaces 4 copies (roster-table, player-row, PlayerContent, ShopView). ⚠️ The copies were NOT identical: the evaluator table renders healthy pips **green** (`--chart-3`), the builder/shop headers render them **blue** (`--scale-good`). Preserved both exactly via a `goodColor` prop (default blue; eval table passes green). This green↔blue split is likely unintended drift — flagged for the user to decide whether to unify.
- **Shared `PlayerHeader`** → `src/components/builder/PlayerHeader.tsx`. Reconciles the ~75-LOC near-dup between PlayerContent and ShopView via props (`onChangePlayer`/`searchOpen`, `positionValue`+`onPositionChange`, `showPitcherPositionLabel`). Markup reproduced verbatim; `player` and `positionValue` passed separately so each parent's exact team-bar-vs-dropdown position behavior is preserved.
- **MulchView extraction**: `mulch/page.tsx` is now a thin wrapper → `src/components/evaluator/mulch-view.tsx`. Inline debounced/aborted team search replaced with the existing `useTeamSearch` hook. Markdown `copyReport` pulled into `src/lib/evaluator-report.ts` (`buildRosterReport`, verdict order derived from `RECOMMENDATION_ORDER`). Minor UX deltas from the hook: search timeout 10s (was 15s); a failed search now shows a small inline error under the box (was the full centered error block). Verify on preview.
- **Low-tier constant dedups** (all in `constants.ts` / `evaluator-types.ts`):
  - `BATTER_POSITIONS` canonicalized into 3 documented constants: `BATTER_POSITIONS` (9, +DH — override dropdowns), `FIELDING_POSITIONS` (8, no DH — best-fit defense; DH has no defensive value), `ROSTER_POSITIONS` (12, +pitchers — eval-table dropdown).
  - `POSITION_ORDER` (pitchers-first, builder/transform) kept; the roster-table batters-first copy moved to `EVAL_POSITION_ORDER` with a comment documenting the intentional divergence.
  - `ITEM_TIERS` single-sourced in constants; ShopView + ShopGlossary both consume it (glossary table now renders from the array instead of 7 hardcoded rows).
  - `SLOT_META` exported from item-advisor; ShopSummary's duplicate `SLOT_EMOJI` deleted (uses `SLOT_META[...].emoji`).
  - Recommendation thresholds + verdict colors single-sourced: `RECOMMENDATION_THRESHOLDS` + `VERDICT_COLORS` in evaluator-types. `getRecommendation`, `score-badge.scoreColor`, `verdict-badge`, and roster-table's summary strip/filter pills all consume them — badge color can no longer drift from the verdict it represents.

## Phase 4 — second pass — DONE ✅ / decided
- **Richer `/api/health`**: now reports `db` + `mmolb` (reachability via `mmolb.com/api/state`, 5s timeout) + `percentiles` (`fresh`/`stale`/`none` with `computedAt` + `ageHours`, 36h stale threshold). DB remains the ONLY 503 trigger — MMOLB/percentile state is informational so a brief upstream outage doesn't fail the liveness probe.
- **CURRENT_SEASON**: user confirmed **Season 12 launches today (2026-06-01)**, so the "Season 12" label is correct — no label change. ⚠️ The gameplay constants (`mechanics.ts` `S11` object: cap 30, points-per-level, boon/defense levels; `MILESTONE_LEVELS`) are still S11 values and need S12 verification against Danny's S12 patch notes / live API. That's a DATA task, not a code guess — left as-is, NOT renamed S11→S12 (renaming would imply the values are confirmed-S12 when they aren't).
- **Cache hit/miss logging**: NOT done — explicitly optional, marginal (404s already logged at the API layer).
- **json-cache TTL**: NOT done — lens rated cache-forever "acceptable" for static data.

## Recommended next step
Push for a Railway preview deploy and visually QA: (1) builder + shop player headers (PlayerHeader extraction) pixel-match the old layout; (2) durability pips render as before (and decide green-vs-blue unify); (3) Mulch-o-Meter search + Copy Report still work; (4) prod logs show the `[percentiles]` scheduler starting at boot. Then verify S12 mechanics once Danny's S12 numbers are known.
