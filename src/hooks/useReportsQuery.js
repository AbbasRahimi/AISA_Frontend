import { useCallback, useEffect, useRef, useState } from 'react';

const reportsCache = new Map();

/**
 * @param {string} cacheKey
 * @param {unknown} data
 */
export function setReportsCacheEntry(cacheKey, data) {
  if (cacheKey) reportsCache.set(cacheKey, data);
}

/** @param {string} cacheKey */
export function getReportsCacheEntry(cacheKey) {
  return cacheKey ? reportsCache.get(cacheKey) : undefined;
}

/** @param {string} cacheKey */
export function invalidateReportsCacheEntry(cacheKey) {
  if (cacheKey) reportsCache.delete(cacheKey);
}

/**
 * Lazy reports fetch with module-level cache.
 * @param {() => Promise<unknown>} fetchFn
 * @param {string|null|undefined} cacheKey stable key for endpoint + params
 * @param {{ enabled?: boolean, skipCache?: boolean }} [options]
 */
export default function useReportsQuery(fetchFn, cacheKey, options = {}) {
  const { enabled = true, skipCache = false } = options;
  const cached = !skipCache && cacheKey ? reportsCache.get(cacheKey) : undefined;
  const [data, setData] = useState(cached);
  const [loading, setLoading] = useState(Boolean(enabled && cacheKey && cached === undefined));
  const [error, setError] = useState(null);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const reload = useCallback(async () => {
    if (!cacheKey) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    try {
      const result = await fetchFnRef.current(controller.signal);
      reportsCache.set(cacheKey, result);
      setData(result);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    if (!enabled || !cacheKey) {
      setLoading(false);
      return undefined;
    }

    if (!skipCache && reportsCache.has(cacheKey)) {
      setData(reportsCache.get(cacheKey));
      setLoading(false);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const result = await fetchFnRef.current(controller.signal);
        if (cancelled) return;
        reportsCache.set(cacheKey, result);
        setData(result);
      } catch (err) {
        if (cancelled || err?.name === 'AbortError') return;
        setError(err?.message || 'Request failed');
        setData(undefined);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, cacheKey, skipCache]);

  return { data, loading, error, reload };
}
