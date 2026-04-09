import type { EvaluatedPlayer, ScoreExplanation, GameStats } from "@/lib/evaluator-types";
import { getPlayerRole } from "@/lib/evaluator";
import { AttributeBreakdown } from "./attribute-breakdown";
import { VerdictBadge } from "./verdict-badge";
import { DefenseStatBars } from "./position-fit-card";
import {
  BATTING_STAT_WEIGHTS, PITCHING_STAT_WEIGHTS,
  BATTING_PERCENTILES, PITCHING_PERCENTILES,
  type LivePercentileTables,
} from "@/lib/evaluator-data";

const STAT_DISPLAY: Record<string, string> = {
  OBP: "OBP",
  SLG: "SLG",
  K_PCT: "K%",
  BB_PCT: "BB%",
  SB_PCT: "SB%",
  K9: "K/9",
  WHIP: "WHIP",
  ERA: "RA/9",
  BB9: "BB/9",
  HR9: "HR/9",
};

function scoreColor(score: number | null): string {
  if (score == null) return "var(--muted-foreground)";
  if (score >= 60) return "var(--scale-good)";
  if (score >= 40) return "var(--scale-mid)";
  return "var(--scale-bad)";
}

function WeightedBreakdown({ ev }: { eval?: never; ev: EvaluatedPlayer }) {
  const hasStats = ev.statsScore != null;
  const hasFit = ev.positionFitScore != null;

  let weights: Record<string, number>;
  if (hasStats && hasFit) {
    weights = { Attributes: 0.25, Stats: 0.25, Fit: 0.25, Growth: 0.25 };
  } else if (hasStats && !hasFit) {
    weights = { Attributes: 0.40, Stats: 0.40, Fit: 0, Growth: 0.20 };
  } else if (!hasStats && hasFit) {
    weights = { Attributes: 0.30, Stats: 0, Fit: 0.35, Growth: 0.35 };
  } else {
    weights = { Attributes: 0.50, Stats: 0, Fit: 0, Growth: 0.50 };
  }

  const rows = [
    { label: "Attributes", score: ev.attributeScore, weight: weights.Attributes },
    { label: "Stats", score: ev.statsScore, weight: weights.Stats },
    { label: "Fit", score: ev.positionFitScore, weight: weights.Fit },
    { label: "Growth", score: ev.growthScore, weight: weights.Growth },
  ];

  return (
    <div className="space-y-1">
      {/* Column headers */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50 uppercase tracking-wider">
        <span className="w-20 shrink-0">Category</span>
        <span className="w-10 text-right">Score</span>
        <span className="w-10 text-right">Weight</span>
        <span className="flex-1" />
        <span className="w-12 text-right">Points</span>
      </div>

      {rows.map((r) => {
        const contribution = r.score != null ? Math.round(r.score * r.weight) : 0;
        const weightPct = Math.round(r.weight * 100);
        const inactive = r.weight === 0;
        return (
          <div key={r.label} className={`flex items-center gap-2 text-sm ${inactive ? "opacity-30" : ""}`}>
            <span className="text-muted-foreground w-20 shrink-0">{r.label}</span>
            <span className="font-mono tabular-nums w-10 text-right" style={{ color: scoreColor(r.score) }}>
              {r.score ?? "—"}
            </span>
            <span className="text-muted-foreground/60 w-10 text-right">{weightPct > 0 ? `${weightPct}%` : "—"}</span>
            <div className="flex-1 h-[9px] bg-muted/80 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${r.score != null && r.weight > 0 ? Math.min(100, r.score) : 0}%`,
                  backgroundColor: scoreColor(r.score),
                }}
              />
            </div>
            <span className="font-mono tabular-nums text-muted-foreground w-12 text-right">
              {r.weight > 0 ? `+${contribution}` : "—"}
            </span>
          </div>
        );
      })}

      <div className="flex items-center gap-2 text-sm border-t border-border pt-1.5 mt-0.5">
        <span className="text-foreground w-20 shrink-0 font-medium">Composite</span>
        <span className="font-mono tabular-nums w-10 text-right" style={{ color: scoreColor(ev.compositeScore) }}>
          —
        </span>
        <span className="text-muted-foreground/60 w-10 text-right">100%</span>
        <div className="flex-1" />
        <span className="font-mono tabular-nums w-12 text-right font-bold" style={{ color: scoreColor(ev.compositeScore) }}>
          {ev.compositeScore}
        </span>
      </div>
    </div>
  );
}

