"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePlayerSearch } from "@/hooks/use-player-search";
import { useTeamSearch } from "@/hooks/use-team-search";
import { usePlayerStore } from "@/store/player-store";
import { isAbortError } from "@/lib/utils";
import type { TeamSearchResult, RosterPlayer, PlayerSearchResult } from "@/lib/types";

function useKeyboardNav(itemCount: number, onSelect: (index: number) => void) {
  const [activeIndex, setActiveIndex] = useState(-1);

  // Reset when items change
  useEffect(() => {
    setActiveIndex(-1);
  }, [itemCount]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (itemCount === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, itemCount - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < itemCount) {
            onSelect(activeIndex);
          }
          break;
        case "Escape":
          e.preventDefault();
          setActiveIndex(-1);
          break;
      }
    },
    [itemCount, activeIndex, onSelect]
  );

  return { activeIndex, handleKeyDown, setActiveIndex };
}

function NameSearch({
  onSelect,
  disabled,
}: {
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  const [nameQuery, setNameQuery] = useState("");
  const { results, loading, error } = usePlayerSearch(nameQuery);
  const listRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (index: number) => {
      if (results[index]) onSelect(results[index].mmolbPlayerId);
    },
    [results, onSelect]
  );

  const { activeIndex, handleKeyDown } = useKeyboardNav(
    results.length,
    handleSelect
  );

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Search by player name..."
        value={nameQuery}
        onChange={(e) => setNameQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-activedescendant={
          activeIndex >= 0 ? `name-result-${activeIndex}` : undefined
        }
      />
      {loading && (
        <p className="text-sm text-muted-foreground">Searching...</p>
      )}
      {error && (
        <p className="text-sm text-destructive">Search failed. Try again.</p>
      )}
      {results.length > 0 && (
        <div
          ref={listRef}
          role="listbox"
          className="space-y-0.5 max-h-48 overflow-y-auto"
        >
          {results.map((p: PlayerSearchResult, i: number) => (
            <button
              key={p.mmolbPlayerId}
              id={`name-result-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => onSelect(p.mmolbPlayerId)}
              disabled={disabled}
              className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-2 disabled:opacity-50 ${
                i === activeIndex
                  ? "bg-primary/15 text-foreground"
                  : "hover:bg-secondary"
              }`}
            >
              <span className="flex-1">{p.name}</span>
              <span className="text-sm text-muted-foreground">
                {p.teamEmoji} {p.teamName}
              </span>
              <span className="text-sm text-muted-foreground">
                Lv.{p.level}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamBrowser({
  onSelect,
  disabled,
}: {
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  const [teamQuery, setTeamQuery] = useState("");
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamSearchResult | null>(null);

  const { results: teams, loading: loadingTeams, error: teamError } =
    useTeamSearch(teamQuery);
  const { lastTeam, lastRoster } = usePlayerStore();

  const rosterAbort = useRef<AbortController | null>(null);
  const teamListRef = useRef<HTMLDivElement>(null);
  const rosterListRef = useRef<HTMLDivElement>(null);

  // Restore last team/roster from store
  useEffect(() => {
    if (lastTeam && lastRoster.length > 0 && !selectedTeam) {
      setSelectedTeam(lastTeam);
      setRoster(lastRoster);
    }
  }, [lastTeam, lastRoster, selectedTeam]);

  const loadRoster = async (team: TeamSearchResult) => {
    rosterAbort.current?.abort();
    const controller = new AbortController();
    rosterAbort.current = controller;

    setSelectedTeam(team);
    setLoadingRoster(true);
    setRosterError(false);
    try {
      const res = await fetch(`/api/teams/${team.mmolbTeamId}/roster`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (!res.ok) throw new Error(`Roster load failed: ${res.status}`);
      const data: RosterPlayer[] = await res.json();
      setRoster(data);
      usePlayerStore.getState().setLastTeam(team, data);
    } catch (err) {
      if (isAbortError(err)) return;
      console.error("Roster load error:", err);
      setRoster([]);
      setRosterError(true);
    } finally {
      setLoadingRoster(false);
    }
  };

  // Keyboard nav for team list
  const handleTeamSelect = useCallback(
    (index: number) => {
      if (teams[index]) loadRoster(teams[index]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teams]
  );

  const teamNav = useKeyboardNav(
    selectedTeam ? 0 : teams.length,
    handleTeamSelect
  );

  // Keyboard nav for roster
  const handleRosterSelect = useCallback(
    (index: number) => {
      if (roster[index]) onSelect(roster[index].mmolbPlayerId);
    },
    [roster, onSelect]
  );

  const rosterNav = useKeyboardNav(
    selectedTeam ? roster.length : 0,
    handleRosterSelect
  );

  // Scroll active items into view
  useEffect(() => {
    if (teamNav.activeIndex >= 0 && teamListRef.current) {
      const item = teamListRef.current.children[teamNav.activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [teamNav.activeIndex]);

  useEffect(() => {
    if (rosterNav.activeIndex >= 0 && rosterListRef.current) {
      const item = rosterListRef.current.children[rosterNav.activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [rosterNav.activeIndex]);

  return (
    <div className="space-y-2">
      {!selectedTeam ? (
        <>
          <input
            type="text"
            placeholder="Search teams..."
            value={teamQuery}
            onChange={(e) => setTeamQuery(e.target.value)}
            onKeyDown={teamNav.handleKeyDown}
            className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            role="combobox"
            aria-expanded={teams.length > 0}
          />
          {loadingTeams && (
            <p className="text-sm text-muted-foreground">Searching...</p>
          )}
          {teamError && (
            <p className="text-sm text-destructive">Search failed. Try again.</p>
          )}
          {teams.length > 0 && (
            <div
              ref={teamListRef}
              role="listbox"
              className="space-y-1 max-h-48 overflow-y-auto"
            >
              {teams.map((team, i) => (
                <button
                  key={team.mmolbTeamId}
                  role="option"
                  aria-selected={i === teamNav.activeIndex}
                  onClick={() => loadRoster(team)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    i === teamNav.activeIndex
                      ? "bg-primary/15 text-foreground"
                      : "hover:bg-secondary"
                  }`}
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
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Change
            </button>
          </div>
          {loadingRoster ? (
            <p className="text-xs text-muted-foreground">
              Loading roster...
            </p>
          ) : rosterError ? (
            <p className="text-sm text-destructive">
              Failed to load roster. Try again.
            </p>
          ) : (
            <div className="relative">
              {/* Invisible input to capture keyboard events for roster nav */}
              <input
                type="text"
                className="sr-only"
                onKeyDown={rosterNav.handleKeyDown}
                aria-label="Navigate roster with arrow keys"
                tabIndex={0}
              />
              <div
                ref={rosterListRef}
                role="listbox"
                className="space-y-0.5 max-h-[60vh] overflow-y-auto"
              >
                {roster.map((p, i) => (
                  <button
                    key={p.mmolbPlayerId}
                    role="option"
                    aria-selected={i === rosterNav.activeIndex}
                    onClick={() => onSelect(p.mmolbPlayerId)}
                    disabled={disabled}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-2 disabled:opacity-50 ${
                      i === rosterNav.activeIndex
                        ? "bg-primary/15 text-foreground"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <span className="text-muted-foreground w-8 text-sm">
                      {p.position}
                    </span>
                    <span className="flex-1">{p.name}</span>
                    <span className="text-sm text-muted-foreground">
                      Lv.{p.level}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PlayerSearch() {
  const [mode, setMode] = useState<"team" | "name">("team");
  const { importPlayer, loading: importLoading } = usePlayerStore();

  return (
    <div className="space-y-3">
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
        <TeamBrowser onSelect={importPlayer} disabled={importLoading} />
      ) : (
        <NameSearch onSelect={importPlayer} disabled={importLoading} />
      )}
    </div>
  );
}
