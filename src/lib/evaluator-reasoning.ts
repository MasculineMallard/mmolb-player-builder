/**
 * Structured per-score reasoning for roster evaluations.
 * Each score pillar gets its own explanation section.
 */

import type { PlayerData } from "./types";
import type { EvalFlag, PlayerRole, StructuredReasoning, ScoreExplanation } from "./evaluator-types";
import type { PositionDefenseMap } from "./evaluator-data";
import { STAT_TIERS, ROLE_STATS } from "./evaluator-data";
import { calculatePrimaryPointsAtLevel, TOTAL_PRIMARY_POINTS, S11 } from "./mechanics";

// ---------------------------------------------------------------------------
// Attributes explanation
// ---------------------------------------------------------------------------

function explainAttributes(
  player: PlayerData,
  role: PlayerRole,
  attributeScore: number,
  flags: EvalFlag[],
  boonLookup: Map<string, { bonuses: Record<string, number>; penalties: Record<string, number> }>,
): ScoreExplanation {
  const lines: string[] = [];
  const t1Set = new Set(STAT_TIERS[role].T1);
  const t2Set = new Set(STAT_TIERS[role].T2);
  const allStats = ROLE_STATS[role];

  let t1Sum = 0, t2Sum = 0, t3Sum = 0;
  const t1Values: { name: string; val: number }[] = [];

  for (const stat of allStats) {
    const val = player.stats[stat] ?? 0;
    if (t1Set.has(stat)) {
      t1Sum += val;
      t1Values.push({ name: stat, val });
    } else if (t2Set.has(stat)) {
      t2Sum += val;
    } else {
      t3Sum += val;
    }
  }

  const total = t1Sum + t2Sum + t3Sum;
  if (total > 0) {
    const t1Pct = Math.round((t1Sum / total) * 100);
    const t2Pct = Math.round((t2Sum / total) * 100);
    const t3Pct = Math.round((t3Sum / total) * 100);
    lines.push(`Distribution: ${t1Pct}% T1, ${t2Pct}% T2, ${t3Pct}% T3`);
  }

  // Strongest T1 stats
  t1Values.sort((a, b) => b.val - a.val);
  const strong = t1Values.filter((s) => s.val >= 300);
  if (strong.length > 0) {
    lines.push(`Strong T1: ${strong.map((s) => `${s.name} ${s.val}`).join(", ")}`);
  }

  // Weak or missing T1 stats
  const level = player.level ?? 1;
  const threshold = level >= 20 ? 200 : level >= 10 ? 100 : 50;
  const weak = t1Values.filter((s) => s.val < threshold && level >= 10);
  if (weak.length > 0) {
    lines.push(`T1 gaps: ${weak.map((s) => `${s.name} ${s.val}`).join(", ")}`);
  }

  // T1 voids
  if (flags.includes("T1_VOID_LATE")) {
    const voids = t1Values.filter((s) => s.val === 0);
    if (voids.length > 0) {
      lines.push(`T1 stats at 0: ${voids.map((s) => s.name).join(", ")}. Critical gap at level ${level}.`);
    }
  }

  // Boon alignment
  const playerBoons = [...player.lesserBoons, ...player.greaterBoons];
  if (playerBoons.length > 0) {
    const conflicts: string[] = [];
    const aligned: string[] = [];
    for (const boonName of playerBoons) {
      const boon = boonLookup.get(boonName);
      if (!boon) continue;
      const bonusT1 = Object.keys(boon.bonuses).some((s) => t1Set.has(s.toLowerCase()));
      const penaltyT1 = Object.keys(boon.penalties).some((s) => t1Set.has(s.toLowerCase()));
      if (penaltyT1) conflicts.push(boonName);
      else if (bonusT1) aligned.push(boonName);
    }
    if (conflicts.length > 0) {
      lines.push(`Boon conflict: ${conflicts.join(", ")} penalizes T1 stats`);
    } else if (aligned.length > 0) {
      lines.push(`Boons aligned: ${aligned.join(", ")} boost T1 stats`);
    }
  }

  return { score: attributeScore, label: "Attributes", lines };
}

// ---------------------------------------------------------------------------
// Fit explanation
// ---------------------------------------------------------------------------

