"use client";

import { useEffect, useState } from "react";
import {
  buildBoonLookup,
  getModifierLookup,
  type ModifierSourceStatus,
} from "@/lib/evaluator-data";
import {
  LOCAL_BOON_METADATA,
  type BoonEntry,
} from "@/lib/modifier-source";

const RETRY_UNAVAILABLE_MS = 5 * 60 * 1000;
const CANONICAL_RECHECK_MS = 6 * 60 * 60 * 1000;
const MAX_TIMER_MS = 2_147_000_000;
const BOUNDARY_GRACE_MS = 1_000;

export interface ModifierLookupState {
  lookup: Map<string, BoonEntry>;
  boonList: BoonEntry[];
  sourceStatus: ModifierSourceStatus | "loading";
}

const LOCAL_LOOKUP = buildBoonLookup(LOCAL_BOON_METADATA);

/** When to refresh: just after the next source boundary, or soon after an outage. */
export function modifierRefreshDelay(
  nextTransition: string | null,
  sourceStatus: ModifierSourceStatus,
  now = Date.now(),
): number | null {
  if (sourceStatus === "unavailable") return RETRY_UNAVAILABLE_MS;
  if (!nextTransition) return CANONICAL_RECHECK_MS;
  const transition = Date.parse(nextTransition);
  if (!Number.isFinite(transition)) return RETRY_UNAVAILABLE_MS;
  return Math.min(
    Math.max(transition - now + BOUNDARY_GRACE_MS, BOUNDARY_GRACE_MS),
    CANONICAL_RECHECK_MS,
    MAX_TIMER_MS,
  );
}

/** Shared fail-safe effect loader with validity-boundary refresh for long-lived pages. */
export function useModifierLookup(): ModifierLookupState {
  const [state, setState] = useState<ModifierLookupState>({
    lookup: LOCAL_LOOKUP,
    boonList: LOCAL_BOON_METADATA.lesser_boons,
    sourceStatus: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    function schedule(delay: number | null) {
      if (delay === null || cancelled) return;
      refreshTimer = setTimeout(refresh, delay);
    }

    async function refresh() {
      try {
        const result = await getModifierLookup();
        if (cancelled) return;
        setState({
          lookup: result.lookup,
          boonList: result.boonList,
          sourceStatus: result.sourceStatus,
        });
        schedule(modifierRefreshDelay(result.nextTransition, result.sourceStatus));
      } catch {
        if (cancelled) return;
        setState({
          lookup: LOCAL_LOOKUP,
          boonList: LOCAL_BOON_METADATA.lesser_boons,
          sourceStatus: "unavailable",
        });
        schedule(RETRY_UNAVAILABLE_MS);
      }
    }

    void refresh();
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, []);

  return state;
}
