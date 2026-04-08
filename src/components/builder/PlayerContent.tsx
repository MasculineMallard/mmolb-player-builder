"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { NextAction } from "./NextAction";
import { ArchetypeSelect } from "./ArchetypeSelect";
import { StatGridInteractive } from "./StatGridInteractive";

import { ProgressionPath } from "./ProgressionPath";
import { FoodRecommendation } from "./FoodRecommendation";
import { BoonOrbs } from "./BoonOrbs";
import { PitchArsenal } from "@/components/pitcher/PitchArsenal";
import { ExportShare } from "./ExportShare";
import { useBoonEmojis } from "@/hooks/use-boon-emojis";
import { recommendStatPriorities, recommendBoonsByLevel } from "@/lib/advisor";
import { calculateProgress, generateMilestones } from "@/lib/planner-utils";
import { optimizePitchArsenal } from "@/lib/optimizer";
import { S11 } from "@/lib/mechanics";
import { PITCHER_POSITIONS, EMPTY_ARCHETYPE } from "@/lib/constants";
import { usePitchTypes } from "@/hooks/use-pitch-types";
import { usePlayerStore } from "@/store/player-store";
import { loadPositionDefense } from "@/lib/evaluator-data";
import type { Archetype, PlayerData } from "@/lib/types";

interface PlayerContentProps {
  player: PlayerData;
  playerType: "pitcher" | "batter";
  onChangePlayer?: () => void;
  searchOpen?: boolean;
}

const BATTER_POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];

