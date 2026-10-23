import { useCallback, useEffect, useRef, useState } from "react";

export type Remote<T> = { data: T | null; error: unknown; loading: boolean; refreshing: boolean; reload: () => Promise<void>; setData: (v: T | null) => void };

/** Loads data with loading / error / pull-to-refresh state. Ignores results from stale calls. */
export function useRemote<T>(fn: () => Promise<T>, deps: React.DependencyList, enabled = true): Remote<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const run = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async (isReload: boolean) => {
    const id = ++run.current;
    if (isReload) setRefreshing(true); else setLoading(true);
    try {
      const d = await fnRef.current();
      if (id !== run.current) return;
      setData(d);
      setError(null);
    } catch (e) {
      if (id !== run.current) return;
      setError(e);
    } finally {
      if (id === run.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    load(false);
    return () => { run.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const reload = useCallback(() => load(true), [load]);
  return { data, error, loading, refreshing, reload, setData };
}
