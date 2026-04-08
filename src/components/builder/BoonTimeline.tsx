"use client";

import type { BoonTimelineEntry } from "@/lib/advisor";

interface BoonTimelineProps {
  timeline: BoonTimelineEntry[];
}

export function BoonTimeline({ timeline }: BoonTimelineProps) {

  return (
    <div className="bg-card border border-border/60 rounded-lg px-3 py-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
        <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
        Boon Timeline
      </h3>
      <div className="relative space-y-0">
        {/* Vertical track line */}
        <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-border" />

        {timeline.map((entry, idx) => {
          const boonName = entry.takenBoonName;
          const isNext = !entry.acquired && (idx === 0 || timeline[idx - 1]?.acquired);

          return (
          <div
            key={entry.level}
            className={`flex items-start gap-3 relative py-2 ${
              entry.acquired ? "opacity-60" : ""
            }`}
          >
            {/* Level indicator */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 ${
                entry.acquired
                  ? "bg-primary/30 text-primary"
                  : isNext
                    ? "bg-primary/20 text-primary ring-2 ring-primary/40"
                    : "bg-muted text-muted-foreground"
              }`}
              style={isNext ? { animation: 'progression-pulse 2.5s ease-in-out infinite' } : undefined}
            >
              {entry.acquired ? "✓" : entry.level}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-base font-medium">{entry.type}</div>

              {entry.acquired ? (
                <div className="text-sm text-muted-foreground">
                  {boonName ? (
                    <span>Taken: {boonName}</span>
                  ) : (
                    "Acquired"
                  )}
                </div>
              ) : entry.recommendations.length > 0 ? (
                <div className="text-sm text-muted-foreground">
                  Recommended:{" "}
                  <span className="text-foreground">
                    {entry.recommendations.slice(0, 3).join(", ")}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No specific recommendation
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