function explainFit(
  player: PlayerData,
  role: PlayerRole,
  positionFitScore: number,
  positionDefense: PositionDefenseMap,
): ScoreExplanation {
  const lines: string[] = [];
  const pos = player.position?.replace(/\d+$/, "") ?? "";

  if (role === "pitcher") {
    lines.push("No defense requirements for pitchers.");
    return { score: positionFitScore, label: "Fit", lines };
  }

  if (pos === "DH" || pos === "Bench") {
    lines.push("No defense requirements for DH.");
    return { score: positionFitScore, label: "Fit", lines };
  }

  const entry = positionDefense[pos];
  if (!entry || !entry.stat_weights || Object.keys(entry.stat_weights).length === 0) {
    lines.push("No defense data available for this position.");
    return { score: positionFitScore, label: "Fit", lines };
  }

  lines.push(`Position: ${entry.name ?? pos}`);

  for (const [stat, weight] of Object.entries(entry.stat_weights)) {
    const value = player.stats[stat] ?? 0;
    const target = Math.round((weight / 0.12) * 120);
    const gap = target - value;
    if (gap <= 0) {
      lines.push(`${stat}: ${value} (on target)`);
    } else {
      lines.push(`${stat}: ${value}/${target} (-${gap})`);
    }
  }

  return { score: positionFitScore, label: "Fit", lines };
}

// ---------------------------------------------------------------------------
// Stats explanation
// ---------------------------------------------------------------------------

function explainStats(
  statsScore: number | null,
): ScoreExplanation {
  const lines: string[] = [];

  if (statsScore == null) {
    lines.push("No game stats available for this season.");
    lines.push("Score based on attributes, fit, and growth only.");
  } else {
    if (statsScore >= 75) {
      lines.push("Game performance in top quartile.");
    } else if (statsScore >= 50) {
      lines.push("Game performance above average.");
    } else if (statsScore >= 25) {
      lines.push("Game performance below average.");
    } else {
      lines.push("Game performance in bottom quartile.");
    }
  }

  return { score: statsScore, label: "Stats", lines };
}

// ---------------------------------------------------------------------------
// Growth explanation
// ---------------------------------------------------------------------------

function explainGrowth(
  player: PlayerData,
  growthScore: number,
  flags: EvalFlag[],
): ScoreExplanation {
  const lines: string[] = [];
  const level = player.level ?? 1;
  const remaining = S11.maxLevel - level;

  if (level >= S11.maxLevel) {
    lines.push("Level 30. No growth remaining.");
    lines.push("Current build is the ceiling.");
    if (flags.includes("MAXED_BOTTOM_QUARTILE")) {
      lines.push("Maxed with bottom-quartile performance. No path to improvement.");
    }
    return { score: growthScore, label: "Growth", lines };
  }

  const pointsLeft = TOTAL_PRIMARY_POINTS - calculatePrimaryPointsAtLevel(level);
  const boonsLeft = [10, 20, 30].filter((l) => l > level).length;

  lines.push(`${remaining} levels remaining (~${pointsLeft} attribute points to earn)`);

  if (boonsLeft > 0) {
    lines.push(`${boonsLeft} boon slot${boonsLeft > 1 ? "s" : ""} remaining`);
  }

  if (pointsLeft >= 500) {
    lines.push("Significant room to reshape build.");
  } else if (pointsLeft >= 200) {
    lines.push("Moderate room for improvement.");
  } else if (pointsLeft > 0) {
    lines.push("Limited room. Most of the build is set.");
  }

  return { score: growthScore, label: "Growth", lines };
}

// ---------------------------------------------------------------------------
// Main structured reasoning
// ---------------------------------------------------------------------------

export function generateStructuredReasoning(
  player: PlayerData,
  role: PlayerRole,
  attributeScore: number,
  statsScore: number | null,
  growthScore: number,
  positionFitScore: number,
  flags: EvalFlag[],
  boonLookup: Map<string, { bonuses: Record<string, number>; penalties: Record<string, number> }>,
  positionDefense: PositionDefenseMap,
): StructuredReasoning {
  return {
    attributes: explainAttributes(player, role, attributeScore, flags, boonLookup),
    fit: explainFit(player, role, positionFitScore, positionDefense),
    stats: explainStats(statsScore),
    growth: explainGrowth(player, growthScore, flags),
  };
}
