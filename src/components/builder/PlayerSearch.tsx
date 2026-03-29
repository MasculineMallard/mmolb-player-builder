"use client";

import { useState, useEffect } from "react";
import { usePlayerSearch } from "@/hooks/use-player-search";
import { usePlayerStore } from "@/store/player-store";
import type { TeamSearchResult, RosterPlayer } from "@/lib/types";

export function PlayerSearch() {
  const [mode, setMode] = useState<"team" | "name">("team");
  const [teamQuery, setTeamQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [teams, setTeams] = useState<TeamSearchResult[]>([]);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamSearchResult | null>(
    null
  );

  const { results: nameResults, loading: nameLoading } =
    usePlayerSearch(nameQuery);
  const { importPlayer, loading: importLoading, lastTeam, lastRoster } =
    usePlayerStore();

  // Restore last team/roster from store
  useEffect(() => {
    if (lastTeam && lastRoster.length > 0 && !selectedTeam) {
      setSelectedTeam(lastTeam);
      setRoster(lastRoster);
    }
  }, [lastTeam, lastRoster, selectedTeam]);

  const searchTeams = async (q: string) => {
    if (q.trim().length < 2) {
      setTeams([]);
      return;
    }
    setLoadingTeams(true);
    try {
      const res = await fetch(
        `/api/teams/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setTeams(data);
    } catch {
      setTeams([]);
    }
    setLoadingTeams(false);
  };

  const loadRoster = async (team: TeamSearchResult) => {
    setSelectedTeam(team);
    setLoadingRoster(true);
    try {
      const res = await fetch(`/api/teams/${team.mmolbTeamId}/roster`);
      const data: RosterPlayer[] = await res.json();
      setRoster(data);
      usePlayerStore.getState().setLastTeam(team, data);
    } catch {
      setRoster([]);
    }
    setLoadingRoster(false);
  };

  const handleImport = (playerId: string) => {
    importPlayer(playerId);
  };

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      <div className="flex gap-1 bg-muted rounded-md p-1">
        <button
          onClick={() => setMode("team")}
          className={`flex-1 text-sm py-1.5 rounded transition-colors ${
            mode === "team"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Browse Teams
        </button>
        <button
          onClick={() => setMode("name")}
          className={`flex-1 text-sm py-1.5 rounded transition-colors ${
            mode === "name"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Search Name
        </button>
      </div>

      {mode === "team" ? (
        <div className="space-y-2">
          {!selectedTeam ? (
            <>
              <input
                type="text"
                placeholder="Search teams..."
                value={teamQuery}
                onChange={(e) => {
                  setTeamQuery(e.target.value);
                  searchTeams(e.target.value);
                }}
                className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {loadingTeams && (
                <p className="text-xs text-muted-foreground">Searching...</p>
              )}
              {teams.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {teams.map((team) => (
                    <button
                      key={team.mmolbTeamId}
                      onClick={() => loadRoster(team)}
                      className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors"
                    >
                      {team.emoji} {team.location} {team.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedTeam.emoji} {selectedTeam.location}{" "}
                  {selectedTeam.name}
                </span>
                <button
                  onClick={() => {
                    setSelectedTeam(null);
                    setRoster([]);
                    setTeamQuery("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Change
                </button>
              </div>
              {loadingRoster ? (
                <p className="text-xs text-muted-foreground">
                  Loading roster...
                </p>
              ) : (
                <div className="space-y-0.5 max-h-64 overflow-y-auto">
                  {roster.map((p) => (
                    <button
                      key={p.mmolbPlayerId}
                      onClick={() => handleImport(p.mmolbPlayerId)}
                      disabled={importLoading}
                      className="w-full text-left px-3 py-1.5 rounded text-sm hover:bg-secondary transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <span className="text-muted-foreground w-8 text-xs">
                        {p.position}
                      </span>
                      <span className="flex-1">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Lv.{p.level}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search by player name..."
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {nameLoading && (
            <p className="text-xs text-muted-foreground">Searching...</p>
          )}
          {nameResults.length > 0 && (
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {nameResults.map((p) => (
                <button
                  key={p.mmolbPlayerId}
                  onClick={() => handleImport(p.mmolbPlayerId)}
                  disabled={importLoading}
                  className="w-full text-left px-3 py-1.5 rounded text-sm hover:bg-secondary transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="flex-1">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.teamEmoji} {p.teamName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Lv.{p.level}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