function ExplanationLines({ explanation }: { explanation: ScoreExplanation }) {
  return (
    <ul className="space-y-0.5">
      {explanation.lines.map((line, i) => (
        <li key={i} className="text-sm text-muted-foreground flex gap-1.5">
          <span className="text-muted-foreground/60 shrink-0">&#x2022;</span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

function formatStatValue(key: string, value: number | undefined): string {
  if (value == null) return "—";
  if (["AVG", "OBP", "SLG", "OPS", "SB_PCT"].includes(key)) return value.toFixed(3);
  if (["K_PCT", "BB_PCT"].includes(key)) return value.toFixed(1) + "%";
  if (["ERA", "WHIP", "BB9", "HR9"].includes(key)) return value.toFixed(2);
  if (["K9"].includes(key)) return value.toFixed(1);
  return String(value);
}

import { percentileToScore } from "@/lib/evaluator";

function StatsTable({ gameStats, role, liveTables }: {
  gameStats: GameStats | null;
  role: "batter" | "pitcher";
  liveTables?: LivePercentileTables;
}) {
  const weights = role === "pitcher" ? PITCHING_STAT_WEIGHTS : BATTING_STAT_WEIGHTS;
  const tables = liveTables
    ? (role === "pitcher" ? liveTables.pitching : liveTables.batting)
    : (role === "pitcher" ? PITCHING_PERCENTILES : BATTING_PERCENTILES);

  if (!gameStats) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No game stats available this season.
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[11px] text-muted-foreground/50 uppercase tracking-wider">
          <th className="text-left font-normal pb-1">Stat</th>
          <th className="text-right font-normal pb-1">Value</th>
          <th className="text-right font-normal pb-1">Pctile</th>
        </tr>
      </thead>
      <tbody>
        {(() => {
          const sampleKey = role === "pitcher" ? "IP" : "PA";
          const sampleVal = gameStats[sampleKey as keyof GameStats] as number | undefined;
          const sigThreshold = role === "pitcher" ? 20 : 50;
          const isSig = sampleVal != null && sampleVal >= sigThreshold;
          return (
            <tr className="border-b border-border/30">
              <td className="text-muted-foreground py-0.5 font-medium">{sampleKey}</td>
              <td className="text-right font-mono tabular-nums py-0.5">{sampleVal != null ? Math.round(sampleVal) : "—"}</td>
              <td className="text-right text-[11px] py-0.5" style={{ color: isSig ? "var(--scale-good)" : "var(--scale-poor)" }}>
                {sampleVal != null ? (isSig ? "Sig" : "Small") : "—"}
              </td>
            </tr>
          );
        })()}
        {Object.keys(weights).map((key) => {
          const value = gameStats[key as keyof GameStats] as number | undefined;
          const table = tables[key];
          const pctile = value != null && table ? Math.round(percentileToScore(value, table)) : null;
          return (
            <tr key={key}>
              <td className="text-muted-foreground py-0.5">{STAT_DISPLAY[key] ?? key}</td>
              <td className="text-right font-mono tabular-nums py-0.5" style={{ color: scoreColor(pctile) }}>
                {formatStatValue(key, value)}
              </td>
              <td className="text-right font-mono tabular-nums py-0.5" style={{ color: scoreColor(pctile) }}>
                {pctile != null ? pctile : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function PlayerDetail({ eval: ev, percentileTables }: { eval: EvaluatedPlayer; percentileTables?: LivePercentileTables }) {
  const role = getPlayerRole(ev.player.position);
  const { reasoning } = ev;

  return (
    <div className="px-2 py-3 bg-secondary/30 border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Left: Attributes */}
        <AttributeBreakdown stats={ev.player.stats} role={role} />

        {/* Middle: Stats (top) + Fit (bottom) */}
        <div className="space-y-3">
          {/* Stats */}
          <div className="bg-card border border-border rounded-lg px-3 py-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
              Stats
            </h3>
            <StatsTable gameStats={ev.player.gameStats ?? null} role={role} liveTables={percentileTables} />
          </div>

          {/* Fit */}
          <div className="bg-card border border-border rounded-lg px-3 py-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
              Position Fit
            </h3>
            <DefenseStatBars player={ev.player} role={role} fitScore={ev.positionFitScore ?? 0} />
          </div>
        </div>

        {/* Right: Growth (top) + Verdict (bottom) */}
        <div className="space-y-3">
          {/* Growth */}
          <div className="bg-card border border-border rounded-lg px-3 py-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
              Growth
            </h3>
            <ExplanationLines explanation={reasoning.growth} />
          </div>

          {/* Verdict */}
          <div className="bg-card border border-border rounded-lg px-3 py-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
              Verdict
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <VerdictBadge verdict={ev.recommendation} size="lg" />
              <span className="text-lg font-bold">{ev.compositeScore}</span>
            </div>

            {/* Weighted score breakdown */}
            <WeightedBreakdown ev={ev} />
          </div>
        </div>
      </div>
    </div>
  );
}
