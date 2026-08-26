# S15 attribute-tier rationale (PR-A)

Why each attribute sits in the tier it does for S15, the evidence behind it, and what the
re-tiering does to the rating distribution. Tiers are single-sourced from
`src/data/stat-tiers.json` (consumed by `evaluator-data.ts`, `percentile-builder.ts`, and
`mmolb/sample_eval.py` — no more drift).

**Primary evidence:** `mmolb/reference/s15/S15_regression_results.txt` (78 OLS models,
attribute + pitch-mix → per-outcome z-rates) and its parse `regression_summary.json`;
patch notes (`mmolb` skill `references/s15-patch-notes.md`); community build matrix
(`S15_sheets_screenshot.png`). Synthesis: `S15-PASS2-PROPOSED-DIFF.md`.

## Governing principles (Drake, 2026-08-26)
- **P1 — Tier 1 is PROVEN-ONLY.** A stat reaches T1 only when the REGRESSION confirms it.
  A patch-note buff (direction only) never promotes to T1 on its own; it waits for the stats.
- **P2 — Weigh OUTCOME VALUE, not raw Σ|coef|.** A stat's tier reflects the value of what it
  produces, not just the size of its coefficient on one metric.

## Batter tiers

| Stat | S15 | vs S10 | Outcome it drives (value) | Evidence / note |
|---|---|---|---|---|
| contact | **T1** | — | balls in play (foundational) | strong, stable across BIP models |
| performance | **T1** | — | hits-on-contact, XBH | many significant positive loadings on hit-quality DVs |
| aiming | **T1** | — | **line drives — the highest-value BIP** | held T1 over vision on **P2** (outcome value), not raw Σ |
| discipline | **T1** ⬆ | T2→T1 | lay off out-of-zone → walks/OBP | S15-buffed AND regression-proven (take/chase DVs) → P1 satisfied |
| insight | **T1** ⬆ | T2→T1 | hits-on-contact, +2B/3B | S15-buffed AND regression-positive on hit-quality → P1 satisfied |
| muscle | **T1** | — | home runs | proven on HR DV, though S15-nerfed on 2B/3B — **watch** |
| vision | T2 | — | swing at strikes (contact decision) | strong Σ (e.g. z_take_rate −0.0281, t=−15.8) but lower-value outcome → **P2** keeps it T2 |
| lift | T2 | — | fly balls | proven, mid-value outcome |
| speed | T2 | — | infield hits / baserunning | modest |
| intimidation | T2 ⬇ | T1→T2 | small +take-rate | only a small effect (z_take_rate +0.0040, t=2.8) — demoted off T1 |
| determination | T2 | — | diffuse | kept mid |
| cunning | **T3** ⬇ | T2→T3 | less chase, more HBP → niche OBP | z_rate −0.0183 (t=−9.5): it *reduces* swings; niche tool, not a core driver |
| selflessness | T3 | — | SacFly / situational | negligible |
| wisdom | T3 | — | minor | negligible |

**Net batter moves:** discipline T2→T1, insight T2→T1 (both regression-proven per **P1**);
intimidation T1→T2; cunning T2→T3. aiming holds T1 over vision per **P2**.

## Pitcher tiers — UNCHANGED S10→S15

| Stat | S15 | Note |
|---|---|---|
| velocity, control, rotation, stuff, presence | **T1** | unchanged; the proven pitcher core |
| accuracy | **T2** | **reversed** the proposed accuracy→T1 promotion (**P1**): it rested on a patch-note buff; the regression (Σ≈0.027) does not prove T1. Stays T2 as a "watch." |
| deception, persuasion, guts, stamina | T2 | unchanged |
| intuition, defiance | T3 | unchanged. Intuition's real effect is the multi-pitch all-attribute bonus, invisible to a per-season attribute regression — a **conditional bonus** is deferred to PR-H, not a tier move. defiance ≈ 0. |

The only pitcher-side change in PR-A is **reconciling `sample_eval.py` to this (unchanged) set** —
Python had wrongly ended PITCHER_T1 with `deception`, put `presence` in T2, and left `accuracy`
at weight-0. All three surfaces now read the same JSON.

## Distribution impact — measured on the REAL app engine (not Python /0.85)

`src/lib/__tests__/calibration.test.ts` scores two FROZEN live samples
(`references/s15-calibration-sample*.json`, seeds 999 & 12345) through the production engine —
the **live attribute-percentile path**, `percentileToScore(ratio, table)` — under S10 vs S15
batter tiers:

| | STAR | STRONG | ROSTER | FRINGE | MULCH | verdict churn |
|---|---|---|---|---|---|---|
| seed999 S10 | 6.6% | 7.8% | 24.0% | 13.6% | 48.1% | — |
| seed999 **S15** | 6.6% | 8.1% | 24.0% | 12.4% | 48.8% | **14.0%** |
| seed12345 S10 | 7.9% | 11.7% | 18.8% | 12.0% | 49.6% | — |
| seed12345 **S15** | 7.9% | 11.1% | 19.4% | 11.7% | 49.9% | **14.7%** |

**The S15 tier change moves every tier's marginal by ≤1.3pp on both seeds, while reshuffling
~14% of individual players** toward the newly-valued stats (discipline/insight up, intimidation/
cunning down). This is the intended effect with a safe blast radius.

### Why thresholds were NOT retuned (deviation from the proposed-diff plan)
`S15-PASS2-PROPOSED-DIFF.md` planned to retune STAR/STRONG/ROSTER/FRINGE to "preserve the shape,"
because a preview measured a large upward shift. **That preview used `pass2_distribution_preview.py`,
which scores attributes on the Python `/0.85` RAW-ratio path.** The production app scores attributes
as a **percentile RANK against a table that is itself regenerated under the new tiers** — a
self-normalizing metric. So the app-path distribution barely moves (above), and the planned retune
would be a fix for a shift that never happens in the app. It would also *perturb* the current shape.
**Decision: RECOMMENDATION_THRESHOLDS stay 65/55/42/35** (and Python `TIERS` unchanged to match).
The calibration test asserts the ≤2pp neutrality on both seeds as a permanent guard.

### Open decision for Drake (Q2 — NOT part of this tier change)
On the current early-S15 sample ~48-50% of players are MULCH and STAR runs ~7%, because most
players have no current-season regular-season stats yet (they score on attr+growth only). If you
want STAR to be rarer (the "top 2-3%" aspiration in the proposed diff) or MULCH less dominant, that
is an **absolute recalibration of generosity** affecting the whole app regardless of tiers — a
separate decision from the S15 re-tiering. Recommend revisiting mid-season when stat coverage is
high, rather than calibrating thresholds against a stats-sparse early-season sample.

## Cross-surface guards shipped with this change
- **Single source:** `src/data/stat-tiers.json` (app + percentile builder + Python CLI).
- **Cross-engine parity:** `cross-engine-parity.test.ts` + `parity-fixture.json`/`parity-expected.json`
  — TS and Python produce identical ratings; re-check Python with
  `python sample_eval.py --from-file mmolb-player-builder-next/references/parity-fixture.json`.
- **BoonAdvisor shift bounded:** `boon-golden.test.ts` + `__fixtures__/boon-scores-s15.json`
  pins the intentional boon-ranking change (discipline/insight boons gain weight; intimidation/
  cunning penalties re-price).
- **Distribution neutrality:** `calibration.test.ts` (±2pp both seeds).
