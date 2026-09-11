"use client";

import { useCallback, useMemo, useState } from "react";
import { useTeamSearch } from "@/hooks/use-team-search";
import { BASE_PATH } from "@/lib/constants";
import { loadPositionDefense, type PositionDefenseMap } from "@/lib/evaluator-data";
import type { PreseasonPlayerData } from "@/lib/preseason-data";
import { recommendBattingOrder, recommendPitchingStaff, recommendPositions } from "@/lib/preseason-recommend";
import type { TeamSearchResult } from "@/lib/types";
import { BattingLineupCard } from "./BattingLineupCard";
import { FieldDiagram } from "./FieldDiagram";
import { PitchingStaffCard } from "./PitchingStaffCard";

export interface PreseasonViewProps {
  initialTeam?: TeamSearchResult | null;
}

type LoadState = "idle" | "loading" | "ready" | "error";

function teamLabel(team: TeamSearchResult): string {
  return [team.location, team.name].filter(Boolean).join(" ");
}

export function PreseasonView({ initialTeam = null }: PreseasonViewProps) {
  const [query, setQuery] = useState("");
  const { results: teamResults, loading: searching, error: searchError } = useTeamSearch(query);
  const [selectedTeam, setSelectedTeam] = useState<TeamSearchResult | null>(initialTeam);
  const [players, setPlayers] = useState<PreseasonPlayerData[]>([]);
  const [positionDefense, setPositionDefense] = useState<PositionDefenseMap | null>(null);
  const [seasonStatus, setSeasonStatus] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const pitchers = useMemo(
    () => players.filter((player) => player.preseasonPitching != null || ["SP", "RP", "CL", "P"].includes(player.position ?? "")),
    [players],
  );
  const batters = useMemo(
    () => players.filter((player) => !["SP", "RP", "CL", "P"].includes(player.position ?? "")),
    [players],
  );
  const battingRecommendation = useMemo(() => recommendBattingOrder(batters), [batters]);
  const staffRecommendation = useMemo(() => recommendPitchingStaff(pitchers), [pitchers]);
  const positionRecommendation = useMemo(
    () => positionDefense ? recommendPositions(players, positionDefense) : null,
    [players, positionDefense],
  );
  const warnings = useMemo(
    () => players.flatMap((player) => player.dataWarnings.map((warning) => `${player.name}: ${warning}`)),
    [players],
  );
  const hasPreseasonData = players.some((player) => player.sampleSize.PA > 0 || player.sampleSize.outs > 0);

  const loadTeam = useCallback(async (team: TeamSearchResult) => {
    setSelectedTeam(team);
    setQuery("");
    setLoadState("loading");
    setError(null);
    setPlayers([]);

    try {
      const [response, defense] = await Promise.all([
        fetch(`${BASE_PATH}/api/teams/${team.mmolbTeamId}/preseason`, {
          signal: AbortSignal.timeout(30000),
          cache: "no-store",
        }),
        loadPositionDefense(),
      ]);
      if (!response.ok) throw new Error(`Preseason roster fetch failed (${response.status})`);
      const data = await response.json() as unknown;
      if (!Array.isArray(data)) throw new Error("Preseason roster returned an invalid response");
      if (data.length === 0) throw new Error("No roster data returned. The MMOLB API may be temporarily unavailable.");

      setSeasonStatus(response.headers.get("X-MMOLB-Season-Status"));
      setPositionDefense(defense);
      setPlayers(data as PreseasonPlayerData[]);
      setLoadState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load preseason data");
      setLoadState("error");
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-3">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Perfunctory Preseason Plotter</h1>
        <p className="text-sm text-muted-foreground">Turn the current Offseason exhibition sample into a staff, batting order, and field alignment.</p>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search teams..."
          aria-label="Search teams"
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        {searchError && <div className="mt-1 text-xs text-destructive">Team search failed. Try again.</div>}
        {teamResults.length > 0 && loadState !== "loading" && (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
            {teamResults.map((team) => (
              <button
                key={team.mmolbTeamId}
                type="button"
                onClick={() => loadTeam(team)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                {team.emoji && <span>{team.emoji}</span>}
                <span>{teamLabel(team)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loadState === "idle" && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <div className="mb-2 text-4xl opacity-40">⚾</div>
          <p className="text-sm text-muted-foreground">{searching ? "Searching teams..." : "Search for a team to plot its Offseason decisions."}</p>
        </div>
      )}

      {loadState === "loading" && (
        <div className="rounded-lg border border-border bg-card py-12 text-center">
          <div className="mb-2 animate-pulse text-4xl">⚾</div>
          <p className="text-sm text-muted-foreground">Loading {selectedTeam ? teamLabel(selectedTeam) : "roster"}...</p>
        </div>
      )}

      {loadState === "error" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loadState === "ready" && selectedTeam && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-foreground">{selectedTeam.emoji} {teamLabel(selectedTeam)}</span>
            <span className="text-xs text-muted-foreground">{players.length} rostered players · API phase {seasonStatus ?? "unknown"}</span>
            <button
              type="button"
              onClick={() => loadTeam(selectedTeam)}
              className="ml-auto rounded-md border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Refresh
            </button>
          </div>

          {warnings.length > 0 && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-500">
              Partial MMOLB data: {warnings.join(" · ")}. Those players remain visible and are not silently omitted.
            </div>
          )}

          {!hasPreseasonData ? (
            <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
              <h2 className="font-semibold text-foreground">No current Offseason sample</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {seasonStatus === "Offseason"
                  ? "This roster has not recorded current-window Offseason stats yet."
                  : "The between-season window is closed or this roster has no current-window Offseason stats."}
              </p>
            </div>
          ) : (
            <>
              {(staffRecommendation.hasLowSample || battingRecommendation.hasLowSample) && (
                <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-500">
                  Small Offseason sample: flagged recommendations lean more heavily on underlying attributes. Pitchers below 3 IP remain Depth; batters below 10 PA stay out of the order.
                </div>
              )}
              <PitchingStaffCard pitchers={pitchers} />
              <BattingLineupCard recommendation={battingRecommendation} />
              {positionRecommendation && <FieldDiagram recommendation={positionRecommendation} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
