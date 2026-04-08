function scoreColor(score: number): string {
  if (score >= 60) return "var(--scale-good)"; // blue
  if (score >= 40) return "var(--scale-mid)"; // grey
  return "var(--scale-bad)"; // yellow
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
