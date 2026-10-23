import { useState, useEffect } from 'react';

/**
 * A JSON file from /public/data, fetched once and shared by every component.
 * Concurrent callers share one request; a failed request can be retried.
 */
export function createJsonResource<Raw, T>(url: string, label: string, map: (raw: Raw) => T) {
  let promise: Promise<T> | null = null;

  function load(): Promise<T> {
    if (!promise) {
      promise = fetch(url)
        .then(r => {
          if (!r.ok) throw new Error(`Couldn't load ${label} (HTTP ${r.status})`);
          return r.json() as Promise<Raw>;
        })
        .then(map)
        .catch(err => {
          promise = null;
          throw err;
        });
    }
    return promise;
  }

  function useResource(initial: T) {
    const [data, setData] = useState<T>(initial);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
      let cancelled = false;
      load()
        .then(d => { if (!cancelled) setData(d); })
        .catch(e => { if (!cancelled) setError(e.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, []);
    return { data, loading, error };
  }

  return { load, useResource };
}
