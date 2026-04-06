"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { usePlayerStore } from "@/store/player-store";
import { toPng } from "html-to-image";
import type { Archetype, PlayerData } from "@/lib/types";
import { PITCHER_POSITIONS } from "@/lib/constants";

const POSITION_DEFENSE: Record<string, string[]> = {
  C: ["awareness", "reaction", "composure"],
  "1B": ["reaction", "composure", "dexterity"],
  "2B": ["reaction", "composure", "acrobatics"],
  "3B": ["reaction", "arm", "composure"],
  SS: ["reaction", "arm", "acrobatics"],
  LF: ["acrobatics", "agility", "arm"],
  CF: ["acrobatics", "agility", "arm"],
  RF: ["acrobatics", "agility", "arm"],
};

interface ExportShareProps {
  player: PlayerData;
  archetype: Archetype | null;
}

export function ExportShare({ player, archetype }: ExportShareProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const pathname = usePathname();
  const archetypeId = usePlayerStore((s) => s.archetypeId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPortalTarget(document.getElementById("share-slot"));
  }, []);

  const handleSaveImage = useCallback(async () => {
    const el = document.querySelector("[data-player-content]") as HTMLElement | null;
    if (!el) {
      setCopied("error");
      setTimeout(() => setCopied(null), 2000);
      return;
    }
    setSaving(true);
    try {
      // html-to-image needs multiple passes for fonts/images to load
      const opts = { backgroundColor: "#0a0e17", pixelRatio: 2 };
      await toPng(el, opts); // warm-up pass (loads fonts/images)
      const dataUrl = await toPng(el, opts);
      const link = document.createElement("a");
      link.download = `${player.name.replace(/\s+/g, "-")}-Lv${player.level}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Image save failed:", err);
      setCopied("error");
      setTimeout(() => setCopied(null), 2000);
    } finally {
      setSaving(false);
    }
  }, [player.name, player.level]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Clipboard write failed:", err);
      setCopied("error");
      setTimeout(() => setCopied(null), 2000);
    }
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
    const pos = player.position ?? "?";
    const isPitcher = PITCHER_POSITIONS.has(pos.replace(/\d+$/, ""));

    // Header
    lines.push(`**${player.name}** | Lv ${player.level} | ${pos} | Dur ${player.durability}/5`);
    if (player.teamName) {
      lines.push(`${player.teamEmoji ?? ""} ${player.teamName}`);
    }

    // Top 5 stats
    const sorted = Object.entries(player.stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (sorted.length) {
      lines.push("");
      lines.push("**Top Stats**");
      const maxLen = Math.max(...sorted.map(([k]) => k.length));
      lines.push("```");
      lines.push(...sorted.map(([k, v]) => `${k.padEnd(maxLen)}  ${String(v).padStart(4)}`));
      lines.push("```");
    }

    // Defense stats (batters only)
    if (!isPitcher) {
      const basePos = pos.replace(/\d+$/, "");
      const defStats = POSITION_DEFENSE[basePos];
      if (defStats) {
        lines.push(`**${basePos} Defense**`);
        const maxLen = Math.max(...defStats.map(s => s.length));
        lines.push("```");
        lines.push(...defStats.map(s => `${s.padEnd(maxLen)}  ${String(player.stats[s] ?? 0).padStart(4)}`));
        lines.push("```");
      }
    }

    lines.push(buildShareUrl());
    return lines.join("\n");
  };

  const buttons = (
    <>
      <button
        onClick={() => copyToClipboard(buildShareUrl(), "url")}
        className="text-sm text-primary-foreground px-2.5 py-1 rounded-md hover:brightness-110 active:scale-[0.98] transition-all duration-150"
        style={{ background: 'linear-gradient(180deg, #4B8DF7 0%, #3B82F6 100%)' }}
      >
        {copied === "url" ? "Copied!" : copied === "error" ? "Failed" : "Copy Link"}
      </button>
      <button
        onClick={() => copyToClipboard(buildDiscordSummary(), "discord")}
        className="text-sm bg-secondary text-secondary-foreground px-2.5 py-1 rounded-md border border-border hover:bg-secondary/80 transition-colors"
      >
        {copied === "discord" ? "Copied!" : "Discord"}
      </button>
      <button
        onClick={handleSaveImage}
        disabled={saving}
        className="text-sm bg-secondary text-secondary-foreground px-2.5 py-1 rounded-md border border-border hover:bg-secondary/80 transition-colors disabled:opacity-50"
      >
        {saving ? "..." : "Image"}
      </button>
    </>
  );

  if (portalTarget) {
    return createPortal(buttons, portalTarget);
  }

  // Fallback: render inline if portal target not found
  return <div className="flex items-center gap-2">{buttons}</div>;
}
