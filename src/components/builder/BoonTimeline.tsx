"use client";

import type { BoonTimelineEntry } from "@/lib/advisor";

interface BoonTimelineProps {
  timeline: BoonTimelineEntry[];
  takenLesserBoons: string[];
}

export function BoonTimeline({ timeline, takenLesserBoons }: BoonTimelineProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3">Boon Timeline</h3>
      <div className="space-y-3">
        {timeline.map((entry) => (
          <div
            key={entry.level}
            className={`flex items-start gap-3 ${
              entry.acquired ? "opacity-60" : ""
            }`}
          >
            {/* Level indicator */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                entry.acquired
                  ? "bg-[var(--chart-3)]/20 text-[var(--chart-3)]"
                  : "bg-primary/20 text-primary"
              }`}
            >
              {entry.level}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{entry.type}</div>

              {entry.acquired ? (
                <div className="text-xs text-muted-foreground">
                  {takenLesserBoons.length > 0 ? (
                    <span>
                      Taken:{" "}
                      {takenLesserBoons[
                        timeline.filter(
                          (t) => t.level <= entry.level && t.acquired
                        ).length - 1
                      ] ?? "Unknown"}
                    </span>
                  ) : (
                    "Acquired"
                  )}
                </div>
              ) : entry.recommendations.length > 0 ? (
                <div className="text-xs text-muted-foreground">
                  Recommended:{" "}
                  <span className="text-foreground">
                    {entry.recommendations.slice(0, 3).join(", ")}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No specific recommendation
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
