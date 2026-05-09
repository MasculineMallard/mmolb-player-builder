"use client";

import { useMemo, useState, useEffect } from "react";
import type { StatRecommendation } from "@/lib/advisor";
import { recommendFoods } from "@/lib/food-advisor";
import type { FoodMap } from "@/lib/food-advisor";
import { createJsonCache, isNonArrayObject } from "@/lib/json-cache";
import { isAbortError } from "@/lib/utils";

interface FoodRecommendationProps {
  recommendations: StatRecommendation[];
}

const loadFoods = createJsonCache<FoodMap>(
  "/data/foods.json",
  (d): d is FoodMap => isNonArrayObject(d)
);

export function FoodRecommendation({ recommendations }: FoodRecommendationProps) {
  const [foods, setFoods] = useState<FoodMap>({});

  useEffect(() => {
    let cancelled = false;
    loadFoods()
      .then((data) => { if (!cancelled) setFoods(data); })
      .catch((err) => { if (!cancelled && !isAbortError(err)) console.error("Food data load failed:", err); });
    return () => { cancelled = true; };
  }, []);

  const foodRecs = useMemo(
    () => recommendFoods(recommendations, foods, 3),
    [recommendations, foods]
  );

  if (foodRecs.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 h-full">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
        <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
        Feed Before Level-Up
      </h3>
      <div className="flex items-center gap-4 h-[calc(100%-28px)]">
        {(() => {
          // Expand doubled foods into individual slots
          const rows: Array<{ rec: typeof foodRecs[0]; index: number }> = [];
          for (const rec of foodRecs) {
            for (let c = 0; c < rec.count; c++) {
              rows.push({ rec, index: rows.length });
            }
          }
          // Pad to 3 slots
          const totalSlots = Math.max(3, rows.length);

          return Array.from({ length: totalSlots }, (_, i) => {
            const row = rows[i];
            if (row) {
              const { rec } = row;
              const urgencyColor =
                rec.gap > 150
                  ? "var(--scale-bad)"
                  : rec.gap > 80
                    ? "var(--scale-poor)"
                    : "var(--scale-mid)";

              return (
                <div key={`${rec.stat}-${i}`} className="flex flex-col items-center text-center flex-1 min-w-0">
                  <span className="text-3xl">{rec.food.emoji}</span>
                  <div className="text-sm font-semibold truncate w-full">{rec.food.name}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="capitalize">{rec.stat}</span>
                    {" "}
                    <span style={{ color: urgencyColor }}>(-{rec.gap})</span>
                  </div>
                </div>
              );
            }
            // Empty slot placeholder
            return (
              <div key={`empty-${i}`} className="flex flex-col items-center text-center flex-1 min-w-0">
                <div
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    border: "2px dashed var(--border)",
                  }}
                >
                  <span className="text-sm text-muted-foreground">?</span>
                </div>
                <span className="text-xs text-muted-foreground italic mt-1">On track</span>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
