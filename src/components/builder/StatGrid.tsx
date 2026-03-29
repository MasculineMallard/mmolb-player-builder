"use client";

import { STAT_CATEGORIES, getStatColor } from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatGridProps {
  stats: Record<string, number>;
  highlightStats?: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  batting: "Batting",
  baserunning: "Baserunning",
  pitching: "Pitching",
  defense: "Defense",
  mental: "Mental",
  misc: "Misc",
};

export function StatGrid({ stats, highlightStats = [] }: StatGridProps) {
  return (
    <div className="space-y-3">
      {Object.entries(STAT_CATEGORIES).map(([category, statNames]) => {
        const hasAny = statNames.some(
          (s) => stats[s] !== undefined && stats[s] > 0
        );
        if (!hasAny) return null;

        return (
          <div key={category}>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              {CATEGORY_LABELS[category]}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1">
              {statNames.map((statName) => {
                const value = stats[statName];
                if (value === undefined) return null;

                const isHighlighted = highlightStats.includes(statName);

                return (
                  <Tooltip key={statName}>
                    <TooltipTrigger
                      className={`flex items-center justify-between py-0.5 px-1 rounded text-sm w-full text-left ${
                        isHighlighted
                          ? "bg-primary/10 border border-primary/30"
                          : ""
                      }`}
                    >
                      <span className="capitalize text-muted-foreground">
                        {statName}
                      </span>
                      <span
                        className="font-mono font-medium tabular-nums"
                        style={{ color: getStatColor(value) }}
                      >
                        {value}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="capitalize font-medium">{statName}</p>
                      <p className="text-xs text-muted-foreground">
                        Value: {value}/1000
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
