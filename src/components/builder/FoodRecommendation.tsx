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
    <div className="bg-card border border-border rounded-lg px-3 py-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
        <span className="w-0.5 h-3 bg-primary/40 rounded-full" />
        Feed Before Level-Up
      </h3>
      <div className="flex flex-col gap-2.5">
        {(() => {
          // Expand doubled foods into individual rows
          const rows: Array<{ rec: typeof foodRecs[0]; index: number }> = [];
          for (const rec of foodRecs) {
            for (let c = 0; c < rec.count; c++) {
              rows.push({ rec, index: rows.length });
            }
          }
          // Pad to 3 rows
          const totalRows = Math.max(3, rows.length);

          return Array.from({ length: totalRows }, (_, i) => {
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
                <div key={`${rec.stat}-${i}`} className="flex items-center gap-3">
                  <span className="text-3xl shrink-0">{rec.food.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold">{rec.food.name}</div>
                    <div className="text-sm text-muted-foreground">
                      <span className="capitalize">{rec.stat}</span>
                      {": "}
                      {rec.current} → {rec.target}
                      {" "}
                      <span style={{ color: urgencyColor }}>(-{rec.gap})</span>
                    </div>
                  </div>
                </div>
              );
            }
            // Empty slot placeholder
            return (
              <div key={`empty-${i}`} className="flex items-center gap-3">
                <div
                  className="shrink-0 rounded-full flex items-center justify-center"
                  style={{
                    width: 40,
                    height: 40,
                    border: "2px dashed var(--border)",
                  }}
                >
                  <span className="text-sm text-muted-foreground">?</span>
                </div>
                <span className="text-sm text-muted-foreground italic">On track</span>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
