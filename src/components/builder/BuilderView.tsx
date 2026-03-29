"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { usePlayerStore } from "@/store/player-store";
import { PlayerSearch } from "./PlayerSearch";
import { PlayerInfo } from "./PlayerInfo";
import { NextAction } from "./NextAction";
import { ArchetypeSelect } from "./ArchetypeSelect";
import { StatGrid } from "./StatGrid";
import { StatDevelopment } from "./StatDevelopment";
import { BoonTimeline } from "./BoonTimeline";
import { ProgressionPath } from "./ProgressionPath";
import { PitchArsenal } from "@/components/pitcher/PitchArsenal";
import { ExportShare } from "./ExportShare";
import { recommendStatPriorities, recommendBoonsByLevel } from "@/lib/advisor";
import { calculateProgress } from "@/lib/planner-utils";
import { optimizePitchArsenal, type Archetype } from "@/lib/optimizer";
import { MILESTONE_LEVELS, PITCHER_POSITIONS } from "@/lib/constants";
import { S11 } from "@/lib/mechanics";
import type { PlayerData } from "@/lib/types";

interface BuilderViewProps {
  playerType: "pitcher" | "batter";
}

export function BuilderView({ playerType }: BuilderViewProps) {
  const { player, loading, error } = usePlayerStore();
  const searchParams = useSearchParams();
  const didAutoImport = useRef(false);

  // Auto-import from URL params: ?player=<id>&archetype=<key>
  useEffect(() => {
    if (didAutoImport.current) return;
    const playerId = searchParams.get("player");
    const archetypeKey = searchParams.get("archetype");

    if (playerId) {
      didAutoImport.current = true;
      usePlayerStore.getState().importPlayer(playerId);
      if (archetypeKey) {
        usePlayerStore.getState().setArchetypeId(archetypeKey);
      }
    }
  }, [searchParams]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
      {/* Sidebar: Search */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Import Player
        </h3>
        <PlayerSearch />
      </div>

      {/* Main content */}
      <div className="space-y-4">
        {loading && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Loading player data...</p>
          </div>
        )}

        {error && (
          <div className="bg-card border border-destructive/50 rounded-lg p-4">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {!player && !loading && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <h2 className="text-xl font-bold mb-2">
              {playerType === "pitcher" ? "Pitcher" : "Batter"} Builder
            </h2>
            <p className="text-muted-foreground">
              Search for a player to get started.
            </p>
          </div>
        )}

        {player && !loading && (
          <PlayerContent player={player} playerType={playerType} />
        )}
      </div>
    </div>
  );
}

function PlayerContent({
  player,
  playerType,
}: {
  player: PlayerData;
  playerType: "pitcher" | "batter";
}) {
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [pitchTypes, setPitchTypes] = useState<Record<string, { name: string; priority_stats?: string[]; secondary_stats?: string[] }>>({});
  const archetypeId = usePlayerStore((s) => s.archetypeId);

  // Load pitch types data for pitcher arsenal analysis
  useEffect(() => {
    if (playerType === "pitcher" || PITCHER_POSITIONS.has(player.position ?? "")) {
      fetch("/data/pitch_types.json")
        .then((res) => res.json())
        .then(setPitchTypes)
        .catch(() => {});
    }
  }, [playerType, player.position]);

  const handleArchetypeChange = useCallback(
    (arch: Archetype | null, _id: string | null) => {
      setArchetype(arch);
    },
    []
  );

  const emptyArchetype: Archetype = {
    name: "No archetype",
    description: "",
    priority_stats: [],
    secondary_stats: [],
    stat_weights: {},
  };

  const activeArchetype = archetype ?? emptyArchetype;
  const hasArchetype = archetype !== null;

  const recommendations = recommendStatPriorities(
    player.stats,
    activeArchetype,
    10
  );
  const boonTimeline = recommendBoonsByLevel(
    player.level,
    activeArchetype,
    { lesser: player.lesserBoons, greater: player.greaterBoons }
  );
  const progress = calculateProgress(
    player.stats,
    activeArchetype,
    player.level
  );

  const milestones = MILESTONE_LEVELS.map((level) => ({
    level,
    name:
      level === 1
        ? "Start"
        : (S11.boonLevels as readonly number[]).includes(level)
          ? "Lesser Boon"
          : (S11.defenseBonusLevels as readonly number[]).includes(level)
            ? "Defense Bonus"
            : `Level ${level}`,
    status: (player.level >= level ? "completed" : "upcoming") as
      | "completed"
      | "upcoming",
  }));

  const isPitcher =
    playerType === "pitcher" || PITCHER_POSITIONS.has(player.position ?? "");

  const pitchAdvice =
    isPitcher && hasArchetype && Object.keys(pitchTypes).length > 0
      ? optimizePitchArsenal(
          player.stats,
          player.pitches.map((p) => p.name),
          activeArchetype,
          pitchTypes
        )
      : null;

  const highlightStats = hasArchetype
    ? [
        ...(activeArchetype.priority_stats ?? []),
        ...(activeArchetype.secondary_stats ?? []),
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* 1. Player Info */}
      <PlayerInfo player={player} />

      {/* 2. Archetype Select */}
      <ArchetypeSelect
        playerType={playerType}
        onArchetypeChange={handleArchetypeChange}
      />

      {/* 3. Next Action hero card */}
      <NextAction
        level={player.level}
        statRecommendations={recommendations}
        boonTimeline={boonTimeline}
        progressPercent={progress.progressPercent}
      />

      {/* 4. Quick stats summary */}
      {hasArchetype && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[var(--chart-3)]">
              {progress.statsOnTrack}
            </div>
            <div className="text-xs text-muted-foreground">On Track</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-[var(--chart-4)]">
              {progress.statsBehind}
            </div>
            <div className="text-xs text-muted-foreground">Behind</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">
              {progress.levelsRemaining}
            </div>
            <div className="text-xs text-muted-foreground">Levels Left</div>
          </div>
        </div>
      )}

      {/* 5. Stat Development (progress bars) */}
      {hasArchetype && <StatDevelopment recommendations={recommendations} />}

      {/* 6. Stat Grid */}
      <StatGrid stats={player.stats} highlightStats={highlightStats} />

      {/* 7. Boon Timeline */}
      {hasArchetype && (
        <BoonTimeline
          timeline={boonTimeline}
          takenLesserBoons={player.lesserBoons}
        />
      )}

      {/* 8. Progression Path */}
      <ProgressionPath milestones={milestones} currentLevel={player.level} />

      {/* 9. Pitch Arsenal (pitcher only) */}
      {isPitcher && player.pitches.length > 0 && (
        <PitchArsenal pitches={player.pitches} advice={pitchAdvice} />
      )}

      {/* 10. Export & Share */}
      <ExportShare player={player} archetype={hasArchetype ? activeArchetype : null} />
    </div>
  );
}
