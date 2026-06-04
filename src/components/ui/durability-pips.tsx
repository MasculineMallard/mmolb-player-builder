/**
 * Five durability pips, filled left-to-right with the app's severity scale
 * (scale-bad → scale-poor → scale-good), matching how scores/stats are colored
 * elsewhere.
 */
export function DurabilityPips({
  durability,
  title,
  className = "",
}: {
  durability: number;
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
              ? durability <= 2 ? "var(--scale-bad)" : durability <= 3 ? "var(--scale-poor)" : "var(--scale-good)"
              : "var(--muted)",
          }}
        />
      ))}
    </span>
  );
}
