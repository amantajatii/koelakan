"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Live<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

/**
 * Poll `load` while the tab is visible. `initial` (from the server render) is shown immediately;
 * a failed refresh keeps the last good data and exposes the error.
 */
export function useLive<T>(load: () => Promise<T>, initial: T | null, intervalMs: number): Live<T> {
  const [data, setData] = useState<T | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initial === null);
  const loadRef = useRef(load);
  const initialRef = useRef(initial);

  useEffect(() => {
    loadRef.current = load;
  });

  const run = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialRef.current === null) void run();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void run();
    }, intervalMs);
    return () => clearInterval(id);
  }, [run, intervalMs]);

  return { data, error, loading, refresh: () => void run() };
}
