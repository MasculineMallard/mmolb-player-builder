import type { Archetype } from "./types";

/** Base path for fetch calls (matches next.config basePath). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/pop";

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

