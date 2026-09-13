import localBoonMetadata from "../../public/data/boons_merged.json";

export const MODIFIER_SOURCE_REPOSITORY = "https://github.com/anodoze/mmolb-modifiers";
export const MODIFIER_SOURCE_URL = "https://raw.githubusercontent.com/anodoze/mmolb-modifiers/main/modifiers.json";

export interface BoonEntry {
  name: string;
  type: string;
  emoji: string;
  description: string;
  /** Positive multiplier percentages on the display scale (25 means +25%). */
  bonuses: Record<string, number>;
  /** Multiplier reductions on the display scale (10 means -10%). */
  penalties: Record<string, number>;
  /** Optional signed flat effects, used by ordinary player modifications. */
  flatBonuses?: Record<string, number>;
  flatPenalties?: Record<string, number>;
}

export interface ModifierEffectEntry {
  name: string;
  /** Signed multiplier percentages on the display scale. */
  multipliers: Record<string, number>;
  /** Signed flat attribute points on the display scale. */
  flats: Record<string, number>;
}

export interface BoonsMerged {
  lesser_boons: BoonEntry[];
  greater_boons?: BoonEntry[];
  modifier_effects?: ModifierEffectEntry[];
  modifier_source?: {
    status: "canonical" | "unavailable";
    repository: string;
    checked_at: string;
    next_transition: string | null;
  };
}

export interface ModifierVersion {
  valid_from: string;
  valid_until: string | null;
  effects: Record<string, number>;
  bonus_type: "Multiplier" | "Flat";
}

export type ModifierSource = Record<string, ModifierVersion[]>;

export const LOCAL_BOON_METADATA = localBoonMetadata as unknown as BoonsMerged;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value));
}

/** Strictly validate the unversioned third-party JSON before it affects calculations. */
export function isModifierSource(value: unknown): value is ModifierSource {
  if (!isRecord(value)) return false;
  if (Object.keys(value).length === 0) return false;
  return Object.entries(value).every(([name, versions]) => {
    if (name.length === 0 || !Array.isArray(versions) || versions.length === 0) return false;
    const recordsAreValid = versions.every((version) => {
      if (!isRecord(version)) return false;
      if (!isIsoDate(version.valid_from)) return false;
      if (version.valid_until !== null && !isIsoDate(version.valid_until)) return false;
      if (version.bonus_type !== "Multiplier" && version.bonus_type !== "Flat") return false;
      if (!isRecord(version.effects)) return false;
      return Object.entries(version.effects).every(([stat, amount]) =>
        stat.length > 0 && typeof amount === "number" && Number.isFinite(amount) && Math.abs(amount) <= 10
      );
    });
    if (!recordsAreValid) return false;
    const sorted = [...versions].sort((a, b) => Date.parse(a.valid_from) - Date.parse(b.valid_from));
    return sorted.every((version, index) => {
      if (version.valid_until !== null && Date.parse(version.valid_until) <= Date.parse(version.valid_from)) {
        return false;
      }
      const next = sorted[index + 1];
      if (!next) return true;
      if (version.valid_until === null) return false;
      return Date.parse(version.valid_until) <= Date.parse(next.valid_from);
    });
  });
}

/** Select [valid_from, valid_until) in UTC; later starts win defensively if data overlaps. */
export function activeModifierVersion(
  versions: ModifierVersion[],
  at: Date,
): ModifierVersion | null {
  const timestamp = at.getTime();
  return versions
    .filter((version) => {
      const start = Date.parse(version.valid_from);
      const end = version.valid_until === null ? Number.POSITIVE_INFINITY : Date.parse(version.valid_until);
      return start <= timestamp && timestamp < end;
    })
    .sort((a, b) => Date.parse(b.valid_from) - Date.parse(a.valid_from))[0] ?? null;
}

/** Earliest future validity boundary, used to refresh long-lived clients on time. */
export function nextModifierTransition(source: ModifierSource, at: Date): string | null {
  const now = at.getTime();
  let next = Number.POSITIVE_INFINITY;
  for (const versions of Object.values(source)) {
    for (const version of versions) {
      const start = Date.parse(version.valid_from);
      if (start > now) next = Math.min(next, start);
      if (version.valid_until !== null) {
        const end = Date.parse(version.valid_until);
        if (end > now) next = Math.min(next, end);
      }
    }
  }
  return Number.isFinite(next) ? new Date(next).toISOString() : null;
}

function toDisplayScale(value: number): number {
  return Math.round(value * 100 * 1_000_000) / 1_000_000;
}

/**
 * Overlay Tuesday's current numeric effects onto Pop's presentation metadata.
 * Names absent upstream remain in the catalog with their local fallback values.
 */
export function mergeModifierSource(
  source: ModifierSource,
  at: Date,
  metadata: BoonsMerged = LOCAL_BOON_METADATA,
): BoonsMerged {
  const activeEffects: ModifierEffectEntry[] = [];
  const effectByName = new Map<string, ModifierEffectEntry>();

  for (const [name, versions] of Object.entries(source)) {
    const active = activeModifierVersion(versions, at);
    if (!active) continue;
    const entry: ModifierEffectEntry = { name, multipliers: {}, flats: {} };
    const target = active.bonus_type === "Multiplier" ? entry.multipliers : entry.flats;
    for (const [stat, value] of Object.entries(active.effects)) {
      target[stat] = toDisplayScale(value);
    }
    activeEffects.push(entry);
    effectByName.set(name, entry);
  }

  // The game-facing boon is named Soul in the Machine; Tuesday's effect key is ROBO.
  const robo = effectByName.get("ROBO");
  if (robo && !effectByName.has("Soul in the Machine")) {
    effectByName.set("Soul in the Machine", { ...robo, name: "Soul in the Machine" });
  }

  const mergeCatalog = (entries: BoonEntry[] | undefined): BoonEntry[] | undefined => entries?.map((entry) => {
    const canonical = effectByName.get(entry.name);
    if (!canonical) return entry;
    const bonuses: Record<string, number> = {};
    const penalties: Record<string, number> = {};
    for (const [stat, amount] of Object.entries(canonical.multipliers)) {
      if (amount > 0) bonuses[stat] = amount;
      if (amount < 0) penalties[stat] = Math.abs(amount);
    }
    return { ...entry, bonuses, penalties };
  });

  return {
    lesser_boons: mergeCatalog(metadata.lesser_boons) ?? [],
    greater_boons: mergeCatalog(metadata.greater_boons),
    modifier_effects: activeEffects,
  };
}
