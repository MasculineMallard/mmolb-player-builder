"use client";

import type { StatRecommendation, BoonTimelineEntry } from "@/lib/advisor";
import { STAT_CATEGORIES } from "@/lib/constants";
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
  archetype: Archetype;
}

const DEFENSE_STATS: Set<string> = new Set([
  ...STAT_CATEGORIES.defense,
  ...STAT_CATEGORIES.luck,
]);

export function NextAction({
  mechanics: { level, maxLevel, pointsPerLevel, defenseBonusAmount, isBoonLevel, isDefenseLevel },
  statRecommendations,
  boonTimeline,
  progressPercent,
  archetype,
}: NextActionProps) {
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

  // Radar shows archetype priority + secondary stats (not defense)
  const archetypeStats = statRecommendations.filter((r) => !DEFENSE_STATS.has(r.statName));

  // Radar shows archetype priority + secondary stats (not defense)
  const archetypeStats = statRecommendations.filter((r) => !DEFENSE_STATS.has(r.statName));

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
        ) : archetypeStats.length > 0 ? (
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
                stats={Object.fromEntries(archetypeStats.map((c) => [c.statName, c.current]))}
                targets={Object.fromEntries(archetypeStats.map((c) => [c.statName, c.target]))}
                statLabels={archetypeStats.map((c) => c.statName)}
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
