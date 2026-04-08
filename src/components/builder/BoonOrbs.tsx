"use client";

import type { BoonTimelineEntry } from "@/lib/advisor";
import type { BoonEmojiMap } from "@/hooks/use-boon-emojis";

interface BoonOrbsProps {
  boonTimeline: BoonTimelineEntry[];
  boonEmojis: BoonEmojiMap;
}

export function BoonOrbs({ boonTimeline, boonEmojis }: BoonOrbsProps) {
  if (boonTimeline.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 h-full">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
        <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
        Boons
      </h3>
      <div className="flex flex-wrap justify-center gap-4 sm:grid sm:gap-2" style={{ gridTemplateColumns: `repeat(${boonTimeline.length}, 1fr)` }}>
        {boonTimeline.map((entry) => {
          const boonName = entry.takenBoonName;
          const emoji = boonName ? boonEmojis.get(boonName.toLowerCase()) : null;
          const recName = !entry.acquired && entry.recommendations.length > 0
            ? entry.recommendations[0]
            : null;

          return (
            <div key={entry.level} className="flex flex-col items-center text-center">
              {/* Orb */}
              <div
                className="rounded-full flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12"
                style={{
                  background: entry.acquired
                    ? "linear-gradient(135deg, rgba(255,215,0,0.3), rgba(234,179,8,0.15))"
                    : "var(--muted)",
                  border: entry.acquired
                    ? "2px solid rgba(255,215,0,0.5)"
                    : "2px dashed var(--border)",
                  boxShadow: entry.acquired
                    ? "0 0 14px rgba(255,215,0,0.25), inset 0 1px 2px rgba(255,255,255,0.1)"
                    : "none",
                }}
              >
                {entry.acquired && emoji ? (
                  <span className="text-xl">{emoji}</span>
                ) : entry.acquired && boonName ? (
                  <span className="text-sm text-[var(--chart-2)] font-medium truncate px-1">
                    {boonName.slice(0, 3)}
                  </span>
                ) : (
                  <span className="text-base text-muted-foreground">?</span>
                )}
              </div>

              {/* Label */}
              <div className="mt-1 leading-tight">
                <div
                  className="font-medium"
                  style={{
                    fontSize: 15,
                    color: entry.acquired ? "var(--chart-2)" : "var(--primary)",
                  }}
                >
                  {entry.acquired && boonName
                    ? boonName
                    : recName
                      ? `Rec: ${recName}`
                      : "—"}
                </div>
                <div className="text-muted-foreground" style={{ fontSize: 14 }}>
                  Lv.{entry.level}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
