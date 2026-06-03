/**
 * Five durability pips, filled left-to-right with a severity color.
 *
 * `goodColor` is the fill for healthy durability (4-5). It is parameterized
 * because the evaluator table renders green (`--chart-3`) while the builder/shop
 * headers render blue (`--scale-good`); the bad/poor tiers are shared. Pass it
 * explicitly to match the surrounding view.
 */
export function DurabilityPips({
  durability,
  goodColor = "var(--scale-good)",
  title,
  className = "",
}: {
  durability: number;
  goodColor?: string;
  title?: string;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-0.5${className ? ` ${className}` : ""}`} title={title}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className="inline-block w-2 h-2 rounded-full"
          style={{
            backgroundColor: i < durability
              ? durability <= 2 ? "var(--scale-bad)" : durability <= 3 ? "var(--scale-poor)" : goodColor
              : "var(--muted)",
          }}
        />
      ))}
    </span>
  );
}
