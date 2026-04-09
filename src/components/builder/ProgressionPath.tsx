"use client";

import type { Milestone } from "@/lib/planner-utils";

interface ProgressionPathProps {
  milestones: Milestone[];
  currentLevel: number;
}

function glowRgb(level: number): string {
  const t = Math.min(level / 30, 1);
  if (t < 0.5) {
    const p = t * 2;
    return `${Math.round(59 + p * (34 - 59))}, ${Math.round(130 + p * (211 - 130))}, ${Math.round(246 + p * (238 - 246))}`;
  }
  const p = (t - 0.5) * 2;
  return `${Math.round(34 + p * (165 - 34))}, ${Math.round(211 + p * (243 - 211))}, ${Math.round(238 + p * (252 - 238))}`;
}

function tipColor(level: number): string {
  const t = Math.min(level / 30, 1);
  if (t < 0.5) return "#22D3EE";
  if (t < 0.8) return "#A5F3FC";
  return "#F0F9FF";
}

// Layout constants
const PAD = 45;       // px inset from card edge for track (room for milestone labels)
const PAD2 = PAD * 2; // total horizontal inset
const TRACK_Y = 22;   // vertical center of track line
const TRACK_H = 6;    // track thickness

export function ProgressionPath({
  milestones,
  currentLevel,
}: ProgressionPathProps) {
  const total = milestones.length;
  const glow = glowRgb(currentLevel);
  const tip = tipColor(currentLevel);
  const t = Math.min(currentLevel / 30, 1);

  const currentIdx = milestones.findIndex((m, i) => {
    const next = milestones[i + 1];
    return currentLevel >= m.level && (!next || currentLevel < next.level);
  });

  let fillPct = 0;
  if (currentIdx >= 0 && total > 1) {
    const m = milestones[currentIdx];
    const next = milestones[currentIdx + 1];
    const basePct = currentIdx / (total - 1);
    if (next) {
      const segmentPct = 1 / (total - 1);
      const progressInSegment = (currentLevel - m.level) / (next.level - m.level);
      fillPct = (basePct + segmentPct * progressInSegment) * 100;
    } else {
      fillPct = 100;
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 overflow-hidden h-full">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
        <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
        Progression
      </h3>

      <div className="h-[74px] sm:h-[105px] overflow-hidden">
      <div className="relative scale-[0.7] sm:scale-100 origin-top-left w-[calc(100%/0.7)] sm:w-full" style={{ height: 105 }}>
        {/* Background track */}
        <div
          className="absolute rounded-full"
          style={{
            top: TRACK_Y,
            left: PAD,
            right: PAD,
            height: TRACK_H,
            background: "var(--muted)",
          }}
        />

        {/* Filled track */}
        <div
          className="absolute rounded-full transition-all duration-700 ease-out"
          style={{
            top: TRACK_Y,
            left: PAD,
            height: TRACK_H,
            width: `calc((100% - ${PAD2}px) * ${fillPct / 100})`,
            background: `linear-gradient(90deg, #3B82F6, ${tip})`,
            boxShadow: [
              `0 0 ${4 + t * 6}px rgba(${glow}, ${0.4 + t * 0.3})`,
              `0 0 ${8 + t * 14}px rgba(${glow}, ${0.15 + t * 0.2})`,
              t > 0.5 ? `0 0 ${20 + t * 10}px rgba(${glow}, 0.1)` : "",
            ].filter(Boolean).join(", "),
          }}
        />

        {/* Leading-edge dot */}
        {currentIdx >= 0 && fillPct > 0 && fillPct < 100 && (
          <div
            className="absolute rounded-full"
            style={{
              top: TRACK_Y - 2,
              left: `calc(${PAD}px + (100% - ${PAD2}px) * ${fillPct / 100} - 5px)`,
              width: 10,
              height: 10,
              background: tip,
              boxShadow: `0 0 6px rgba(${glow}, 0.6)`,
              transition: "left 700ms ease-out",
              zIndex: 5,
            }}
          />
        )}

        {/* Milestone nodes */}
        {milestones.map((m, i) => {
          const pct = total > 1 ? (i / (total - 1)) * 100 : 0;
          const isCompleted = currentLevel >= m.level;
          const nextLevel = milestones[i + 1]?.level ?? Infinity;
          const isCurrent = isCompleted && currentLevel < nextLevel;
          const isMax = m.level === 30 && currentLevel >= 30;

          const size = isCurrent || isMax ? 36 : 30;
          const half = size / 2;

          return (
            <div
              key={m.level}
              className="absolute flex flex-col items-center"
              style={{
                left: `calc(${PAD}px + (100% - ${PAD2}px) * ${pct / 100} - ${half}px)`,
                top: TRACK_Y + TRACK_H / 2 - half,
                width: size,
                zIndex: isCurrent || isMax ? 10 : 3,
              }}
            >
              {(isCurrent || isMax) && (
                <div
                  className="absolute rounded-full"
                  style={{
                    top: -4,
                    left: -4,
                    width: size + 8,
                    height: size + 8,
                    border: `1.5px solid rgba(${glow}, ${0.3 + t * 0.3})`,
                    boxShadow: `0 0 ${6 + t * 8}px rgba(${glow}, ${0.2 + t * 0.3})`,
                    animation: "progression-pulse 2.5s ease-in-out infinite",
                  }}
                />
              )}

              <div
                className="rounded-full flex items-center justify-center transition-all duration-500"
                style={{
                  width: size,
                  height: size,
                  background: isMax
                    ? `linear-gradient(135deg, #EAB308, #F59E0B)`
                    : isCurrent
                      ? `linear-gradient(135deg, #3B82F6, ${tip})`
                      : isCompleted
                        ? `linear-gradient(135deg, #3B82F6, #60A5FA)`
                        : "var(--muted)",
                  boxShadow: isMax
                    ? `0 0 12px rgba(234, 179, 8, 0.7), 0 0 24px rgba(234, 179, 8, 0.3), inset 0 1px 2px rgba(255,255,255,0.3)`
                    : isCurrent
                      ? `0 0 ${6 + t * 8}px rgba(${glow}, 0.6), 0 0 ${14 + t * 10}px rgba(${glow}, 0.2), inset 0 1px 2px rgba(255,255,255,0.15)`
                      : isCompleted
                        ? `0 0 ${2 + t * 4}px rgba(59, 130, 246, ${0.2 + t * 0.2})`
                        : "none",
                  border: isCompleted || isCurrent || isMax
                    ? "none"
                    : "1.5px solid var(--border)",
                }}
              >
                <span
                  className="font-bold tabular-nums"
                  style={{
                    fontSize: isCurrent || isMax ? 17 : 15,
                    color: isCompleted || isCurrent || isMax
                      ? "#FFFFFF"
                      : "var(--muted-foreground)",
                    textShadow: isCompleted || isCurrent || isMax
                      ? "0 1px 2px rgba(0,0,0,0.3)"
                      : "none",
                  }}
                >
                  {m.level}
                </span>
              </div>

              <span
                className="text-center leading-tight mt-1 whitespace-nowrap hidden sm:block"
                style={{
                  fontSize: 15,
                  letterSpacing: "0.01em",
                  color: isCurrent || isMax
                    ? "var(--foreground)"
                    : "var(--muted-foreground)",
                  fontWeight: isCurrent || isMax ? 600 : 400,
                  opacity: !isCompleted ? 0.5 : isCurrent || isMax ? 1 : 0.7,
                }}
              >
                {m.name}
              </span>
              <span
                className="text-center leading-tight mt-0.5 whitespace-nowrap sm:hidden"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.01em",
                  color: isCurrent || isMax
                    ? "var(--foreground)"
                    : "var(--muted-foreground)",
                  fontWeight: isCurrent || isMax ? 600 : 400,
                  opacity: !isCompleted ? 0.5 : isCurrent || isMax ? 1 : 0.7,
                }}
              >
                {m.name === "Defense Bonus" ? "Def" : m.name === "Lesser Boon" ? "Boon" : m.name}
              </span>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
