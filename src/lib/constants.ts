import type { Archetype } from "./types";

/** Base path for fetch calls (matches next.config basePath). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/pop";

/** Current season display label. Update when a new season starts. */
export const CURRENT_SEASON = "Season 12";

/** Current season number. Update when a new season starts. */
export const CURRENT_SEASON_NUMBER = 12;

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
    "cunning",
    "determination",
    "wisdom",
    "selflessness",
  ],
  pitching: [
    "velocity",
    "control",
    "stuff",
    "accuracy",
    "rotation",
    "presence",
    "persuasion",
    "stamina",
    "guts",
    "defiance",
    "deception",
    "intuition",
  ],
  baserunning: ["speed", "stealth", "greed", "performance"],
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
  luck: ["luck"],
} as const;

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

/** Human-readable labels for stat categories. */
export const CATEGORY_LABELS: Record<string, string> = {
  batting: "Batting",
  pitching: "Pitching",
  baserunning: "Baserunning",
  defense: "Defense",
  luck: "Luck",
};

/** Pitcher positions for determining player type. */
export const PITCHER_POSITIONS = new Set(["SP", "RP", "CL", "P"]);

/** S11 milestone levels for progression timeline. */
export const MILESTONE_LEVELS = [1, 5, 10, 15, 20, 25, 30] as const;

/** Default archetype used when none is selected. */
export const EMPTY_ARCHETYPE: Archetype = {
  name: "No archetype",
  description: "",
  priority_stats: [],
  secondary_stats: [],
  stat_weights: {},
};

/** Position sort order for the builder roster / mmolb-transform — pitchers first. */
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

/**
 * Position sort order for the roster *evaluator* table (Mulch-o-Meter) — batters
 * first, then pitchers. Intentionally differs from POSITION_ORDER (pitchers-first);
 * kept as its own named constant so each view's grouping is explicit rather than a
 * drifting local copy.
 */
export const EVAL_POSITION_ORDER: Record<string, number> = {
  C: 0, "1B": 1, "2B": 2, "3B": 3, SS: 4,
  LF: 5, CF: 6, RF: 7, DH: 8,
  SP: 9, RP: 10, CL: 11,
  Bench: 12,
};

/** Batter positions for position-override dropdowns (includes DH). */
export const BATTER_POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"] as const;

/**
 * Fielding positions for best-fit defensive scoring. DH is excluded: it has no
 * defensive value, so it is never the "best fit" target for a bench bat.
 */
export const FIELDING_POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"] as const;

/** Every manually-assignable position in the roster evaluator table (batters + DH + pitchers). */
export const ROSTER_POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "SP", "RP", "CL"] as const;

/** Item affix tiers — max flat (+X) and percent (+X%) roll the tool models per tier. */
export const ITEM_TIERS = [
  { tier: 1, flatMax: 5,  pctMax: 4 },
  { tier: 2, flatMax: 10, pctMax: 8 },
  { tier: 3, flatMax: 15, pctMax: 12 },
  { tier: 4, flatMax: 20, pctMax: 16 },
  { tier: 5, flatMax: 25, pctMax: 20 },
  { tier: 6, flatMax: 30, pctMax: 24 },
  { tier: 7, flatMax: 35, pctMax: 28 },
] as const;

