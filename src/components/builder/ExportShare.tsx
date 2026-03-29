"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { usePlayerStore } from "@/store/player-store";
import type { PlayerData } from "@/lib/types";
import type { Archetype } from "@/lib/optimizer";

interface ExportShareProps {
  player: PlayerData;
  archetype: Archetype | null;
}

export function ExportShare({ player, archetype }: ExportShareProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const pathname = usePathname();
  const archetypeId = usePlayerStore((s) => s.archetypeId);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const buildShareUrl = () => {
    const base = window.location.origin + pathname;
    const params = new URLSearchParams();
    params.set("player", player.mmolbPlayerId);
    if (archetypeId) params.set("archetype", archetypeId);
    return `${base}?${params.toString()}`;
  };

  const buildDiscordSummary = () => {
    const lines: string[] = [];
    lines.push(`**${player.name}** (Lv.${player.level})`);
    if (player.teamName) {
      lines.push(`${player.teamEmoji ?? ""} ${player.teamName} | ${player.position ?? "?"}`);
    }

    if (archetype) {
      lines.push(`Archetype: ${archetype.name}`);
      if (archetype.priority_stats?.length) {
        lines.push(
          `Core: ${archetype.priority_stats.slice(0, 3).join(", ")}`
        );
      }
    }

    if (player.lesserBoons.length) {
      lines.push(`Boons: ${player.lesserBoons.join(", ")}`);
    }

    // Top 5 stats
    const sorted = Object.entries(player.stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (sorted.length) {
      lines.push(
        `Top stats: ${sorted.map(([k, v]) => `${k} ${v}`).join(" | ")}`
      );
    }

    lines.push(`\n${buildShareUrl()}`);
    return lines.join("\n");
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3">Share</h3>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => copyToClipboard(buildShareUrl(), "url")}
          className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
        >
          {copied === "url" ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={() => copyToClipboard(buildDiscordSummary(), "discord")}
          className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md border border-border hover:bg-secondary/80 transition-colors"
        >
          {copied === "discord" ? "Copied!" : "Copy for Discord"}
        </button>
      </div>
    </div>
  );
}
