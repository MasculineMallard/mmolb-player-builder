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
  stats: Record<string, number>; // stat name -> integer (0-1000 scale)
  lesserBoons: string[];
  greaterBoons: string[];
  mmolbPlayerId: string;
  pitches: PitchData[];
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
