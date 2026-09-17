"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const CACHE_TTLS = {
  /** Transactional lists that change often — stale-while-revalidate after 60s */
  realtime: 60_000,
  /** Reference data — campaigns, pipelines, users, folders */
  reference: 5 * 60_000,
  /** Rarely-changing data */
  long: 10 * 60_000,
} as const;

type Entry<T> = { data: T; ts: number };

const memory = new Map<string, Entry<unknown>>();

function readSession<T>(key: string): Entry<T> | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const raw = sessionStorage.getItem(`crm-cache:${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as Entry<T>;
  } catch {
    return null;
  }
}

function writeSession(key: string, entry: Entry<unknown>) {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(`crm-cache:${key}`, JSON.stringify(entry));
  } catch {
    // sessionStorage full or unavailable — memory cache still works
  }
}

export function getCached<T>(key: string): Entry<T> | null {
  const mem = memory.get(key) as Entry<T> | undefined;
  if (mem) return mem;
  return readSession<T>(key);
}

export function setCached<T>(key: string, data: T) {
  const entry: Entry<T> = { data, ts: Date.now() };
  memory.set(key, entry);
  writeSession(key, entry);
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    memory.clear();
    try {
      if (typeof sessionStorage !== "undefined") {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k?.startsWith("crm-cache:")) sessionStorage.removeItem(k);
        }
      }
    } catch {
      // ignore
    }
    return;
  }
  for (const k of Array.from(memory.keys())) {
    if (k === prefix || k.startsWith(prefix)) memory.delete(k);
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k === `crm-cache:${prefix}` || k?.startsWith(`crm-cache:${prefix}`))
          sessionStorage.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
}

type Options = {
  /** Freshness window in ms. Stale data renders instantly + revalidates in background. */
  ttl?: number;
  /** Skip the fetch (e.g. waiting for role). Cached data still renders. */
  enabled?: boolean;
};

/**
 * Stale-while-revalidate fetch hook.
 * - Cached + fresh → no network at all (fixes reload-everything on nav).
 * - Cached + stale → render cache instantly, revalidate silently.
 * - No cache → `loading=true` spinner; otherwise `refreshing=true` only.
 */
export function useCachedFetch<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  { ttl = CACHE_TTLS.realtime, enabled = true }: Options = {}
) {
  const initial = key ? getCached<T>(key) : null;
  const [data, setData] = useState<T | null>(initial?.data ?? null);
  const [loading, setLoading] = useState(() => (initial ? false : enabled && !!key));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!key || !enabled) return null;
      const hasCache = getCached<T>(key) !== null;
      if (!opts.silent) {
        if (hasCache) setRefreshing(true);
        else setLoading(true);
      }
      setError(null);
      try {
        const fresh = await fetcherRef.current();
        setCached(key, fresh);
        setData(fresh);
        return fresh;
      } catch (e) {
        // Keep stale data on screen on background failures
        if (!hasCache) setError(e);
        return null;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [key, enabled]
  );

  useEffect(() => {
    if (!key || !enabled) {
      if (!key) setLoading(false);
      return;
    }
    const cached = getCached<T>(key);
    if (cached) {
      setData(cached.data);
      setLoading(false);
      if (Date.now() - cached.ts > ttl) {
        // stale → silent background revalidate, no spinner
        refresh({ silent: true });
      }
    } else {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ttl]);

  return { data, loading, refreshing, error, refresh, setData };
}
