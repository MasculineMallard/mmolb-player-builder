/**
 * Generic singleton JSON cache factory.
 * Creates a fetch-once, cache-forever loader for static JSON data files.
 * Uses timeout-only AbortSignal (not caller's signal) so one unmount
 * doesn't abort the shared fetch for all waiters.
 */
export function createJsonCache<T extends object>(
  url: string,
  validate: (data: unknown) => data is T
): () => Promise<T> {
  let cache: T | null = null;
  let pending: Promise<T> | null = null;

  return function load(): Promise<T> {
    if (cache) return Promise.resolve(cache);
    if (pending) return pending;
    pending = fetch(url, { signal: AbortSignal.timeout(10000), cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!validate(data)) throw new Error(`Invalid response from ${url}`);
        cache = data;
        pending = null;
        return data;
      })
      .catch((err) => {
        pending = null;
        throw err;
      });
    return pending;
  };
}

export function isNonArrayObject(data: unknown): data is Record<string, unknown> {
  return !!data && typeof data === "object" && !Array.isArray(data);
}
