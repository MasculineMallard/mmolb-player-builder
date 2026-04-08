import type { PlayerData } from "./types";

export type Recommendation = "MULCH" | "HOLD" | "KEEP";

export interface ScoreExplanation {
  score: number | null;
  label: string;
  lines: string[];
}

export interface StructuredReasoning {
  attributes: ScoreExplanation;
  fit: ScoreExplanation;
  stats: ScoreExplanation;
  growth: ScoreExplanation;
}

export interface EvaluatedPlayer {
  player: PlayerData;
  recommendation: Recommendation;
  compositeScore: number; // 0-100
  attributeScore: number; // 0-100
  statsScore: number | null; // 0-100, null if no game stats
  growthScore: number; // 0-100
  positionFitScore: number | null; // 0-100, null for pitchers/DH
  detectedArchetype: {
    key: string;
    name: string;
    emoji: string;
    fitPct: number;
  };
  reasoning: StructuredReasoning;
  flags: EvalFlag[];
}

export type EvalFlag =
  | "MAXED_BOTTOM_QUARTILE"
  | "T1_VOID_LATE"
  | "CUNNING_OBP_TRAP"
  | "DEFENSE_LOCKED"
  | "BOON_CONFLICT";

export interface GameStats {
  // Batting
  PA?: number;
  AVG?: number;
  OBP?: number;
  SLG?: number;
  OPS?: number;
  BB_PCT?: number;
  K_PCT?: number;
  BABIP?: number;
  HR?: number;
  SB?: number;
  SB_PCT?: number;
  // Pitching
  IP?: number;
  ERA?: number;
  WHIP?: number;
  K9?: number;
  BB9?: number;
  H9?: number;
  HR9?: number;
}

export type PlayerRole = "batter" | "pitcher";

export interface PercentileEntry {
  pct: number;
  value: number;
}
