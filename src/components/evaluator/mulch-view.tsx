"use client";

import { useState, useCallback, useRef } from "react";
import type { TeamSearchResult, RosterPlayer, PlayerData, Archetype } from "@/lib/types";
import type { EvaluatedPlayer } from "@/lib/evaluator-types";
import { GlossaryButton } from "@/components/evaluator/glossary-modal";
import { evaluatePlayer, findBestFitPosition, getPlayerRole } from "@/lib/evaluator";
import {
  loadBatterArchetypes,
  loadPitcherArchetypes,
  loadPositionDefense,
  getBoonLookup,
  loadLivePercentiles,
  type PositionDefenseMap,
  type LivePercentileTables,
} from "@/lib/evaluator-data";
import { buildRosterReport } from "@/lib/evaluator-report";
import { RosterTable } from "@/components/evaluator/roster-table";
import { useTeamSearch } from "@/hooks/use-team-search";
import { BASE_PATH } from "@/lib/constants";

interface EvalRefData {
  batterArch: Record<string, Archetype>;
  pitcherArch: Record<string, Archetype>;
  posDef: PositionDefenseMap;
  boonLookup: Map<string, { bonuses: Record<string, number>; penalties: Record<string, number> }>;
  percentileTables?: LivePercentileTables | null;
}

type LoadState = "idle" | "loading" | "ready" | "error";

export function MulchView() {
  const [query, setQuery] = useState("");
  const { results: teamResults, loading: searching, error: searchError } = useTeamSearch(query);
  const [selectedTeam, setSelectedTeam] = useState<TeamSearchResult | null>(null);
  const [evaluated, setEvaluated] = useState<EvaluatedPlayer[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const evalRef = useRef<EvalRefData | null>(null);

  // Load roster and evaluate
  const loadAndEvaluate = useCallback(async (team: TeamSearchResult) => {
    setSelectedTeam(team);
    setQuery("");
    setLoadState("loading");
    setError(null);
    setWarning(null);

    try {
      // Fetch full roster (includes isBench flag for position assignment)
      const rosterRes = await fetch(`${BASE_PATH}/api/teams/${team.mmolbTeamId}/roster`, {
        signal: AbortSignal.timeout(30000),
      });
      if (!rosterRes.ok) throw new Error(`Roster fetch failed: ${rosterRes.status}`);
      const roster: RosterPlayer[] = await rosterRes.json();
      const benchPlayerIds = new Set(roster.filter(r => r.isBench).map(r => r.mmolbPlayerId));

      // Fetch player details with bounded concurrency so a full roster doesn't
      // fire ~50 parallel fetches at the MMOLB API at once (per-id requests each
      // hit mmolb.com; the cap keeps the cold-load burst from hammering upstream).
      const failedPlayers: string[] = [];
      const fetchPlayerData = async (rp: RosterPlayer): Promise<PlayerData | null> => {
        try {
          const res = await fetch(`${BASE_PATH}/api/players/${rp.mmolbPlayerId}`, {
            signal: AbortSignal.timeout(30000),
          });
          if (!res.ok) {
            failedPlayers.push(`${rp.firstName} ${rp.lastName}`);
            return null;
          }
          return (await res.json()) as PlayerData;
        } catch {
          failedPlayers.push(`${rp.firstName} ${rp.lastName}`);
          return null;
        }
      };

      const FETCH_CONCURRENCY = 8;
      const players: PlayerData[] = [];
      for (let i = 0; i < roster.length; i += FETCH_CONCURRENCY) {
        const chunk = roster.slice(i, i + FETCH_CONCURRENCY);
        const settled = await Promise.all(chunk.map(fetchPlayerData));
        for (const p of settled) if (p != null) players.push(p);
      }
      if (failedPlayers.length > 0) {
        console.warn(`[mulch] Could not load ${failedPlayers.length} players: ${failedPlayers.join(", ")}`);
        setWarning(`Could not load ${failedPlayers.length} player${failedPlayers.length > 1 ? "s" : ""}: ${failedPlayers.join(", ")}. The MMOLB API may be temporarily unavailable for these players.`);
      } else {
        setWarning(null);
      }

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
  const [copied, setCopied] = useState(false);
  const copyReport = useCallback(async () => {
    if (!selectedTeam || evaluated.length === 0) return;
    const report = buildRosterReport(selectedTeam, evaluated);

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS or permissions
      const textarea = document.createElement("textarea");
      textarea.value = report;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [selectedTeam, evaluated]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-2 sm:mb-4">
        <h1 className="text-lg sm:text-xl font-bold text-foreground">Mulch-o-Meter</h1>
        <p className="text-sm text-muted-foreground">
          Evaluate your roster. Star / Strong / Roster / Fringe / Mulch ratings based on
          attributes, growth potential, and position fit.
        </p>
      </div>

      {/* Team search */}
      <div className="relative mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams..."
            className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {searchError && (
          <div className="mt-1 text-xs text-destructive">Search failed. MMOLB may be slow. Try again.</div>
        )}

        {/* Search results dropdown (hidden only while a roster is loading, to avoid a
            flash over the loading state during the post-select query reset) */}
        {teamResults.length > 0 && loadState !== "loading" && (
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

      {/* Warning banner for partially loaded rosters */}
      {warning && loadState === "ready" && (
        <div className="mb-3 rounded-md border border-yellow-600/40 bg-yellow-950/30 px-3 py-2 text-xs text-yellow-200">
          {warning}
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
            <div className="ml-auto flex items-center gap-2">
              <GlossaryButton />
              <button
                onClick={() => selectedTeam && loadAndEvaluate(selectedTeam)}
                className="text-xs bg-muted text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border transition-colors"
                title="Refresh roster data from MMOLB"
              >
                Refresh
              </button>
              <button
                onClick={copyReport}
                className="text-xs bg-muted text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border transition-colors"
              >
                {copied ? "Copied!" : "Copy Report"}
              </button>
            </div>
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
      {loadState === "idle" && evaluated.length === 0 && (
        <div className="text-center py-16">
          <div className="flex justify-center gap-3 mb-4 text-4xl">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block"
                style={searching ? {
                  animation: `mulch-wave 1.5s ease-in-out ${i * 0.3}s infinite`,
                } : { opacity: 0.25 }}
              >
                ⚾
              </span>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            {searching
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
