"use client";

import { usePlayerStore } from "@/store/player-store";
import { BATTER_POSITIONS } from "@/lib/constants";
import { DurabilityPips } from "@/components/ui/durability-pips";
import type { PlayerData } from "@/lib/types";

interface PlayerHeaderProps {
  /** Player whose name/level/durability/boons + team-bar position are displayed. */
  player: PlayerData;
  isPitcher: boolean;
  boonEmojis: Map<string, string>;
  /** Current value for the batter position dropdown (may differ from player.position when an override is staged). */
  positionValue: string;
  onPositionChange: (value: string) => void;
  /** Opens search / changes player. Button renders only when provided and search is closed. */
  onChangePlayer?: () => void;
  searchOpen?: boolean;
  /** Show a static position label for pitchers (shop) vs. nothing (builder). */
  showPitcherPositionLabel?: boolean;
}

/**
 * Shared player header: team bar (refresh + change player) and the player card
 * (name, level, durability pips, position control, boons). Used by the builder
 * (PlayerContent) and the shop (ShopView), which differ only in the prop-driven
 * branches above.
 */
export function PlayerHeader({
  player,
  isPitcher,
  boonEmojis,
  positionValue,
  onPositionChange,
  onChangePlayer,
  searchOpen,
  showPitcherPositionLabel = false,
}: PlayerHeaderProps) {
  const boonCount = player.lesserBoons.length + player.greaterBoons.length;

  return (
    <>
      {/* Team bar */}
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
            {onChangePlayer && !searchOpen && (
              <button
                onClick={onChangePlayer}
                className="text-sm bg-muted text-muted-foreground hover:text-foreground px-2 sm:px-3 py-1 rounded-md border border-border hover:bg-muted/80 transition-colors"
              >
                Change Player
              </button>
            )}
          </div>
        </div>
      )}

      {/* Player header card */}
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-wrap">
            <h2 className="text-lg font-bold truncate">{player.name}</h2>
            <span className="text-sm text-muted-foreground shrink-0">Lv.{player.level}</span>
            <DurabilityPips durability={player.durability} title={`Durability: ${player.durability}/5`} className="shrink-0" />
            {/* Position: dropdown for batters; pitchers get a static label (shop) or nothing (builder) */}
            {isPitcher ? (
              showPitcherPositionLabel ? (
                <span className="text-[13px] font-bold text-[#00e5ff] shrink-0">{player.position}</span>
              ) : null
            ) : (
              <select
                value={positionValue}
                onChange={(e) => onPositionChange(e.target.value)}
                className="bg-[#1a2332] text-[#00e5ff] px-1.5 py-0.5 rounded text-[13px] font-bold border-none cursor-pointer shrink-0"
              >
                {BATTER_POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            )}
          </div>
          {/* Change Player button when there is no team bar above */}
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
    </>
  );
}
