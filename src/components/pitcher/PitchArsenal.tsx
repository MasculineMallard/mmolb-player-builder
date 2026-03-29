"use client";

import type { PitchData } from "@/lib/types";
import type { PitchArsenalAdvice } from "@/lib/optimizer";

interface PitchArsenalProps {
  pitches: PitchData[];
  advice?: PitchArsenalAdvice | null;
}

const PITCH_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

export function PitchArsenal({ pitches, advice }: PitchArsenalProps) {
  if (!pitches.length) return null;

  const total = pitches.reduce((sum, p) => sum + p.frequency, 0);
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 50;
  const innerR = 30;

  // Build donut slices
  let cumulative = 0;
  const slices = pitches.map((p, i) => {
    const pct = total > 0 ? p.frequency / total : 1 / pitches.length;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;

    const x1o = cx + outerR * Math.cos(startAngle);
    const y1o = cy + outerR * Math.sin(startAngle);
    const x2o = cx + outerR * Math.cos(endAngle);
    const y2o = cy + outerR * Math.sin(endAngle);
    const x1i = cx + innerR * Math.cos(endAngle);
    const y1i = cy + innerR * Math.sin(endAngle);
    const x2i = cx + innerR * Math.cos(startAngle);
    const y2i = cy + innerR * Math.sin(startAngle);

    const largeArc = pct > 0.5 ? 1 : 0;

    const d = [
      `M ${x1o} ${y1o}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o}`,
      `L ${x1i} ${y1i}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i} ${y2i}`,
      "Z",
    ].join(" ");

    return { d, color: PITCH_COLORS[i % PITCH_COLORS.length], pitch: p, pct };
  });

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3">Pitch Arsenal</h3>
      <div className="flex items-start gap-4">
        {/* SVG Donut */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="shrink-0"
        >
          {slices.map((s, i) => (
            <path key={i} d={s.d} fill={s.color} />
          ))}
        </svg>

        {/* Legend + Advice */}
        <div className="space-y-1 flex-1 min-w-0">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="truncate">{s.pitch.name}</span>
              <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                {Math.round(s.pct * 100)}%
              </span>
            </div>
          ))}

          {advice && advice.add.length > 0 && (
            <div className="border-t border-border pt-2 mt-2">
              <div className="text-xs text-muted-foreground mb-1">
                Consider adding:
              </div>
              {advice.add.map((a) => (
                <div
                  key={a.pitchType}
                  className="text-xs text-[var(--chart-3)]"
                >
                  + {a.name}
                </div>
              ))}
            </div>
          )}

          {advice && advice.remove.length > 0 && (
            <div className="border-t border-border pt-1 mt-1">
              <div className="text-xs text-muted-foreground mb-1">
                Consider dropping:
              </div>
              {advice.remove.map((r) => (
                <div key={r} className="text-xs text-[var(--chart-4)]">
                  - {r}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
