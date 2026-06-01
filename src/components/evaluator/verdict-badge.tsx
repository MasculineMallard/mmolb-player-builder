import type { Recommendation } from "@/lib/evaluator-types";
import { VERDICT_COLORS } from "@/lib/evaluator-types";

// Badge background tint per verdict. Text color is single-sourced from VERDICT_COLORS.
const VERDICT_BG: Record<Recommendation, string> = {
  STAR: "rgba(59, 130, 246, 0.20)",
  STRONG: "rgba(96, 165, 250, 0.15)",
  ROSTER: "rgba(139, 148, 158, 0.15)",
  FRINGE: "rgba(234, 179, 8, 0.15)",
  MULCH: "rgba(248, 81, 73, 0.15)",
};

export function VerdictBadge({
  verdict,
  size = "sm",
}: {
  verdict: Recommendation;
  size?: "sm" | "lg";
}) {
  const cls =
    size === "lg"
      ? "px-4 py-1.5 text-base font-bold rounded-md"
      : "px-2 py-0.5 text-sm font-semibold rounded";

  const glow = verdict === "STAR"
    ? "0 0 8px rgba(59, 130, 246, 0.5), 0 0 16px rgba(59, 130, 246, 0.2)"
    : undefined;

  return (
    <span className={cls} style={{ background: VERDICT_BG[verdict], color: VERDICT_COLORS[verdict], boxShadow: glow }}>
      {verdict}
    </span>
  );
}
