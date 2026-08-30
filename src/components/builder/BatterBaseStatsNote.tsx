/**
 * Info note on the batter builder (below the archetype selector). Explains that the
 * displayed stats are base values (no boons/items) and points the user at the archetype
 * picker for fit + level-up targets. Batter path only — renders nothing for pitchers.
 * Wording avoids claiming any archetype ranking, so it needs no hasArchetype gate.
 */
export function BatterBaseStatsNote({ isPitcher }: { isPitcher: boolean }) {
  if (isPitcher) return null;
  return (
    <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2">
      Stats shown are base values only (no boons or items). Pick an archetype above to see fit and
      level-up targets.
    </p>
  );
}
