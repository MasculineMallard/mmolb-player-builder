/** Stat categories matching attributes.json structure. */
export const STAT_CATEGORIES = {
  batting: [
    "contact",
    "discipline",
    "muscle",
    "lift",
    "aiming",
    "insight",
    "vision",
    "intimidation",
  ],
  baserunning: ["cunning", "stealth", "greed", "performance", "speed"],
  pitching: [
    "velocity",
    "control",
    "stuff",
    "accuracy",
    "rotation",
    "presence",
    "persuasion",
    "stamina",
    "deception",
    "intuition",
  ],
  defense: [
    "acrobatics",
    "agility",
    "arm",
    "awareness",
    "composure",
    "dexterity",
    "patience",
    "reaction",
  ],
  mental: ["determination", "wisdom", "selflessness", "guts", "defiance"],
  misc: ["luck"],
} as const;

/** Display order for stat grid (flat list). */
export const STAT_DISPLAY_ORDER = [
  ...STAT_CATEGORIES.batting,
  ...STAT_CATEGORIES.baserunning,
  ...STAT_CATEGORIES.pitching,
  ...STAT_CATEGORIES.defense,
  ...STAT_CATEGORIES.mental,
  ...STAT_CATEGORIES.misc,
];

/** Color thresholds for stat values (0-1000 scale). */
export function getStatColor(value: number): string {
  if (value >= 400) return "var(--chart-3)"; // green
  if (value >= 250) return "var(--chart-2)"; // gold
  if (value >= 100) return "var(--foreground)"; // neutral
  return "var(--chart-4)"; // red
}

/** Slot-to-position mapping (from MMOLDB slot names). */
export const SLOT_TO_POSITION: Record<string, string> = {
  catcher: "C",
  firstbase: "1B",
  secondbase: "2B",
  thirdbase: "3B",
  shortstop: "SS",
  leftfield: "LF",
  centerfield: "CF",
  rightfield: "RF",
  designatedhitter: "DH",
  startingpitcher: "SP",
  startingpitcher1: "SP",
  startingpitcher2: "SP",
  startingpitcher3: "SP",
  startingpitcher4: "SP",
  startingpitcher5: "SP",
  reliefpitcher: "RP",
  reliefpitcher1: "RP",
  reliefpitcher2: "RP",
  reliefpitcher3: "RP",
  closer: "CL",
  pitcher: "P",
  bench: "Bench",
  benchbatter: "Bench",
  benchbatter1: "Bench",
  benchbatter2: "Bench",
  benchbatter3: "Bench",
  benchpitcher: "Bench",
  benchpitcher1: "Bench",
  benchpitcher2: "Bench",
  benchpitcher3: "Bench",
};

/** Pitcher positions for determining player type. */
export const PITCHER_POSITIONS = new Set(["SP", "RP", "CL", "P"]);

/** S11 milestone levels for progression timeline. */
export const MILESTONE_LEVELS = [1, 5, 10, 15, 20, 25, 30] as const;

/** Position sort order for roster display. */
export const POSITION_ORDER: Record<string, number> = {
  SP: 0,
  RP: 1,
  CL: 2,
  C: 3,
  "1B": 4,
  "2B": 5,
  "3B": 6,
  SS: 7,
  LF: 8,
  CF: 9,
  RF: 10,
  DH: 11,
  P: 12,
  Bench: 99,
};

/** Stat distribution ratios. */
export const BATTER_DISTRIBUTION = {
  core: 0.5,
  defense: 0.2,
  flex: 0.3,
} as const;

export const PITCHER_DISTRIBUTION = {
  core: 0.5,
  supporting: 0.3,
  flex: 0.2,
} as const;
