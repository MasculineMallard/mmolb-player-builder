"use client";

import { useEffect, useState } from "react";
import { isAbortError } from "@/lib/utils";
import { createJsonCache, isNonArrayObject } from "@/lib/json-cache";
import type { PitchTypesMap } from "@/lib/types";

export type { PitchTypesMap };

const loadPitchTypes = createJsonCache<PitchTypesMap>(
  "/data/pitch_types.json",
  (d): d is PitchTypesMap => isNonArrayObject(d)
);

export function usePitchTypes(enabled: boolean): {
  pitchTypes: PitchTypesMap;
  pitchTypesError: boolean;
} {
  const [pitchTypes, setPitchTypes] = useState<PitchTypesMap>({});
  const [pitchTypesError, setPitchTypesError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setPitchTypesError(false);
    let cancelled = false;
    loadPitchTypes()
      .then((data) => {
        if (!cancelled) setPitchTypes(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isAbortError(err)) return;
        console.error("Pitch types load failed:", err);
        setPitchTypesError(true);
      });
    return () => { cancelled = true; };
  }, [enabled]);

  return { pitchTypes, pitchTypesError };
}
