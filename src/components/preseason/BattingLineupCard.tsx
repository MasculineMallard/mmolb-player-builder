import type { BattingOrderRec, BattingOrderEntry } from "@/lib/preseason-recommend";

export interface BattingLineupCardProps {
  recommendation: BattingOrderRec;
}

function barWidth(entry: BattingOrderEntry): number {
  if (entry.value == null) return 0;
  const visualCeiling = entry.driver === "OBP" ? 0.55 : entry.driver === "SLG" ? 0.85 : 1.35;
  return Math.min(100, Math.max(3, (entry.value / visualCeiling) * 100));
}

export function BattingLineupCard({ recommendation }: BattingLineupCardProps) {
  if (recommendation.lineup.length === 0) {
    return (
      <section data-testid="batting-lineup-card" className="rounded-lg border border-border bg-card px-4 py-6 text-center">
        <h2 className="font-semibold text-foreground">Recommended Batting Order</h2>
        <p className="mt-1 text-sm text-muted-foreground">No batter has reached the 10 PA lineup floor yet.</p>
      </section>
    );
  }

  return (
    <section data-testid="batting-lineup-card" className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-semibold text-foreground">Recommended Batting Order</h2>
          <p className="text-xs text-muted-foreground">Slots 1–2 OBP · 3–4 SLG · 5–9 OPS</p>
        </div>
        <span className="text-xs text-muted-foreground">{recommendation.qualifiedCount} qualified</span>
      </div>

      <ol className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
        {recommendation.lineup.map((entry) => (
          <li key={entry.player.mmolbPlayerId} className="relative overflow-hidden rounded-md border border-border bg-secondary/40 px-2.5 py-2">
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 bg-primary/10"
              style={{ width: `${barWidth(entry)}%` }}
            />
            <div className="relative flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {entry.slot}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{entry.player.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {entry.lowSample ? "Low sample · " : ""}{entry.player.sampleSize.PA} PA
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wide text-primary">{entry.driver}</div>
                <div className="font-mono text-sm font-semibold text-foreground">
                  {entry.value == null ? "—" : entry.value.toFixed(3)}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {recommendation.incomplete && (
        <div className="mt-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-2 text-xs text-yellow-500">
          Lineup incomplete: fewer than nine batters have reached 10 Offseason PA.
        </div>
      )}
    </section>
  );
}
