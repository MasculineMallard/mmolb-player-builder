export const STAT_SHORT_LABELS: Record<string, string> = {
  contact: "Cont",
  discipline: "Disc",
  muscle: "Musc",
  lift: "Lift",
  aiming: "Aim",
  insight: "Ins",
  vision: "Vis",
  intimidation: "Intim",
  cunning: "Cunn",
  determination: "Determ",
  wisdom: "Wisd",
  selflessness: "Self",
  velocity: "Velo",
  control: "Ctrl",
  stuff: "Stuff",
  accuracy: "Acc",
  rotation: "Rot",
  presence: "Pres",
  persuasion: "Pers",
  stamina: "Stam",
  guts: "Guts",
  defiance: "Def",
  deception: "Decep",
  intuition: "Intuit",
  speed: "Speed",
  stealth: "Stealth",
  greed: "Greed",
  performance: "Perf",
  acrobatics: "Acro",
  agility: "Agi",
  arm: "Arm",
  awareness: "Aware",
  composure: "Comp",
  dexterity: "Dex",
  patience: "Pat",
  reaction: "React",
  luck: "Luck",
};

export function ResponsiveStatLabel({ stat, abbreviateLong = false }: { stat: string; abbreviateLong?: boolean }) {
  const useCompactDesktopLabel = abbreviateLong && stat.length > 8;

  return (
    <span aria-label={stat} title={stat}>
      <span className="sm:hidden">{STAT_SHORT_LABELS[stat] ?? stat}</span>
      <span className="hidden sm:inline">{useCompactDesktopLabel ? (STAT_SHORT_LABELS[stat] ?? stat) : stat}</span>
    </span>
  );
}
