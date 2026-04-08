export class NoStatsError extends Error {
  constructor(playerId: string) {
    super(`Player ${playerId} exists but has no stats`);
    this.name = "NoStatsError";
  }
}
