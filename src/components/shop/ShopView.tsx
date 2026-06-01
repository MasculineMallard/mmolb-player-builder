"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { usePlayerStore } from "@/store/player-store";
import { PlayerSearch } from "@/components/builder/PlayerSearch";
import { RecentPlayers } from "@/components/builder/RecentPlayers";
import { ArchetypeSelect } from "@/components/builder/ArchetypeSelect";
import { LoadingSkeleton } from "@/components/builder/LoadingSkeleton";
import { PITCHER_POSITIONS } from "@/lib/constants";
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

export const ITEM_TIERS = [
  { tier: 1, flatMax: 5,  pctMax: 4 },
  { tier: 2, flatMax: 10, pctMax: 8 },
  { tier: 3, flatMax: 15, pctMax: 12 },
  { tier: 4, flatMax: 20, pctMax: 16 },
  { tier: 5, flatMax: 25, pctMax: 20 },
  { tier: 6, flatMax: 30, pctMax: 24 },
  { tier: 7, flatMax: 35, pctMax: 28 },
];
const BATTER_POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];

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
  const boonCount = (player?.lesserBoons.length ?? 0) + (player?.greaterBoons.length ?? 0);

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

            {/* Team bar — matches builder exactly */}
            {player.teamName && (
              <div className="bg-muted/50 border border-border rounded-lg px-3 py-1.5 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {player.teamEmoji} {player.teamName} {player.position && `| ${player.position}`}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => usePlayerStore.getState().refreshPlayer()}
                    className="text-sm bg-muted text-muted-foreground hover:text-foreground px-2 sm:px-3 py-1 rounded-md border border-border hover:bg-muted/80 transition-colors"
                    title="Refresh player data from MMOLB"
                  >
                    Refresh
                  </button>
                  {!searchOpen && (
                    <button
                      onClick={() => setSearchOpen(true)}
                      className="text-sm bg-muted text-muted-foreground hover:text-foreground px-2 sm:px-3 py-1 rounded-md border border-border hover:bg-muted/80 transition-colors"
                    >
                      Change Player
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Player header card — matches builder: name, level, durability, position dropdown, boons */}
            <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <div className="flex items-center justify-between gap-1.5 sm:gap-3">
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-wrap">
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
                  {/* Position: dropdown for batters (defense matters), static label for pitchers */}
                  {isPitcher ? (
                    <span className="text-[13px] font-bold text-[#00e5ff] shrink-0">{player.position}</span>
                  ) : (
                    <select
                      value={effectivePosition ?? ""}
                      onChange={(e) => setPositionOverride(e.target.value === player.position ? null : e.target.value)}
                      className="bg-[#1a2332] text-[#00e5ff] px-1.5 py-0.5 rounded text-[13px] font-bold border-none cursor-pointer shrink-0"
                    >
                      {BATTER_POSITIONS.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  )}
                </div>
                {/* Change Player if no team bar */}
                {!player.teamName && !searchOpen && (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="text-sm bg-muted text-muted-foreground hover:text-foreground px-3 py-1 rounded-md border border-border hover:bg-muted/80 transition-colors shrink-0"
                  >
                    Change Player
                  </button>
                )}
              </div>
              {/* Boons */}
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
