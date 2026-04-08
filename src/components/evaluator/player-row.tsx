"use client";

import { useState } from "react";
import type { EvaluatedPlayer } from "@/lib/evaluator-types";
import { ScoreBadge } from "./score-badge";
import { VerdictBadge } from "./verdict-badge";
import { PlayerDetail } from "./player-detail";
import type { LivePercentileTables } from "@/lib/evaluator-data";

function DurabilityPips({ durability }: { durability: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className="inline-block w-2 h-2 rounded-full"
          style={{
            backgroundColor: i < durability
              ? durability <= 2 ? "var(--scale-bad)" : durability <= 3 ? "var(--scale-poor)" : "var(--chart-3)"
              : "var(--muted)",
          }}
        />
      ))}
    </span>
  );
}

const POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "SP", "RP", "CL"];

export function PlayerRow({ eval: ev, onPositionChange, percentileTables }: {
  eval: EvaluatedPlayer;
  onPositionChange?: (playerId: string, newPosition: string) => void;
  percentileTables?: LivePercentileTables;
}) {
  const [expanded, setExpanded] = useState(false);
  const p = ev.player;

  return (
    <>
      <tr
        className="hover:bg-[#111827] cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-2.5">
          <select
            value={p.position ?? ""}
            onChange={(e) => {
              e.stopPropagation();
              onPositionChange?.(p.mmolbPlayerId, e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1a2332] text-[#00e5ff] px-1.5 py-1 rounded text-[13px] font-bold text-center min-w-[36px] border-none cursor-pointer appearance-none hover:bg-[#243044]"
          >
            {POSITIONS.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2.5">
          <div className="font-semibold text-sm text-foreground whitespace-nowrap">
            {p.teamEmoji && <span className="mr-1">{p.teamEmoji}</span>}
            {p.name}
          </div>
        </td>
        <td className="px-3 py-2 text-center">
          <DurabilityPips durability={p.durability} />
        </td>
        <td className="px-3 py-2 text-center text-sm text-muted-foreground">
          {p.level}
        </td>
        <td className="px-3 py-2.5">
          <ScoreBadge score={ev.attributeScore} />
        </td>
        <td className="px-3 py-2.5">
          <ScoreBadge score={ev.statsScore} />
        </td>
        <td className="px-3 py-2.5">
          <ScoreBadge score={ev.positionFitScore} />
        </td>
        <td className="px-3 py-2.5">
          <ScoreBadge score={ev.growthScore} />
        </td>
        <td className="px-3 py-2.5">
          <ScoreBadge score={ev.compositeScore} />
        </td>
        <td className="px-3 py-2 text-center">
          <VerdictBadge verdict={ev.recommendation} />
        </td>
        <td className="px-3 py-2 text-center text-muted-foreground text-sm">
          {expanded ? "▲" : "▼"}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={11} className="p-0">
            <PlayerDetail eval={ev} percentileTables={percentileTables} />
          </td>
        </tr>
      )}
    </>
  );
}
