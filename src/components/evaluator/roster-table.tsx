"use client";

import { useState, useMemo } from "react";
import type { EvaluatedPlayer, Recommendation } from "@/lib/evaluator-types";
import { getPlayerRole } from "@/lib/evaluator";
import { PlayerRow } from "./player-row";
import { ScoreBadge } from "./score-badge";
import { VerdictBadge } from "./verdict-badge";
import { PlayerDetail } from "./player-detail";

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

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "total", label: "Total Score" },
  { key: "position", label: "Position" },
  { key: "name", label: "Name" },
  { key: "durability", label: "Durability" },
  { key: "level", label: "Level" },
  { key: "attributes", label: "Attributes" },
  { key: "stats", label: "Stats" },
  { key: "fit", label: "Fit" },
  { key: "growth", label: "Growth" },
  { key: "verdict", label: "Verdict" },
];

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

function MobilePlayerCard({ ev, onPositionChange, percentileTables }: {
  ev: EvaluatedPlayer;
  onPositionChange?: (playerId: string, newPosition: string) => void;
  percentileTables?: LivePercentileTables;
}) {
  const [expanded, setExpanded] = useState(false);
  const p = ev.player;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        className="w-full text-left px-3 py-2.5 active:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Row 1: Position, Name, Verdict */}
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-[13px] font-bold shrink-0 min-w-[28px] text-center"
            style={{ color: "#00e5ff" }}
          >
            {p.position ?? "?"}
          </span>
          <span className="font-semibold text-sm text-foreground truncate flex-1">
            {p.teamEmoji && <span className="mr-1">{p.teamEmoji}</span>}
            {p.name}
          </span>
          <VerdictBadge verdict={ev.recommendation} />
          <span className="text-muted-foreground text-sm shrink-0">
            {expanded ? "▲" : "▼"}
          </span>
        </div>

        {/* Row 2: Level, Durability, Composite */}
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-sm text-muted-foreground">Lv.{p.level}</span>
          <DurabilityPips durability={p.durability} />
          <span className="ml-auto text-sm font-bold" style={{ color: ev.compositeScore >= 60 ? "var(--scale-good)" : ev.compositeScore >= 40 ? "var(--scale-mid)" : "var(--scale-bad)" }}>
            {ev.compositeScore}
          </span>
        </div>

        {/* Row 3: Score badges */}
        <div className="flex justify-between">
          <ScoreBadge score={ev.attributeScore} label="Attr" />
          <ScoreBadge score={ev.statsScore} label="Stats" />
          <ScoreBadge score={ev.positionFitScore} label="Fit" />
          <ScoreBadge score={ev.growthScore} label="Growth" />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border">
          {onPositionChange && (
            <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Position:</span>
              <select
                value={p.position ?? ""}
                onChange={(e) => {
                  onPositionChange(p.mmolbPlayerId, e.target.value);
                }}
                className="bg-[#1a2332] text-[#00e5ff] px-2 py-1 rounded text-[13px] font-bold border-none cursor-pointer"
              >
                {["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "SP", "RP", "CL"].map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          )}
          <PlayerDetail eval={ev} percentileTables={percentileTables} />
        </div>
      )}
    </div>
  );
}

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
    const c = { STAR: 0, STRONG: 0, ROSTER: 0, FRINGE: 0, MULCH: 0 };
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
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span style={{ color: "#3B82F6" }}>●</span>
          <span className="text-sm">Star: {counts.STAR}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: "#60A5FA" }}>●</span>
          <span className="text-sm">Strong: {counts.STRONG}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: "#8B949E" }}>●</span>
          <span className="text-sm">Roster: {counts.ROSTER}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: "#EAB308" }}>●</span>
          <span className="text-sm">Fringe: {counts.FRINGE}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: "#F85149" }}>●</span>
          <span className="text-sm">Mulch: {counts.MULCH}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {filterPill("All", "ALL")}
        {filterPill(`Star (${counts.STAR})`, "STAR", "#3B82F6")}
        {filterPill(`Strong (${counts.STRONG})`, "STRONG", "#60A5FA")}
        {filterPill(`Roster (${counts.ROSTER})`, "ROSTER", "#8B949E")}
        {filterPill(`Fringe (${counts.FRINGE})`, "FRINGE", "#EAB308")}
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

      {/* Mobile sort control */}
      <div className="md:hidden flex items-center gap-2 mb-3">
        <span className="text-sm text-muted-foreground shrink-0">Sort by:</span>
        <select
          value={sortKey}
          onChange={(e) => {
            setSortKey(e.target.value as SortKey);
          }}
          className="flex-1 bg-muted border border-border rounded-md px-2 py-1.5 text-sm text-foreground"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}
          className="text-sm bg-muted border border-border rounded-md px-2 py-1.5 text-muted-foreground hover:text-foreground"
        >
          {sortDir === "asc" ? "▲" : "▼"}
        </button>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-2">
        {filtered.map((ev) => (
          <MobilePlayerCard
            key={ev.player.mmolbPlayerId}
            ev={ev}
            onPositionChange={onPositionChange}
            percentileTables={percentileTables}
          />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
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
