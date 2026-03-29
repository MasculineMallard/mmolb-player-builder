"use client";

import { S11 } from "@/lib/mechanics";
import type { StatRecommendation, BoonTimelineEntry } from "@/lib/advisor";

interface NextActionProps {
  level: number;
  statRecommendations: StatRecommendation[];
  boonTimeline: BoonTimelineEntry[];
  progressPercent: number;
}

export function NextAction({
  level,
  statRecommendations,
  boonTimeline,
  progressPercent,
}: NextActionProps) {
  const nextLevel = level + 1;

  if (level >= S11.maxLevel) {
    return (
      <div className="bg-card border-2 border-[var(--chart-2)] rounded-lg p-5">
        <div className="text-sm font-medium text-[var(--chart-2)] mb-1">
          Max Level Reached
        </div>
        <p className="text-lg font-bold">
          Level 30 complete. Your build is finalized.
        </p>
      </div>
    );
  }

  const isBoonLevel = (S11.boonLevels as readonly number[]).includes(nextLevel);
  const isDefenseLevel = (S11.defenseBonusLevels as readonly number[]).includes(nextLevel);

  // Find the next upcoming boon
  const nextBoon = boonTimeline.find((b) => !b.acquired);

  // Top stat recommendation
  const topStat = statRecommendations.find((r) => r.gap > 0);

  return (
    <div className="bg-card border-2 border-primary rounded-lg p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-primary">
          Next: Level {nextLevel}
        </div>
        <div className="text-xs text-muted-foreground">
          {Math.round(progressPercent)}% to target
        </div>
      </div>

      {isBoonLevel && nextBoon ? (
        <div>
          <p className="text-lg font-bold mb-1">Choose a Lesser Boon</p>
          {nextBoon.recommendations.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Recommended:{" "}
              <span className="text-foreground font-medium">
                {nextBoon.recommendations[0]}
              </span>
              {nextBoon.recommendations.length > 1 && (
                <span>
                  {" "}
                  or {nextBoon.recommendations.slice(1, 3).join(", ")}
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
          <p className="text-lg font-bold mb-1">
            Defense Bonus (+{S11.defenseBonusAmount})
          </p>
          <p className="text-sm text-muted-foreground">
            +{S11.defenseBonusAmount} defense points assigned automatically.
            {topStat && (
              <span>
                {" "}
                Luck may also be offered as an option.
              </span>
            )}
          </p>
        </div>
      ) : topStat ? (
        <div>
          <p className="text-lg font-bold mb-1">
            Put +{S11.pointsPerLevel} into{" "}
            <span className="capitalize">{topStat.statName}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Currently {topStat.current} / {topStat.target} target.{" "}
            {topStat.gap > 0 ? `${topStat.gap} points behind.` : "On track."}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-lg font-bold mb-1">All stats on target</p>
          <p className="text-sm text-muted-foreground">
            Distribute +{S11.pointsPerLevel} to any stat that needs a boost.
          </p>
        </div>
      )}
    </div>
  );
}
