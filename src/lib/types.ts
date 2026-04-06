export interface Archetype {
  name: string;
  emoji?: string;
  description: string;
  priority_stats: string[];
  secondary_stats: string[];
  stat_weights: Record<string, number>;
  recommended_pitches?: string[];
  recommended_lesser_boons?: string[];
  recommended_greater_boons?: string[];
  stat_targets?: Record<string, number>;
}

export interface PitchData {
  name: string;
  frequency: number; // 0.0 to 1.0
}

export interface PlayerData {
  name: string;
  firstName: string;
  lastName: string;
  level: number;
  teamName: string | null;
  teamEmoji: string | null;
  position: string | null;
  durability: number; // 0-5 pips (derived from 0.0-1.0 DB value)
  stats: Record<string, number>; // stat name -> integer (0-1000 scale)
  lesserBoons: string[];
  greaterBoons: string[];
  mmolbPlayerId: string;
  pitches: PitchData[];
  gameStats?: import("./evaluator-types").GameStats | null;
}

export interface PlayerSearchResult {
  mmolbPlayerId: string;
  firstName: string;
  lastName: string;
  name: string;
  level: number;
  teamName: string | null;
  teamEmoji: string | null;
}

export interface TeamSearchResult {
  mmolbTeamId: string;
  name: string;
  emoji: string | null;
  location: string | null;
}

export type PitchTypeInfo = {
  name: string;
  priority_stats?: string[];
  secondary_stats?: string[];
};

export type PitchTypesMap = Record<string, PitchTypeInfo>;

export interface RosterPlayer {
  mmolbPlayerId: string;
  firstName: string;
  lastName: string;
  name: string;
  level: number;
  slot: string | null;
  position: string;
  isBench: boolean;
}
