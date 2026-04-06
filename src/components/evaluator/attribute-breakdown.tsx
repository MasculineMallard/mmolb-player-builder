import { STAT_TIERS, ROLE_STATS } from "@/lib/evaluator-data";
import type { PlayerRole } from "@/lib/evaluator-types";

function tierLabel(stat: string, role: PlayerRole): { tier: string; color: string } {
  const tiers = STAT_TIERS[role];
  if (tiers.T1.includes(stat)) return { tier: "T1", color: "var(--chart-1)" };
  if (tiers.T2.includes(stat)) return { tier: "T2", color: "var(--muted-foreground)" };
  return { tier: "T3", color: "var(--muted-foreground)" };
}

function barColor(value: number, tier: string): string {
  if (tier === "T1") {
    if (value >= 500) return "var(--chart-3)"; // green — elite
    if (value >= 200) return "var(--chart-1)"; // blue — good
    if (value > 0) return "var(--scale-poor)"; // gold — developing
    return "var(--chart-4)"; // red — missing
  }
  return "var(--muted-foreground)"; // gray for T2/T3
}

export function AttributeBreakdown({
  stats,
  role,
}: {
  stats: Record<string, number>;
  role: PlayerRole;
}) {
  const roleStats = ROLE_STATS[role];

  // Sort: T1 first, then T2, then T3. Within tier, sort by value descending.
  const sorted = [...roleStats].sort((a, b) => {
    const ta = tierLabel(a, role);
    const tb = tierLabel(b, role);
    const tierOrder = { T1: 0, T2: 1, T3: 2 };
    const ao = tierOrder[ta.tier as keyof typeof tierOrder] ?? 3;
    const bo = tierOrder[tb.tier as keyof typeof tierOrder] ?? 3;
    if (ao !== bo) return ao - bo;
    return (stats[b] ?? 0) - (stats[a] ?? 0);
  });

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
        <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
        Attributes
      </h3>
      <div className="space-y-1">
        {sorted.map((stat) => {
          const value = stats[stat] ?? 0;
          const { tier, color } = tierLabel(stat, role);
          const pct = Math.min(100, (value / 500) * 100);
          const isT3 = tier === "T3";

          return (
            <div key={stat} className={isT3 ? "opacity-40" : ""}>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[11px] font-bold w-5 text-center"
                    style={{ color }}
                  >
                    {tier}
                  </span>
                  <span className="capitalize">{stat}</span>
                </div>
                <span className="font-mono text-muted-foreground">{value}</span>
              </div>
              <div className="h-[11px] bg-muted/80 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor(value, tier),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
