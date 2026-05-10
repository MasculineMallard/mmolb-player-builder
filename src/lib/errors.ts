export class NoStatsError extends Error {
  constructor(playerId: string) {
    super(`Player ${playerId} exists but has no stats`);
    this.name = "NoStatsError";
  }
}

export class ApiUnavailableError extends Error {
  constructor(playerId: string, cause?: unknown) {
    super(`MMOLB API unavailable for player ${playerId}`);
    this.name = "ApiUnavailableError";
    this.cause = cause;
  }
}