export function PlayerContent({ player: rawPlayer, playerType, onChangePlayer, searchOpen }: PlayerContentProps) {
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const prevPlayerType = useRef(playerType);
  const boonEmojis = useBoonEmojis();
  const [targetOverrides, setTargetOverrides] = useState<Record<string, number>>({});
  const [positionOverride, setPositionOverride] = useState<string | null>(null);

  // Apply position override for batters
  const player = positionOverride && playerType === "batter"
    ? { ...rawPlayer, position: positionOverride }
    : rawPlayer;

  // Reset position override when player changes
  useEffect(() => {
    setPositionOverride(null); // eslint-disable-line react-hooks/set-state-in-effect -- reset on player change
  }, [rawPlayer.mmolbPlayerId]);

  useEffect(() => {
    if (prevPlayerType.current !== playerType) {
      setArchetype(null); // eslint-disable-line react-hooks/set-state-in-effect -- reset on type switch
      usePlayerStore.getState().setArchetypeId(null);
      prevPlayerType.current = playerType;
    }
  }, [playerType]);

  const isPitcher =
    playerType === "pitcher" || PITCHER_POSITIONS.has(player.position ?? "");
  const { pitchTypes, pitchTypesError } = usePitchTypes(isPitcher);

  // Load position defense weights for defense stat highlighting + targets
  const [posDefenseWeights, setPosDefenseWeights] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    loadPositionDefense()
      .then((data) => {
        if (cancelled) return;
        const pos = player.position?.replace(/\d+$/, "");
        if (pos && data[pos]?.stat_weights) {
          setPosDefenseWeights(data[pos].stat_weights);
        } else {
          setPosDefenseWeights({});
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [player.position]);
  const posDefenseStats = Object.keys(posDefenseWeights);

  const handleArchetypeChange = useCallback((arch: Archetype | null) => {
    setArchetype(arch);
    setTargetOverrides({});
  }, []);

  const activeArchetype = archetype ?? EMPTY_ARCHETYPE;
  const hasArchetype = archetype !== null;

  const effectiveArchetype = useMemo(() => {
    if (Object.keys(targetOverrides).length === 0) return activeArchetype;
    return {
      ...activeArchetype,
      stat_targets: { ...(activeArchetype.stat_targets ?? {}), ...targetOverrides },
    };
  }, [activeArchetype, targetOverrides]);

  const handleTargetOverride = useCallback((statName: string, target: number) => {
    setTargetOverrides((prev) => ({ ...prev, [statName]: target }));
  }, []);

  const offenseRecommendations = useMemo(
    () => recommendStatPriorities(player.stats, effectiveArchetype, 10),
    [player.stats, effectiveArchetype]
  );
  // Defense stat recommendations from position weights
  const defenseRecommendations = useMemo(() => {
    if (Object.keys(posDefenseWeights).length === 0) return [];
    return Object.entries(posDefenseWeights).map(([statName, weight]) => {
      const current = player.stats[statName] ?? 0;
      const target = Math.round((weight / 0.12) * 200);
      const gap = Math.max(target - current, 0);
      return { statName, current, target, gap, weight, priorityScore: gap * weight, reasoning: "Position defense stat" };
    });
  }, [posDefenseWeights, player.stats]);
  const recommendations = useMemo(
    () => [...offenseRecommendations, ...defenseRecommendations],
    [offenseRecommendations, defenseRecommendations]
  );
  const boonTimeline = useMemo(
    () => recommendBoonsByLevel(
      player.level, effectiveArchetype,
      { lesser: player.lesserBoons, greater: player.greaterBoons }
    ),
    [player.level, effectiveArchetype, player.lesserBoons, player.greaterBoons]
  );
  const progress = useMemo(
    () => calculateProgress(player.stats, effectiveArchetype, player.level),
    [player.stats, effectiveArchetype, player.level]
  );
  const milestones = useMemo(() => generateMilestones(player.level), [player.level]);
  const pitchAdvice = useMemo(
    () =>
      isPitcher && hasArchetype && Object.keys(pitchTypes).length > 0
        ? optimizePitchArsenal(
            player.stats, player.pitches.map((p) => p.name),
            effectiveArchetype, pitchTypes
          )
        : null,
    [isPitcher, hasArchetype, pitchTypes, player.stats, player.pitches, effectiveArchetype]
  );
  const priorityStatsList = useMemo(
    () => hasArchetype ? (effectiveArchetype.priority_stats ?? []) : [],
    [hasArchetype, effectiveArchetype]
  );
  const highlightStats = useMemo(
    () => {
      const stats = hasArchetype
        ? [...(effectiveArchetype.priority_stats ?? []), ...(effectiveArchetype.secondary_stats ?? [])]
        : [];
      // Add position-relevant defense stats
      if (posDefenseStats.length > 0) {
        for (const s of posDefenseStats) {
          if (!stats.includes(s)) stats.push(s);
        }
      }
      return stats;
    },
    [hasArchetype, effectiveArchetype, posDefenseStats]
  );
  const levelMechanics = useMemo(() => ({
    level: player.level,
    maxLevel: S11.maxLevel,
    pointsPerLevel: S11.pointsPerLevel,
    defenseBonusAmount: S11.defenseBonusAmount,
    isBoonLevel: (S11.boonLevels as readonly number[]).includes(player.level + 1),
    isDefenseLevel: (S11.defenseBonusLevels as readonly number[]).includes(player.level + 1),
  }), [player.level]);

  const boonCount = player.lesserBoons.length + player.greaterBoons.length;
  const showPitchArsenal = isPitcher && player.pitches.length > 0;

  return (
    <>
    {/* Share buttons portal into nav header */}
    <ExportShare player={player} archetype={hasArchetype ? activeArchetype : null} />

    <div data-player-content className="xl:grid xl:grid-cols-[420px_1fr] xl:gap-2 space-y-2 xl:space-y-0">

      {/* LEFT PANEL: Player info + Planning/Action */}
      <div className="space-y-2 min-w-0 flex flex-col">
        {/* Team bar */}
        {player.teamName && (
          <div className="bg-muted/50 border border-border rounded-lg px-3 py-1.5 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {player.teamEmoji} {player.teamName} {player.position && `| ${player.position}`}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => usePlayerStore.getState().refreshPlayer()}
                className="text-sm bg-muted text-muted-foreground hover:text-foreground px-3 py-1 rounded-md border border-border hover:bg-muted/80 transition-colors"
                title="Refresh player data from MMOLB"
              >
                Refresh
              </button>
              {onChangePlayer && !searchOpen && (
                <button
                  onClick={onChangePlayer}
                  className="text-sm bg-muted text-muted-foreground hover:text-foreground px-3 py-1 rounded-md border border-border hover:bg-muted/80 transition-colors"
                >
                  Change Player
                </button>
              )}
            </div>
          </div>
        )}

        {/* Player header */}
        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-lg font-bold truncate">{player.name}</h2>
              <span className="text-sm text-muted-foreground shrink-0">Lv.{player.level}</span>
              {/* Durability pips */}
              <span className="flex items-center gap-0.5 shrink-0" title={`Durability: ${player.durability}/5`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    key={i}
                    className="inline-block w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: i < player.durability
                        ? player.durability <= 2 ? 'var(--scale-bad)' : player.durability <= 3 ? 'var(--scale-poor)' : 'var(--scale-good)'
                        : 'var(--muted)',
                    }}
                  />
                ))}
              </span>
              {/* Position dropdown (batters only) */}
              {playerType === "batter" && (
                <select
                  value={player.position ?? ""}
                  onChange={(e) => setPositionOverride(e.target.value)}
                  className="bg-[#1a2332] text-[#00e5ff] px-1.5 py-0.5 rounded text-[13px] font-bold border-none cursor-pointer shrink-0"
                >
                  {BATTER_POSITIONS.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              )}
            </div>
            {/* Change Player button if no team bar above */}
            {!player.teamName && onChangePlayer && !searchOpen && (
              <button
                onClick={onChangePlayer}
                className="text-sm bg-muted text-muted-foreground hover:text-foreground px-3 py-1 rounded-md border border-border hover:bg-muted/80 transition-colors shrink-0"
              >
                Change Player
              </button>
            )}
          </div>
          {boonCount > 0 && (
            <>
              <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent mt-1.5 mb-1.5" />
              <div className="flex items-center gap-1.5 flex-wrap">
                {player.lesserBoons.map((b) => {
                  const emoji = boonEmojis.get(b.toLowerCase());
                  return (
                    <span key={b} className="text-sm bg-muted px-2 py-0.5 rounded text-muted-foreground">
                      {emoji && <span className="mr-0.5">{emoji}</span>}{b}
                    </span>
                  );
                })}
                {player.greaterBoons.map((b) => {
                  const emoji = boonEmojis.get(b.toLowerCase());
                  return (
                    <span
                      key={b}
                      className="text-sm px-2 py-0.5 rounded font-medium"
                      style={{
                        backgroundColor: 'rgba(255, 215, 0, 0.15)',
                        color: 'var(--chart-2)',
                        boxShadow: '0 0 6px rgba(255, 215, 0, 0.15), inset 0 0 4px rgba(255, 215, 0, 0.05)',
                        border: '1px solid rgba(255, 215, 0, 0.25)',
                      }}
                    >
                      {emoji && <span className="mr-0.5">{emoji}</span>}{b}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <ArchetypeSelect playerType={playerType} onArchetypeChange={handleArchetypeChange} />

        {hasArchetype && (
          <NextAction
            mechanics={levelMechanics}
            statRecommendations={recommendations}
            boonTimeline={boonTimeline}
            progressPercent={progress.progressPercent}
            playerStats={player.stats}
            position={player.position}
            archetype={activeArchetype}
          />
        )}

        {hasArchetype && (
          <FoodRecommendation recommendations={recommendations} />
        )}

      </div>

      {/* RIGHT PANEL: Stat Bars + Progression */}
      <div className="space-y-2 min-w-0 flex flex-col">
        <StatGridInteractive
          stats={player.stats}
          highlightStats={highlightStats}
          priorityStats={priorityStatsList}
          level={player.level}
          isPitcher={isPitcher}
          recommendations={hasArchetype ? recommendations : undefined}
          onTargetOverride={hasArchetype ? handleTargetOverride : undefined}
          extraColumn={
            showPitchArsenal ? (
              <PitchArsenal pitches={player.pitches} advice={pitchAdvice} inline />
            ) : undefined
          }
        />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
          <BoonOrbs boonTimeline={boonTimeline} boonEmojis={boonEmojis} />
          <div className="xl:col-span-2 h-full">
            <ProgressionPath milestones={milestones} currentLevel={player.level} />
          </div>
        </div>
        {isPitcher && pitchTypesError && (
          <div className="bg-card border border-destructive/50 rounded-lg px-3 py-2">
            <p className="text-sm text-destructive">Failed to load pitch type data.</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
