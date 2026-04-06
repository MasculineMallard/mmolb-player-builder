"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { TeamSearchResult, RosterPlayer, PlayerData, Archetype } from "@/lib/types";
import type { EvaluatedPlayer } from "@/lib/evaluator-types";
import { evaluatePlayer, findBestFitPosition } from "@/lib/evaluator";
import {
  loadBatterArchetypes,
  loadPitcherArchetypes,
  loadPositionDefense,
  getBoonLookup,
  loadLivePercentiles,
  type PositionDefenseMap,
  type LivePercentileTables,
} from "@/lib/evaluator-data";
import { getPlayerRole } from "@/lib/evaluator";
import { RosterTable } from "@/components/evaluator/roster-table";

interface EvalRefData {
  batterArch: Record<string, Archetype>;
  pitcherArch: Record<string, Archetype>;
  posDef: PositionDefenseMap;
  boonLookup: Map<string, { bonuses: Record<string, number>; penalties: Record<string, number> }>;
  percentileTables?: LivePercentileTables | null;
}

type LoadState = "idle" | "searching" | "loading" | "ready" | "error";

export default function EvaluatePage() {
  const [query, setQuery] = useState("");
  const [teamResults, setTeamResults] = useState<TeamSearchResult[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamSearchResult | null>(null);
  const [evaluated, setEvaluated] = useState<EvaluatedPlayer[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evalRef = useRef<EvalRefData | null>(null);

  // Debounced team search
  const searchTeams = useCallback((q: string) => {
    // Cancel pending
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    searchAbort.current?.abort();

    if (q.length < 2) {
      setTeamResults([]);
      setLoadState("idle");
      setError(null);
      return;
    }

    setLoadState("searching");
    setError(null);
    debounceTimer.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbort.current = controller;
      try {
        const res = await fetch(`/api/teams/search?q=${encodeURIComponent(q)}`, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        if (controller.signal.aborted) return;
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data: TeamSearchResult[] = await res.json();
        if (!controller.signal.aborted) {
          setTeamResults(data);
          setLoadState("idle");
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error("Team search error:", e);
        setTeamResults([]);
        setError("Search timed out. MMOLDB may be slow. Try again.");
        setLoadState("error");
      }
    }, 300);
  }, []);

  // Load roster and evaluate
  const loadAndEvaluate = useCallback(async (team: TeamSearchResult) => {
    setSelectedTeam(team);
    setTeamResults([]);
    setQuery("");
    setLoadState("loading");
    setError(null);

    try {
      // Fetch full roster (includes isBench flag for position assignment)
      const rosterRes = await fetch(`/api/teams/${team.mmolbTeamId}/roster`, {
        signal: AbortSignal.timeout(30000),
      });
      if (!rosterRes.ok) throw new Error(`Roster fetch failed: ${rosterRes.status}`);
      const roster: RosterPlayer[] = await rosterRes.json();
      const benchPlayerIds = new Set(roster.filter(r => r.isBench).map(r => r.mmolbPlayerId));

      // Fetch all player details in parallel
      const playerPromises = roster.map(async (rp) => {
        try {
          const res = await fetch(`/api/players/${rp.mmolbPlayerId}`, {
            signal: AbortSignal.timeout(30000),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return data as PlayerData;
        } catch {
          return null;
        }
      });
      const players = (await Promise.all(playerPromises)).filter(
        (p): p is PlayerData => p != null,
      );

      // Load reference data (including live percentiles)
      const [batterArchetypes, pitcherArchetypes, positionDefense, boonLookup, percentileTables] =
        await Promise.all([
          loadBatterArchetypes(),
          loadPitcherArchetypes(),
          loadPositionDefense(),
          getBoonLookup(),
          loadLivePercentiles(),
        ]);

      // Store for position change re-evaluation
      evalRef.current = { batterArch: batterArchetypes, pitcherArch: pitcherArchetypes, posDef: positionDefense, boonLookup, percentileTables };

      // Evaluate each player (bench batters get assigned their best-fit position)
      const results: EvaluatedPlayer[] = players.map((player) => {
        let evalPlayer = player;
        const isBench = benchPlayerIds.has(player.mmolbPlayerId);
        if (isBench && getPlayerRole(player.position) !== "pitcher") {
          evalPlayer = { ...player, position: findBestFitPosition(player, positionDefense) };
        }
        const role = getPlayerRole(evalPlayer.position);
        const archetypes =
          role === "pitcher" ? pitcherArchetypes : batterArchetypes;
        return evaluatePlayer(evalPlayer, evalPlayer.gameStats ?? null, archetypes, positionDefense, boonLookup, percentileTables ?? undefined);
      });

      setEvaluated(results);
      setLoadState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roster");
      setLoadState("error");
    }
  }, []);

  // Re-evaluate a single player with a new position
  const handlePositionChange = useCallback((playerId: string, newPosition: string) => {
    const ref = evalRef.current;
    if (!ref) return;
    setEvaluated(prev => prev.map(ev => {
      if (ev.player.mmolbPlayerId !== playerId) return ev;
      const modified = { ...ev.player, position: newPosition };
      const role = getPlayerRole(newPosition);
      const archetypes = role === "pitcher" ? ref.pitcherArch : ref.batterArch;
      return evaluatePlayer(modified, modified.gameStats ?? null, archetypes, ref.posDef, ref.boonLookup, ref.percentileTables ?? undefined);
    }));
  }, []);

  // Export report
  const copyReport = useCallback(() => {
    if (!selectedTeam || evaluated.length === 0) return;
    const groups: Record<string, EvaluatedPlayer[]> = { MULCH: [], HOLD: [], KEEP: [] };
    for (const ev of evaluated) groups[ev.recommendation].push(ev);

    let report = `## ${selectedTeam.emoji ?? ""} ${selectedTeam.name} - Roster Evaluation\n\n`;
    for (const verdict of ["MULCH", "HOLD", "KEEP"] as const) {
      const list = groups[verdict];
      if (list.length === 0) continue;
      report += `### ${verdict} (${list.length})\n`;
      for (const ev of list) {
        const p = ev.player;
        report += `- **${p.name}** (${p.position}, Lv ${p.level})`;
        report += ` — Attr: ${ev.attributeScore}, Fit: ${ev.positionFitScore}, Stats: ${ev.statsScore ?? "N/A"}, Growth: ${ev.growthScore}`;
        report += `. ${ev.reasoning.attributes.lines[0] ?? ""}\n`;
      }
      report += "\n";
    }

    navigator.clipboard.writeText(report);
  }, [selectedTeam, evaluated]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-foreground">Mulch-o-Meter</h1>
        <p className="text-sm text-muted-foreground">
          Search for a team to evaluate their roster. MULCH / HOLD / KEEP recommendations based on
          attributes, growth potential, and position fit.
        </p>
      </div>

      {/* Team search */}
      <div className="relative mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              searchTeams(e.target.value);
            }}
            placeholder="Search teams..."
            className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          {loadState === "ready" && (
            <button
              onClick={copyReport}
              className="text-xs bg-muted text-muted-foreground hover:text-foreground px-3 py-1 rounded-md border border-border"
            >
              Copy Report
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {teamResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {teamResults.map((team) => (
              <button
                key={team.mmolbTeamId}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                onClick={() => loadAndEvaluate(team)}
              >
                {team.emoji && <span>{team.emoji}</span>}
                <span>{team.location} {team.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loadState === "loading" && (
        <div className="text-center py-12">
          <div className="flex justify-center gap-3 mb-4 text-4xl">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block"
                style={{
                  animation: `mulch-wave 1.5s ease-in-out ${i * 0.3}s infinite`,
                }}
              >
                ⚾
              </span>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            Loading roster for {selectedTeam?.emoji} {selectedTeam?.name}...
          </div>
        </div>
      )}

      {/* Error state */}
      {loadState === "error" && (
        <div className="text-center py-12">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}

      {/* Results */}
      {loadState === "ready" && evaluated.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">
              {selectedTeam?.emoji} {selectedTeam?.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {evaluated.length} players evaluated
            </span>
          </div>
          {evaluated.some(ev => ev.player.recomped) && (
            <div className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-3 py-1.5 mb-3">
              ⚠ {evaluated.filter(ev => ev.player.recomped).length} player(s) recently recomposed. Season stats suppressed (from previous build).
            </div>
          )}
          <RosterTable players={evaluated} onPositionChange={handlePositionChange} percentileTables={evalRef.current?.percentileTables ?? undefined} />
        </>
      )}

      {/* Empty state */}
      {(loadState === "idle" || loadState === "searching") && evaluated.length === 0 && (
        <div className="text-center py-16">
          <div className="flex justify-center gap-3 mb-4 text-4xl">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block"
                style={loadState === "searching" ? {
                  animation: `mulch-wave 1.5s ease-in-out ${i * 0.3}s infinite`,
                } : { opacity: 0.25 }}
              >
                ⚾
              </span>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            {loadState === "searching"
              ? "Searching..."
              : "Search for a team above to evaluate their roster"}
          </div>
        </div>
      )}
      <style>{`
        @keyframes mulch-wave {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
