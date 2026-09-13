import { NextResponse } from "next/server";
import {
  isModifierSource,
  LOCAL_BOON_METADATA,
  mergeModifierSource,
  nextModifierTransition,
  MODIFIER_SOURCE_REPOSITORY,
  MODIFIER_SOURCE_URL,
  type BoonsMerged,
} from "@/lib/modifier-source";

const MAX_SOURCE_BYTES = 256 * 1024;

async function fetchModifierSource(): Promise<unknown> {
  const response = await fetch(MODIFIER_SOURCE_URL, {
    headers: { Accept: "application/json" },
    // Effect windows can change at an exact valid_from/valid_until boundary.
    // Fetching uncached keeps route output from carrying yesterday's active window.
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`upstream returned ${response.status}`);

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SOURCE_BYTES) {
    throw new Error("upstream payload exceeded size limit");
  }
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_SOURCE_BYTES) {
    throw new Error("upstream payload exceeded size limit");
  }
  return JSON.parse(text) as unknown;
}

export async function GET() {
  const checkedAt = new Date();
  let body: BoonsMerged = {
    ...LOCAL_BOON_METADATA,
    modifier_effects: [],
    modifier_source: {
      status: "unavailable",
      repository: MODIFIER_SOURCE_REPOSITORY,
      checked_at: checkedAt.toISOString(),
      next_transition: null,
    },
  };
  let source = "local-fallback";
  try {
    const candidate = await fetchModifierSource();
    if (!isModifierSource(candidate)) throw new Error("upstream schema validation failed");
    body = {
      ...mergeModifierSource(candidate, checkedAt),
      modifier_source: {
        status: "canonical",
        repository: MODIFIER_SOURCE_REPOSITORY,
        checked_at: checkedAt.toISOString(),
        next_transition: nextModifierTransition(candidate, checkedAt),
      },
    };
    source = "anodoze/mmolb-modifiers";
  } catch (error) {
    console.warn("Modifier source unavailable; using local boon fallback:", error instanceof Error ? error.message : String(error));
  }

  return NextResponse.json(body, {
    headers: {
      // Do not cache a date-selected representation across an effect boundary.
      "Cache-Control": "no-store",
      "X-Modifier-Source": source,
      "X-Modifier-Repository": MODIFIER_SOURCE_REPOSITORY,
    },
  });
}
