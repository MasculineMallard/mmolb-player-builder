"use client";

import { useState, useMemo } from "react";
import type { EvaluatedPlayer, Recommendation } from "@/lib/evaluator-types";
import { getPlayerRole } from "@/lib/evaluator";
import { PlayerRow } from "./player-row";

type SortKey = "position" | "name" | "durability" | "level" | "attributes" | "stats" | "fit" | "growth" | "total" | "verdict";
type RoleFilter = "all" | "batter" | "pitcher";

const POSITION_ORDER: Record<string, number> = {
  C: 0, "1B": 1, "2B": 2, "3B": 3, SS: 4,
  LF: 5, CF: 6, RF: 7, DH: 8,
  SP: 9, RP: 10, CL: 11,
  Bench: 12,
};

const VERDICT_ORDER: Record<string, number> = {
  MULCH: 0, HOLD: 1, KEEP: 2,
};

function positionRank(pos: string | null): number {
  if (!pos) return 99;
  return POSITION_ORDER[pos] ?? 50;
}

type SortDir = "asc" | "desc";

import type { LivePercentileTables } from "@/lib/evaluator-data";

export function RosterTable({ players, onPositionChange, percentileTables }: {
  players: EvaluatedPlayer[];
  onPositionChange?: (playerId: string, newPosition: string) => void;
  percentileTables?: LivePercentileTables;
}) {
  const [verdictFilter, setVerdictFilter] = useState<Recommendation | "ALL">("ALL");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let list = players;

    if (verdictFilter !== "ALL") {
      list = list.filter((p) => p.recommendation === verdictFilter);
    }
    if (roleFilter !== "all") {
      list = list.filter((p) => getPlayerRole(p.player.position) === roleFilter);
    }

    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case "position":
          cmp = positionRank(a.player.position) - positionRank(b.player.position); break;
        case "name":
          cmp = a.player.name.localeCompare(b.player.name); break;
        case "durability":
          cmp = (a.player.durability ?? 0) - (b.player.durability ?? 0); break;
        case "level":
          cmp = (a.player.level ?? 0) - (b.player.level ?? 0); break;
        case "attributes":
          cmp = a.attributeScore - b.attributeScore; break;
        case "stats":
          cmp = (a.statsScore ?? -1) - (b.statsScore ?? -1); break;
        case "fit":
          cmp = (a.positionFitScore ?? -1) - (b.positionFitScore ?? -1); break;
        case "growth":
          cmp = a.growthScore - b.growthScore; break;
        case "total":
          cmp = a.compositeScore - b.compositeScore; break;
        case "verdict":
          cmp = (VERDICT_ORDER[a.recommendation] ?? 1) - (VERDICT_ORDER[b.recommendation] ?? 1); break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });

    return list;
  }, [players, verdictFilter, roleFilter, sortKey, sortDir]);

  const counts = useMemo(() => {
    const c = { KEEP: 0, HOLD: 0, MULCH: 0 };
    for (const p of players) c[p.recommendation]++;
    return c;
  }, [players]);

  const filterPill = (
    label: string,
    value: Recommendation | "ALL",
    color?: string,
  ) => (
    <button
      key={value}
      className={`px-2.5 py-1 text-sm rounded-md border transition-colors ${
        verdictFilter === value
          ? "border-primary bg-primary/15 text-foreground font-medium"
          : "border-border bg-transparent text-muted-foreground hover:text-foreground"
      }`}
      onClick={() => setVerdictFilter(value)}
    >
      {color && <span style={{ color }} className="mr-1">●</span>}
      {label}
    </button>
  );

  const th = "px-3 py-2 text-center text-[13px] uppercase tracking-wider font-semibold";
  const thActive = "text-[#00e5ff] underline underline-offset-4";
  const thInactive = "text-[#00e5ff]/60 hover:text-[#00e5ff] cursor-pointer";

  const sortTh = (key: SortKey, label: string, extraClass = "") => {
    const active = sortKey === key;
    const arrow = active ? (sortDir === "asc" ? " ▲" : " ▼") : "";
    return (
      <th
        className={`${th} ${active ? thActive : thInactive} ${extraClass}`}
        onClick={() => handleSort(key)}
      >
        {label}{arrow}
      </th>
    );
  };

  return (
    <div>
      {/* Summary strip */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <span style={{ color: "#3FB950" }}>●</span>
          <span className="text-sm">KEEP: {counts.KEEP}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: "#FFD700" }}>●</span>
          <span className="text-sm">HOLD: {counts.HOLD}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: "#F85149" }}>●</span>
          <span className="text-sm">MULCH: {counts.MULCH}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {filterPill("All", "ALL")}
        {filterPill(`Keep (${counts.KEEP})`, "KEEP", "#3FB950")}
        {filterPill(`Hold (${counts.HOLD})`, "HOLD", "#FFD700")}
        {filterPill(`Mulch (${counts.MULCH})`, "MULCH", "#F85149")}

        <span className="w-px h-5 bg-border mx-1" />

        {(["all", "batter", "pitcher"] as const).map((r) => (
          <button
            key={r}
            className={`px-2.5 py-1 text-sm rounded-md border transition-colors ${
              roleFilter === r
                ? "border-primary bg-primary/15 text-foreground font-medium"
                : "border-border bg-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setRoleFilter(r)}
          >
            {r === "all" ? "All" : r === "batter" ? "Batters" : "Pitchers"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#1a2332] select-none">
              {sortTh("position", "Pos", "text-left w-12")}
              {sortTh("name", "Player", "text-left")}
              {sortTh("durability", "Dur", "w-[92px]")}
              {sortTh("level", "Lv", "w-[64px]")}
              {sortTh("attributes", "Attr", "w-[72px]")}
              {sortTh("stats", "Stats", "w-[72px]")}
              {sortTh("fit", "Fit", "w-[72px]")}
              {sortTh("growth", "Growth", "w-[92px]")}
              {sortTh("total", "Total", "w-[72px]")}
              {sortTh("verdict", "Verdict", "w-[112px]")}
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev) => (
              <PlayerRow key={ev.player.mmolbPlayerId} eval={ev} onPositionChange={onPositionChange} percentileTables={percentileTables} />
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No players match the current filters.
        </p>
      )}
    </div>
  );
}
