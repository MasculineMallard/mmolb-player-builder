"use client";

import { useState, useCallback, useEffect } from "react";
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

type BtnState = "idle" | "ok" | "fail" | "busy";

function ActionButton({
  label,
  onClick,
  state,
}: {
  label: string;
  onClick: () => void;
  state: BtnState;
}) {
  const text =
    state === "ok" ? "Done!" :
    state === "fail" ? "Failed" :
    state === "busy" ? "..." :
    label;

  return (
    <button
      onClick={onClick}
      disabled={state === "busy"}
      className="text-sm bg-secondary text-secondary-foreground px-2.5 py-1 rounded-md border border-border hover:bg-secondary/80 active:scale-[0.98] transition-all disabled:opacity-50"
    >
      {text}
    </button>
  );
}

export function ExportShare({ player, archetype }: ExportShareProps) {
  const [linkState, setLinkState] = useState<BtnState>("idle");
  const [discordState, setDiscordState] = useState<BtnState>("idle");
  const [imageState, setImageState] = useState<BtnState>("idle");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const pathname = usePathname();
  const archetypeId = usePlayerStore((s) => s.archetypeId);

  useEffect(() => {
    setPortalTarget(document.getElementById("share-slot"));
  }, []);

  const flash = (setter: (s: BtnState) => void, state: BtnState) => {
    setter(state);
    setTimeout(() => setter("idle"), 2000);
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

    lines.push(`**${player.name}** | Lv ${player.level} | ${pos} | Dur ${player.durability}/5`);
    if (player.teamName) {
      lines.push(`${player.teamEmoji ?? ""} ${player.teamName}`);
    }

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl());
      flash(setLinkState, "ok");
    } catch {
      flash(setLinkState, "fail");
    }
  };

  const handleCopyDiscord = async () => {
    try {
      await navigator.clipboard.writeText(buildDiscordSummary());
      flash(setDiscordState, "ok");
    } catch {
      flash(setDiscordState, "fail");
    }
  };

  const handleSaveImage = useCallback(async () => {
    const el = document.querySelector("[data-player-content]") as HTMLElement | null;
    if (!el) {
      flash(setImageState, "fail");
      return;
    }
    setImageState("busy");
    try {
      const opts = { backgroundColor: "#0a0e17", pixelRatio: 2 };
      await toPng(el, opts); // warm-up pass
      const dataUrl = await toPng(el, opts);
      const link = document.createElement("a");
      link.download = `${player.name.replace(/\s+/g, "-")}-Lv${player.level}.png`;
      link.href = dataUrl;
      link.click();
      flash(setImageState, "ok");
    } catch (err) {
      console.error("Image save failed:", err);
      flash(setImageState, "fail");
    }
  }, [player.name, player.level]);

  const buttons = (
    <>
      <ActionButton label="Copy Link" onClick={handleCopyLink} state={linkState} />
      <ActionButton label="Discord" onClick={handleCopyDiscord} state={discordState} />
      <ActionButton label="Image" onClick={handleSaveImage} state={imageState} />
    </>
  );

  if (portalTarget) {
    return createPortal(buttons, portalTarget);
  }

  return <div className="flex items-center gap-2">{buttons}</div>;
}
