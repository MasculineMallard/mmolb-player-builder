import type { Recommendation } from "@/lib/evaluator-types";

const VERDICT_STYLES: Record<Recommendation, { bg: string; text: string }> = {
  STAR: { bg: "rgba(59, 130, 246, 0.20)", text: "#3B82F6" },
  STRONG: { bg: "rgba(96, 165, 250, 0.15)", text: "#93C5FD" },
  ROSTER: { bg: "rgba(139, 148, 158, 0.15)", text: "#8B949E" },
  FRINGE: { bg: "rgba(234, 179, 8, 0.15)", text: "#EAB308" },
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

  const glow = verdict === "STAR"
    ? "0 0 8px rgba(59, 130, 246, 0.5), 0 0 16px rgba(59, 130, 246, 0.2)"
    : undefined;

  return (
    <span className={cls} style={{ background: style.bg, color: style.text, boxShadow: glow }}>
      {verdict}
    </span>
  );
}
