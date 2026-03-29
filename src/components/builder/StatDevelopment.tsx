"use client";

import type { StatRecommendation } from "@/lib/advisor";
import { getStatColor } from "@/lib/constants";

interface StatDevelopmentProps {
  recommendations: StatRecommendation[];
}

export function StatDevelopment({ recommendations }: StatDevelopmentProps) {
  if (recommendations.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3">Stat Development</h3>
      <div className="space-y-2.5">
        {recommendations.map((rec) => {
          const progress =
            rec.target > 0
              ? Math.min((rec.current / rec.target) * 100, 100)
              : 100;

          return (
            <div key={rec.statName}>
              <div className="flex items-center justify-between text-sm mb-0.5">
                <span className="capitalize">{rec.statName}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  <span style={{ color: getStatColor(rec.current) }}>
                    {rec.current}
                  </span>
                  {" / "}
                  {rec.target}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor:
                      rec.gap <= 0
                        ? "var(--chart-3)"
                        : rec.gap > 200
                          ? "var(--chart-4)"
                          : "var(--chart-1)",
                  }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {rec.reasoning}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
