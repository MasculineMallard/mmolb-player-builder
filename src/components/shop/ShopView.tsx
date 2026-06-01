"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { usePlayerStore } from "@/store/player-store";
import { PlayerSearch } from "@/components/builder/PlayerSearch";
import { RecentPlayers } from "@/components/builder/RecentPlayers";
import { ArchetypeSelect } from "@/components/builder/ArchetypeSelect";
import { PlayerHeader } from "@/components/builder/PlayerHeader";
import { LoadingSkeleton } from "@/components/builder/LoadingSkeleton";
import { PITCHER_POSITIONS, ITEM_TIERS } from "@/lib/constants";
import { loadPositionDefense, getBoonLookup } from "@/lib/evaluator-data";
import type { PositionDefenseMap } from "@/lib/evaluator-data";
import type { Archetype } from "@/lib/types";
import { useBoonEmojis } from "@/hooks/use-boon-emojis";
import {
  analyzeStatNeeds,
  recommendItems,
  computeBoonMultipliers,
  loadItemSlotAttributes,
} from "@/lib/item-advisor";
import type { SlotRecommendation } from "@/lib/item-advisor";
import { PlayerEquipmentGraphic } from "./PlayerEquipmentGraphic";
import { StatBarPanel } from "./StatBarPanel";
import { ShopGlossaryButton } from "./ShopGlossary";

interface ShopViewProps {
  forcePlayerType?: "batter" | "pitcher";
  toolName?: string;
  toolEmoji?: string;
}

