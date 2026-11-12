"use client";

import { useEffect, useState } from "react";

/**
 * Current time that ticks every second. Starts from a server-provided instant so the first
 * client render matches the server HTML, then switches to the real clock.
 */
export function useNow(initialMs: number, tickMs = 1000): number {
  const [now, setNow] = useState(initialMs);
  useEffect(() => {
    const sync = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => {
      clearTimeout(sync);
      clearInterval(id);
    };
  }, [tickMs]);
  return now;
}
