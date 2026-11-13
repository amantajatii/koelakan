"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

/** How long the typing indicator shows before an agent message, and the pause after each beat. */
const TYPING_MS = 700;
const GAP_MS = 520;
/** The result card holds longer: its price counts down and the pill wipes in. */
const RESULT_HOLD_MS = 1_500;

export interface Playback {
  /** Beats currently visible (0..total). */
  shown: number;
  typing: boolean;
  /** True once JS controls the stage (adds .chat-js). */
  ready: boolean;
  done: boolean;
  replay: () => void;
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const prefersReducedMotion = (): boolean => window.matchMedia(REDUCED_QUERY).matches;
const noopSubscribe = (): (() => void) => () => {};
const subscribeReduced = (onChange: () => void): (() => void) => {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/** True after hydration; false during SSR and the hydration render, so markup matches. */
export const useIsClient = (): boolean => useSyncExternalStore(noopSubscribe, () => true, () => false);
export const useReducedMotion = (): boolean => useSyncExternalStore(subscribeReduced, prefersReducedMotion, () => false);

/**
 * Plays `total` beats one after another once `stageRef` scrolls into view. `isAgent(i)` says whether
 * beat i gets a typing indicator; `isResult(i)` holds longer after it. Reduced motion shows everything.
 */
export function useChatPlayback(
  total: number,
  stageRef: RefObject<HTMLElement | null>,
  isAgent: (i: number) => boolean,
  isResult: (i: number) => boolean,
): Playback {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [run, setRun] = useState(0);
  const timer = useRef<number | null>(null);
  // Once hydrated, JS owns the stage (the CSS fallback stops); reduced motion shows every beat at once.
  const ready = useIsClient();
  const reduced = useReducedMotion();

  const clear = (): void => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    if (!ready || reduced || total === 0) return;
    const el = stageRef.current;
    if (!el) return;
    let step = 0;
    let started = false;

    const next = (): void => {
      if (document.hidden) {
        timer.current = window.setTimeout(next, 400);
        return;
      }
      if (step >= total) {
        setTyping(false);
        return;
      }
      const i = step;
      const reveal = (): void => {
        setTyping(false);
        setShown(i + 1);
        step = i + 1;
        timer.current = window.setTimeout(next, isResult(i) ? RESULT_HOLD_MS : GAP_MS);
      };
      if (isAgent(i)) {
        setTyping(true);
        timer.current = window.setTimeout(reveal, TYPING_MS);
      } else {
        reveal();
      }
    };

    const io = new IntersectionObserver((entries) => {
      if (!started && entries.some((e) => e.isIntersecting)) {
        started = true;
        io.disconnect();
        timer.current = window.setTimeout(next, 450);
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => {
      io.disconnect();
      clear();
    };
  }, [ready, reduced, run, total, stageRef, isAgent, isResult]);

  const replay = useCallback(() => {
    clear();
    setTyping(false);
    setShown(0);
    setRun((n) => n + 1);
  }, []);

  const visible = reduced ? total : shown;
  return { shown: visible, typing: typing && !reduced, ready, done: visible >= total, replay };
}