export function ShopView({ forcePlayerType, toolName = "Super Slugger Sartoria", toolEmoji = "🧵" }: ShopViewProps) {
  const { player, loading, error } = usePlayerStore();
  const searchParams = useSearchParams();
  const didAutoImport = useRef(false);
  const [searchOpen, setSearchOpen] = useState(true);

  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [tierIndex, setTierIndex] = useState(2); // default tier 3
  const [positionOverride, setPositionOverride] = useState<string | null>(null);
  const selectedTier = ITEM_TIERS[tierIndex];

  const boonEmojis = useBoonEmojis();

  // Data loading
  const [posDefense, setPosDefense] = useState<PositionDefenseMap>({});
  const [boonLookup, setBoonLookup] = useState<Map<string, { bonuses: Record<string, number>; penalties: Record<string, number> }>>(new Map());
  const [batterSlotData, setBatterSlotData] = useState<Record<string, { offensive?: string[]; defensive?: string[]; all?: string[] }> | null>(null);
  const [pitcherSlotData, setPitcherSlotData] = useState<Record<string, { offensive?: string[]; defensive?: string[]; all?: string[] }> | null>(null);

  // Reset position override on player change
  useEffect(() => {
    setPositionOverride(null); // eslint-disable-line react-hooks/set-state-in-effect
  }, [player?.mmolbPlayerId]);

  // Auto-import from URL params
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
    } else if (player) {
      didAutoImport.current = true;
      usePlayerStore.getState().importPlayer(player.mmolbPlayerId);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (player && !loading) {
      setSearchOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [player, loading]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadPositionDefense(), getBoonLookup(), loadItemSlotAttributes()])
      .then(([pd, bl, sd]) => {
        if (cancelled) return;
        setPosDefense(pd);
        setBoonLookup(bl);
        setBatterSlotData(sd.batter);
        setPitcherSlotData(sd.pitcher ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const detectedPitcher = player?.position ? PITCHER_POSITIONS.has(player.position) : false;
  const isPitcher = forcePlayerType ? forcePlayerType === "pitcher" : detectedPitcher;
  const playerType = isPitcher ? "pitcher" : "batter";
  const slotData = isPitcher ? pitcherSlotData : batterSlotData;
  const effectivePosition = positionOverride ?? player?.position ?? null;

  const effectivePlayer = useMemo(() => {
    if (!player) return null;
    if (!positionOverride || positionOverride === player.position) return player;
    return { ...player, position: positionOverride };
  }, [player, positionOverride]);

  const boonMultipliers = useMemo(() => {
    if (!player) return {};
    return computeBoonMultipliers(player.lesserBoons, boonLookup);
  }, [player, boonLookup]);

  const statNeeds = useMemo(() => {
    if (!effectivePlayer || !archetype) return [];
    return analyzeStatNeeds(effectivePlayer, archetype, posDefense, boonMultipliers);
  }, [effectivePlayer, archetype, posDefense, boonMultipliers]);

  const recommendations = useMemo<SlotRecommendation[]>(() => {
    if (statNeeds.length === 0 || !slotData || !archetype) return [];
    return recommendItems(statNeeds, slotData, archetype, playerType);
  }, [statNeeds, slotData, archetype, playerType]);


  const handleArchetypeChange = useCallback((a: Archetype | null) => {
    setArchetype(a);
  }, []);

  const recentPlayers = usePlayerStore((s) => s.recentPlayers);
  const hasRecent = recentPlayers.length > 0;

  return (
    <div className="space-y-2">
      {/* Search */}
      {(!player || searchOpen) && (
        <div className="bg-card border border-border rounded-lg px-3 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlayerSearch />
            <RecentPlayers />
          </div>
          {player && (
            <button
              onClick={() => setSearchOpen(false)}
              className="mt-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Close search
            </button>
          )}
        </div>
      )}

      {loading && <LoadingSkeleton />}

      {error && (
        <div className="bg-card border border-destructive/50 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!player && !loading && !searchOpen && (
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="max-w-lg mx-auto text-center">
            <div className="text-4xl mb-4">{toolEmoji}</div>
            <h2 className="text-xl font-bold mb-2">{toolName}</h2>
            <p className="text-muted-foreground mb-6">
              Build your ideal items. Import a {isPitcher ? "pitcher" : "player"} to see per-slot recommendations
              with stat projections you can customize.
            </p>
            {hasRecent && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {recentPlayers.slice(0, 3).map((p) => (
                  <button
                    key={p.mmolbPlayerId}
                    onClick={() => usePlayerStore.getState().importPlayer(p.mmolbPlayerId)}
                    className="text-sm bg-secondary border border-border px-3 py-1.5 rounded-md hover:bg-secondary/80 transition-colors"
                  >
                    {p.teamEmoji && <span className="mr-1">{p.teamEmoji}</span>}
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {forcePlayerType && player && !loading && forcePlayerType !== (detectedPitcher ? "pitcher" : "batter") && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          <p className="text-amber-400 text-sm">
            ⚠️ This player is a {detectedPitcher ? "pitcher" : "batter"}, but this tool is for {forcePlayerType}s. Stats and archetypes may not apply.
          </p>
        </div>
      )}

      {player?.recomped && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          <p className="text-amber-400 text-sm">
            ⚠️ This player was recently recomposed. Stats may not reflect their current build.
          </p>
        </div>
      )}

      {/* Main content — two column layout */}
      {player && !loading && (
        <div className="xl:grid xl:grid-cols-[420px_1fr] xl:gap-2 space-y-2 xl:space-y-0">

          {/* LEFT PANEL */}
          <div className="space-y-2 min-w-0 flex flex-col">

            {/* Player header — shared with the builder */}
            <PlayerHeader
              player={player}
              isPitcher={isPitcher}
              boonEmojis={boonEmojis}
              positionValue={effectivePosition ?? ""}
              onPositionChange={(v) => setPositionOverride(v === player.position ? null : v)}
              onChangePlayer={() => setSearchOpen(true)}
              searchOpen={searchOpen}
              showPitcherPositionLabel
            />

            {/* Item tier selector + legend */}
            <div className="bg-card border border-border rounded-lg px-3 py-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium">Item Tier:</span>
                <div className="flex gap-1">
                  {ITEM_TIERS.map((t, i) => (
                    <button
                      key={t.tier}
                      onClick={() => setTierIndex(i)}
                      className={`px-2 py-0.5 rounded text-sm font-mono transition-colors ${
                        tierIndex === i
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      T{t.tier}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">+{selectedTier.flatMax} flat / {selectedTier.pctMax}%</span>
                <ShopGlossaryButton toolName={toolName} isPitcher={isPitcher} />
              </div>
              <div className="flex items-center gap-5 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-500/60" />
                  <span className="text-sm text-muted-foreground">current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1.5 rounded bg-white/50" />
                  <span className="text-sm text-muted-foreground">target</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-sky-200/50" />
                  <span className="text-sm text-muted-foreground">+flat</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-600/80" />
                  <span className="text-sm text-muted-foreground">+percent</span>
                </div>
              </div>
            </div>

            {/* Archetype selector */}
            <ArchetypeSelect
              playerType={playerType}
              onArchetypeChange={handleArchetypeChange}
            />

            {!archetype && (
              <div className="bg-card border border-border rounded-lg px-3 py-2">
                <p className="text-sm text-muted-foreground text-center">
                  Select an archetype above to see item shopping recommendations.
                </p>
              </div>
            )}

            {archetype && recommendations.length === 0 && !slotData && (
              <div className="bg-card border border-destructive/50 rounded-lg p-6 text-center">
                <div className="text-3xl mb-2">⚠️</div>
                <p className="text-sm text-destructive">Could not load item slot data. Try refreshing the page.</p>
              </div>
            )}

            {archetype && recommendations.length === 0 && slotData && (
              <div className="bg-card border border-border rounded-lg p-6 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm text-muted-foreground">No significant stat gaps found.</p>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Item cards + Stat bars */}
          <div className="space-y-2 min-w-0 flex flex-col">
            {archetype && recommendations.length > 0 && (
              <>
                {/* Summary + Item cards in a row */}
                <PlayerEquipmentGraphic
                  recommendations={recommendations}
                  flatMax={selectedTier.flatMax}
                  pctMax={selectedTier.pctMax}
                  statNeeds={statNeeds}
                  equipment={player.equipment}
                />

                <StatBarPanel
                recommendations={recommendations}
                playerStats={player.stats}
                boonMultipliers={boonMultipliers}
                flatMax={selectedTier.flatMax}
                pctMax={selectedTier.pctMax}
                archetype={archetype}
                playerType={playerType}
              />
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
