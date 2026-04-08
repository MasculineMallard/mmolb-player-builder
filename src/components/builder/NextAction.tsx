"use client";

import { useState, useEffect, useMemo } from "react";
import type { StatRecommendation, BoonTimelineEntry } from "@/lib/advisor";
import { STAT_CATEGORIES } from "@/lib/constants";
import { createJsonCache, isNonArrayObject } from "@/lib/json-cache";
import { RadarChart } from "@/components/evaluator/radar-chart";
import type { Archetype } from "@/lib/types";

export interface LevelMechanics {
  level: number;
  maxLevel: number;
  pointsPerLevel: number;
  defenseBonusAmount: number;
  isBoonLevel: boolean;
  isDefenseLevel: boolean;
}

interface NextActionProps {
  mechanics: LevelMechanics;
  statRecommendations: StatRecommendation[];
  boonTimeline: BoonTimelineEntry[];
  progressPercent: number;
  playerStats: Record<string, number>;
  position: string | null;
  archetype: Archetype;
}

const DEFENSE_STATS: Set<string> = new Set([
  ...STAT_CATEGORIES.defense,
  ...STAT_CATEGORIES.luck,
]);

interface PositionDefenseEntry {
  stat_weights: Record<string, number>;
  primary_stats: string[];
  secondary_stats: string[];
}
type PositionDefenseMap = Record<string, PositionDefenseEntry>;

const loadDefenseWeights = createJsonCache<PositionDefenseMap>(
  "/data/archetypes/position_defense_weights.json",
  (d): d is PositionDefenseMap => isNonArrayObject(d)
);

function gapColor(gap: number): string {
  if (gap > 200) return "var(--scale-bad)";
  if (gap > 100) return "var(--scale-poor)";
  return "var(--scale-mid)";
}

function StatCard({ stat, primary }: { stat: StatRecommendation; primary?: boolean }) {
  return (
    <div
      className="bg-muted rounded-md px-2.5 py-2"
      style={{ borderLeft: `3px solid ${primary ? "var(--primary)" : "var(--border)"}` }}
    >
      <div
        className="text-sm font-semibold capitalize mb-0.5"
        style={{ color: primary ? "var(--foreground)" : "var(--muted-foreground)" }}
      >
        {stat.statName}
      </div>
      <div className="text-sm text-muted-foreground">
        {stat.current} / {stat.target}
        {stat.gap > 0 && (
          <span style={{ color: gapColor(stat.gap) }}> (-{stat.gap})</span>
        )}
      </div>
    </div>
  );
}

export function NextAction({
  mechanics: { level, maxLevel, pointsPerLevel, defenseBonusAmount, isBoonLevel, isDefenseLevel },
  statRecommendations,
  boonTimeline,
  progressPercent,
  playerStats,
  position,
  archetype,
}: NextActionProps) {
  const [defenseWeights, setDefenseWeights] = useState<PositionDefenseMap>({});

  useEffect(() => {
    let cancelled = false;
    loadDefenseWeights()
      .then((data) => { if (!cancelled) setDefenseWeights(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Position-weighted defense stat recommendations
  const defenseRecs = useMemo(() => {
    if (!position) return [];
    const posData = defenseWeights[position];
    if (!posData) return [];

    const weights = posData.stat_weights;
    const recs: StatRecommendation[] = [];

    for (const [statName, weight] of Object.entries(weights)) {
      const current = playerStats[statName] ?? 0;
      // Target scales with weight: primary (0.12) → 200, secondary (0.08) → 133
      const target = Math.round((weight / 0.12) * 200);
      const gap = Math.max(target - current, 0);
      const priorityScore = gap * weight;

      recs.push({
        statName,
        current,
        target,
        gap,
        weight,
        priorityScore,
        reasoning: posData.primary_stats.includes(statName) ? "Primary defense stat" : "Secondary defense stat",
      });
    }

    recs.sort((a, b) => b.priorityScore - a.priorityScore);
    return recs.slice(0, 2);
  }, [defenseWeights, position, playerStats]);

  if (level >= maxLevel) {
    return (
      <div className="bg-gradient-to-r from-[var(--chart-2)] to-[var(--chart-5)] p-[1px] rounded-lg">
        <div
          className="bg-card rounded-[calc(var(--radius)-1px)] px-3 py-2"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255, 215, 0, 0.1), 0 0 20px rgba(255, 215, 0, 0.08)' }}
        >
          <div className="text-sm font-medium text-[var(--chart-2)] mb-0.5">
            Max Level Reached
          </div>
          <p className="text-base font-bold">
            Level {maxLevel} complete. Your build is finalized.
          </p>
        </div>
      </div>
    );
  }

  const nextBoon = boonTimeline.find((b) => !b.acquired);

  // Offense stats from advisor (non-defense)
  const withGap = statRecommendations.filter((r) => r.gap > 0);
  const offenseStats = withGap.filter((r) => !DEFENSE_STATS.has(r.statName)).slice(0, 4);

  const allCards = [...offenseStats, ...defenseRecs];

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
        <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
        Archetype Fit
      </h3>
      <div>
        {isBoonLevel && nextBoon ? (
          <div>
            <p className="text-base font-bold mb-1">Choose a Lesser Boon</p>
            {nextBoon.recommendations.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                Recommended:{" "}
                <span className="text-foreground font-medium">
                  {nextBoon.recommendations[0]}
                </span>
                {nextBoon.recommendations.length > 1 && (
                  <span>
                    {" "}or {nextBoon.recommendations.slice(1, 3).join(", ")}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No specific boon recommendation for this archetype.
              </p>
            )}
          </div>
        ) : isDefenseLevel ? (
          <div>
            <p className="text-base font-bold mb-1">
              Defense Bonus (+{defenseBonusAmount})
            </p>
            <p className="text-sm text-muted-foreground">
              +{defenseBonusAmount} defense points assigned automatically.
              {" "}Luck may also be offered as an option.
            </p>
          </div>
        ) : allCards.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              {archetype.emoji && <span className="text-lg">{archetype.emoji}</span>}
              <span className="text-sm font-medium">{archetype.name}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-[11px] bg-muted rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(progressPercent, 100)}%`,
                  background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
                }}
              />
            </div>
            <div className="flex justify-center">
              <RadarChart
                stats={Object.fromEntries(allCards.map((c) => [c.statName, c.current]))}
                targets={Object.fromEntries(allCards.map((c) => [c.statName, c.target]))}
                statLabels={allCards.map((c) => c.statName)}
              />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-base font-bold mb-1">All stats on target</p>
            <p className="text-sm text-muted-foreground">
              Distribute +{pointsPerLevel} to any stat that needs a boost.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
