"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { NextAction } from "./NextAction";
import { ArchetypeSelect } from "./ArchetypeSelect";
import { PlayerHeader } from "./PlayerHeader";
import { StatGridInteractive } from "./StatGridInteractive";

import { ProgressionPath } from "./ProgressionPath";
import { FoodRecommendation } from "./FoodRecommendation";
import { BoonAdvisor } from "./BoonAdvisor";
import { PitchArsenal } from "@/components/pitcher/PitchArsenal";
import { ExportShare } from "./ExportShare";
import { useBoonEmojis } from "@/hooks/use-boon-emojis";
import { recommendStatPriorities, recommendBoonsByLevel, scoreBoons } from "@/lib/advisor";
import type { BoonData } from "@/lib/advisor";
import { loadBoons } from "@/lib/evaluator-data";
import { calculateProgress, generateMilestones } from "@/lib/planner-utils";
import { optimizePitchArsenal, computePitchFitPct, computeArchetypeFitPct } from "@/lib/optimizer";
import { S11, calculateDefenseTarget } from "@/lib/mechanics";
import { EMPTY_ARCHETYPE, STAT_CATEGORIES } from "@/lib/constants";
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

  const isPitcher = playerType === "pitcher";
  const { pitchTypes, pitchTypesError } = usePitchTypes(isPitcher);

  // Load boon data for scoring
  const [boonList, setBoonList] = useState<BoonData[]>([]);
  useEffect(() => {
    let cancelled = false;
    loadBoons()
      .then((data) => {
        if (!cancelled) setBoonList(data.lesser_boons as BoonData[]); // eslint-disable-line react-hooks/set-state-in-effect -- async load
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
    const pastDefenseLevels = player.level >= 25;
    return Object.entries(posDefenseWeights)
      .map(([statName, weight]) => {
        const current = player.stats[statName] ?? 0;
        const target = calculateDefenseTarget(weight);
        const gap = Math.max(target - current, 0);
        // After level 25, suppress defense food unless stat is critically zero
        if (pastDefenseLevels && current > 0) return null;
        const reasoning = pastDefenseLevels
          ? "Position defense stat (no defense levels remain)"
          : "Position defense stat";
        return { statName, current, target, gap, weight, priorityScore: gap * weight, reasoning };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [posDefenseWeights, player.stats, player.level]);
  const recommendations = useMemo(
    () => [...offenseRecommendations, ...defenseRecommendations],
    [offenseRecommendations, defenseRecommendations]
  );
  // For food recommendations, filter out defense+luck stats past level 25
  // (no more defense bonus levels, so defense food is wasted)
  const foodRecommendations = useMemo(() => {
    if (player.level < 25) return recommendations;
    const noFoodStats = new Set<string>([...STAT_CATEGORIES.defense, ...STAT_CATEGORIES.luck]);
    return recommendations.filter(r => !noFoodStats.has(r.statName));
  }, [recommendations, player.level]);
  const boonTimeline = useMemo(
    () => recommendBoonsByLevel(
      player.level, effectiveArchetype,
      { lesser: player.lesserBoons, greater: player.greaterBoons }
    ),
    [player.level, effectiveArchetype, player.lesserBoons, player.greaterBoons]
  );
  // Score all boons for the boon advisor (based on actual stats, not archetype)
  const allScoredBoons = useMemo(
    () => boonList.length > 0
      ? scoreBoons(player.stats, playerType, [], boonList)
      : [],
    [player.stats, playerType, boonList]
  );
  // Score the player's current boons (re-score without excluding them)
  const currentBoonScores = useMemo(() => {
    if (boonList.length === 0 || player.lesserBoons.length === 0) return [];
    const allScored = scoreBoons(player.stats, playerType, [], boonList);
    const takenSet = new Set(player.lesserBoons.map(b => b.toLowerCase()));
    return allScored.filter(s => takenSet.has(s.boonName.toLowerCase()));
  }, [player.stats, playerType, player.lesserBoons, boonList]);

  const progress = useMemo(
    () => calculateProgress(player.stats, effectiveArchetype, player.level),
    [player.stats, effectiveArchetype, player.level]
  );

  // Level-normalized archetype fit % (shared with the evaluator + ArchetypeSelect)
  const archetypeFitPct = useMemo(
    () => computeArchetypeFitPct(player.stats, effectiveArchetype, player.level),
    [player.stats, player.level, effectiveArchetype],
  );
  const pitchFitPct = useMemo(
    () => isPitcher && hasArchetype && Object.keys(pitchTypes).length > 0
      ? computePitchFitPct(player.pitches.map((p) => p.name), effectiveArchetype, pitchTypes)
      : null,
    [isPitcher, hasArchetype, pitchTypes, player.pitches, effectiveArchetype]
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
  const levelMechanics = useMemo(() => {
    const boonLevelsReached = (S11.boonLevels as readonly number[]).filter(l => player.level >= l).length;
    const hasPendingBoon = player.lesserBoons.length < boonLevelsReached;
    return {
      level: player.level,
      maxLevel: S11.maxLevel,
      pointsPerLevel: S11.pointsPerLevel,
      defenseBonusAmount: S11.defenseBonusAmount,
      isBoonLevel: (S11.boonLevels as readonly number[]).includes(player.level + 1),
      isDefenseLevel: (S11.defenseBonusLevels as readonly number[]).includes(player.level + 1),
      hasPendingBoon,
    };
  }, [player.level, player.lesserBoons.length]);

  const showPitchArsenal = isPitcher && player.pitches.length > 0;

  return (
    <>
    {/* Share buttons portal into nav header */}
    <ExportShare player={player} archetype={hasArchetype ? activeArchetype : null} />

    <div data-player-content className="xl:grid xl:grid-cols-[420px_1fr] xl:gap-2 space-y-2 xl:space-y-0">

      {/* LEFT PANEL: Player info + Planning/Action */}
      <div className="space-y-2 min-w-0 flex flex-col">
        <PlayerHeader
          player={player}
          isPitcher={isPitcher}
          boonEmojis={boonEmojis}
          positionValue={player.position ?? ""}
          onPositionChange={(v) => setPositionOverride(v)}
          onChangePlayer={onChangePlayer}
          searchOpen={searchOpen}
        />

        <ArchetypeSelect
          playerType={playerType}
          onArchetypeChange={handleArchetypeChange}
          pitchTypes={isPitcher ? pitchTypes : undefined}
          playerPitches={isPitcher ? player.pitches.map((p) => p.name) : undefined}
        />

        {hasArchetype && (
          <NextAction
            mechanics={levelMechanics}
            statRecommendations={recommendations}
            boonTimeline={boonTimeline}
            progressPercent={archetypeFitPct}
            archetype={activeArchetype}
            topScoredBoons={allScoredBoons.length > 0 ? allScoredBoons.slice(0, 3) : undefined}
          />
        )}

        <BoonAdvisor
          scoredBoons={allScoredBoons}
          takenBoons={player.lesserBoons}
          boonEmojis={boonEmojis}
          currentBoonScores={currentBoonScores}
        />

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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
          {hasArchetype && (
            <FoodRecommendation recommendations={foodRecommendations} />
          )}
          <div className="h-full">
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
