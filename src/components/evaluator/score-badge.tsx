function scoreColor(score: number): string {
  if (score >= 65) return "#3B82F6"; // blue — star
  if (score >= 55) return "#93C5FD"; // light blue — strong
  if (score >= 42) return "#8B949E"; // grey — roster
  if (score >= 35) return "#EAB308"; // yellow — fringe
  return "#F85149"; // red — mulch
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
