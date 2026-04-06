import type { Recommendation } from "@/lib/evaluator-types";

const VERDICT_STYLES: Record<Recommendation, { bg: string; text: string }> = {
  KEEP: { bg: "rgba(63, 185, 80, 0.15)", text: "#3FB950" },
  HOLD: { bg: "rgba(255, 215, 0, 0.15)", text: "#FFD700" },
  MULCH: { bg: "rgba(248, 81, 73, 0.15)", text: "#F85149" },
};

export function VerdictBadge({
  verdict,
  size = "sm",
}: {
  verdict: Recommendation;
  size?: "sm" | "lg";
}) {
  const style = VERDICT_STYLES[verdict];
  const cls =
    size === "lg"
      ? "px-4 py-1.5 text-base font-bold rounded-md"
      : "px-2 py-0.5 text-sm font-semibold rounded";

  return (
    <span className={cls} style={{ background: style.bg, color: style.text }}>
      {verdict}
    </span>
  );
}
