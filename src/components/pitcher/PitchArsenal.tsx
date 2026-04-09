"use client";

import { useMemo } from "react";
import type { PitchData } from "@/lib/types";
import type { PitchArsenalAdvice } from "@/lib/optimizer";

interface PitchArsenalProps {
  pitches: PitchData[];
  advice?: PitchArsenalAdvice | null;
  inline?: boolean;
}

const PITCH_NAMES: Record<string, string> = {
  ff: "Fastball", si: "Sinker", fc: "Cutter",
  ch: "Changeup", fs: "Splitter",
  cu: "Curveball", kc: "Knuckle Curve", sl: "Slider", st: "Sweeper",
};

const PITCH_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

export function PitchArsenal({ pitches, advice, inline }: PitchArsenalProps) {
  const slices = useMemo(() => {
    if (!pitches.length) return [];

    const rawTotal = pitches.reduce((sum, p) => sum + p.frequency, 0);
    const total = rawTotal || 1;

    // Largest-remainder rounding so percentages sum to exactly 100
    const rawPcts = pitches.map((p) => (p.frequency / total) * 100);
    const floored = rawPcts.map(Math.floor);
    const remainder = 100 - floored.reduce((a, b) => a + b, 0);
    const remainders = rawPcts.map((v, i) => ({ i, r: v - floored[i] }));
    remainders.sort((a, b) => b.r - a.r);
    for (let j = 0; j < remainder; j++) floored[remainders[j].i]++;

    return pitches.map((p, i) => ({
      color: PITCH_COLORS[i % PITCH_COLORS.length],
      pitch: p,
      displayPct: floored[i],
    }));
  }, [pitches]);

  if (!pitches.length) return null;

  const hasAdvice = advice && (advice.add.length > 0 || advice.remove.length > 0);

  if (inline) {
    // 8a layout: semicircle concentric arcs → dot legend → recommendations
    const svgW = 180;
    const svgH = 100;
    const baseY = 90;
    const outermost = 75;
    const arcSpacing = 11;
    const strokeW = 7;

    return (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1.5 border-b border-border pb-0.5">
          Pitch Arsenal
        </h3>

        {/* Concentric semicircle arcs */}
        <div className="flex justify-center mb-2.5">
          <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
            {slices.map((s, i) => {
              const r = outermost - i * arcSpacing;
              if (r <= 0) return null;
              const x1 = svgW / 2 - r;
              const x2 = svgW / 2 + r;
              const arcLen = Math.PI * r;
              const filled = (s.displayPct / 100) * arcLen;
              return (
                <g key={i}>
                  {/* Background track */}
                  <path
                    d={`M ${x1} ${baseY} A ${r} ${r} 0 0 1 ${x2} ${baseY}`}
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                  />
                  {/* Filled arc */}
                  <path
                    d={`M ${x1} ${baseY} A ${r} ${r} 0 0 1 ${x2} ${baseY}`}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    strokeDasharray={`${filled} ${arcLen}`}
                    strokeDashoffset="0"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Dot legend */}
        <div className="flex flex-col gap-0.5 mb-2.5">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-sm">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-muted-foreground">{PITCH_NAMES[s.pitch.name] ?? s.pitch.name.toUpperCase()}</span>
              <span className="ml-auto text-muted-foreground tabular-nums">
                {s.displayPct}%
              </span>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {hasAdvice && (
          <div className="border-t border-border pt-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Recommendations
            </div>
            <div className="flex flex-col gap-1">
              {advice.add.map((a) => (
                <span
                  key={a.pitchType}
                  className="text-sm font-medium text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-full w-fit"
                >
                  + {a.name}
                </span>
              ))}
              {advice.remove.map((r) => (
                <span
                  key={r}
                  className="text-sm font-medium text-[var(--chart-2)] bg-[var(--chart-2)]/10 border border-[var(--chart-2)]/30 px-2 py-0.5 rounded-full w-fit"
                >
                  - {PITCH_NAMES[r] ?? r.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Standalone card mode — same 8a layout but wrapped in a card
  const svgW = 200;
  const svgH = 110;
  const baseY = 100;
  const outermost = 85;
  const arcSpacing = 12;
  const strokeW = 8;

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
        <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
        Pitch Arsenal
      </h3>

      {/* Concentric semicircle arcs */}
      <div className="flex justify-center mb-3">
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
          {slices.map((s, i) => {
            const r = outermost - i * arcSpacing;
            if (r <= 0) return null;
            const x1 = svgW / 2 - r;
            const x2 = svgW / 2 + r;
            const arcLen = Math.PI * r;
            const filled = (s.displayPct / 100) * arcLen;
            return (
              <g key={i}>
                <path
                  d={`M ${x1} ${baseY} A ${r} ${r} 0 0 1 ${x2} ${baseY}`}
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth={strokeW}
                  strokeLinecap="round"
                />
                <path
                  d={`M ${x1} ${baseY} A ${r} ${r} 0 0 1 ${x2} ${baseY}`}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeW}
                  strokeLinecap="round"
                  strokeDasharray={`${filled} ${arcLen}`}
                  strokeDashoffset="0"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dot legend */}
      <div className="flex flex-col gap-1 mb-3">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-sm">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span>{PITCH_NAMES[s.pitch.name] ?? s.pitch.name.toUpperCase()}</span>
            <span className="ml-auto text-muted-foreground text-sm tabular-nums">
              {s.displayPct}%
            </span>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {hasAdvice && (
        <div className="border-t border-border pt-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
            Recommendations
          </div>
          <div className="flex flex-col gap-1">
            {advice.add.map((a) => (
              <span
                key={a.pitchType}
                className="text-sm font-medium text-primary bg-primary/10 border border-primary/30 px-2.5 py-0.5 rounded-full w-fit"
              >
                + {a.name}
              </span>
            ))}
            {advice.remove.map((r) => (
              <span
                key={r}
                className="text-sm font-medium text-[var(--chart-2)] bg-[var(--chart-2)]/10 border border-[var(--chart-2)]/30 px-2.5 py-0.5 rounded-full w-fit"
              >
                - {PITCH_NAMES[r] ?? r.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
