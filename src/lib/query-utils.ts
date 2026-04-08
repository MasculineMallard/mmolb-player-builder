export function asString(val: unknown): string {
  return typeof val === "string" ? val : String(val ?? "");
}

export function asStringOrNull(val: unknown): string | null {
  return val == null ? null : String(val);
}

// DB stores stats as 0.0-10.0 floats; multiply by this to get 0-1000 integer scale
export const DB_STAT_SCALE = 100;

export function asNumber(val: unknown, fallback: number): number {
  if (typeof val === "number") return val;
  const n = Number(val);
  return Number.isNaN(n) ? fallback : n;
}

export function buildSearchParams(
  nameQuery: string,
  limit: number
): { whereClause: string; params: (string | number)[]; limitParam: string } {
  const parts = nameQuery.trim().toLowerCase().split(/\s+/);

  if (parts.length >= 2) {
    const first = `${parts[0]}%`;
    const last = `${parts[parts.length - 1]}%`;
    return {
      whereClause: `(tpv.first_name ILIKE $1 AND tpv.last_name ILIKE $2)
               OR (tpv.last_name ILIKE $1 AND tpv.first_name ILIKE $2)`,
      params: [first, last, limit],
      limitParam: "$3",
    };
  }

  const word = `${parts[0]}%`;
  return {
    whereClause: `(tpv.first_name ILIKE $1 OR tpv.last_name ILIKE $1)`,
    params: [word, limit],
    limitParam: "$2",
  };
}
