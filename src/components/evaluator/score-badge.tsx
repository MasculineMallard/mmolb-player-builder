import { VERDICT_COLORS, RECOMMENDATION_THRESHOLDS } from "@/lib/evaluator-types";

function scoreColor(score: number): string {
  for (const { min, verdict } of RECOMMENDATION_THRESHOLDS) {
    if (score >= min) return VERDICT_COLORS[verdict];
  }
  return VERDICT_COLORS.MULCH;
}

export function ScoreBadge({
  score,
  label,
}: {
  score: number | null;
  label?: string;
}) {
  if (score == null) {
    return (
      <div className="text-center">
        {label && (
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        )}
        <div className="text-sm text-muted-foreground">N/A</div>
      </div>
    );
  }

  return (
    <div className="text-center">
      {label && (
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      )}
      <div className="text-sm font-bold" style={{ color: scoreColor(score) }}>
        {score}
      </div>
    </div>
  );
}
