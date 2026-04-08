import { useState, useEffect } from "react";
import { createJsonCache } from "@/lib/json-cache";

interface BoonEntry {
  name: string;
  emoji: string;
  description?: string;
  bonuses?: Record<string, number>;
  penalties?: Record<string, number>;
}

interface BoonData {
  lesser_boons: BoonEntry[];
  greater_boons?: BoonEntry[];
}

const loadBoons = createJsonCache<BoonData>(
  "/data/boons_merged.json",
  (d): d is BoonData =>
    d !== null && typeof d === "object" && "lesser_boons" in (d as Record<string, unknown>)
);

export type BoonEmojiMap = Map<string, string>;

export function useBoonEmojis(): BoonEmojiMap {
  const [emojiMap, setEmojiMap] = useState<BoonEmojiMap>(new Map());

  useEffect(() => {
    let cancelled = false;
    loadBoons().then((data) => {
      if (cancelled) return;
      const map = new Map<string, string>();
      for (const boon of data.lesser_boons) {
        map.set(boon.name.toLowerCase(), boon.emoji);
      }
      if (data.greater_boons) {
        for (const boon of data.greater_boons) {
          map.set(boon.name.toLowerCase(), boon.emoji);
        }
      }
      setEmojiMap(map);
    }).catch((err) => {
      console.error("[boon-emojis] Failed to load boon data:", err);
    });
    return () => { cancelled = true; };
  }, []);

  return emojiMap;
}
