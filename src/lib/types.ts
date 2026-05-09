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
  equipment_priority?: string[];
  equipment_affixes?: string[];
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
  recomped?: boolean;
  equipment?: PlayerEquipment;
}

export interface ItemEffect {
  attribute: string;
  tier: number;
  type: "flat" | "pct";
  value: number; // display scale (e.g. 22 = +22 flat or 22%)
}

export interface EquipmentSlot {
  slot: string;
  name: string;
  emoji: string;
  effects: ItemEffect[];
}

export type PlayerEquipment = Record<string, EquipmentSlot>; // keyed by lowercase slot: head, body, hands, feet, charm/accessory

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
  tier?: number;
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
