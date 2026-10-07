// Finding a step's target on the page, and opening what hides it. Shared by
// the tour card and the presenter bar, so both point at the same things.
import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/** How long a step waits for its own target before settling for a fallback. */
export const FALLBACK_AFTER_MS = 1500;

/** The `[data-tour=name]` element, if it's on the page and has a size (a shut fold has none). */
export function findTour(name: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
  const r = el?.getBoundingClientRect();
  return el && r && (r.width || r.height) ? el : null;
}

/**
 * The step's target, else (once it has had time to show up) the first
 * fallback on the page, else null.
 */
export function pickTarget(target: string, fallback: string[] = [], waited = Infinity): HTMLElement | null {
  const main = findTour(target);
  if (main || waited < FALLBACK_AFTER_MS) return main;
  for (const f of fallback) {
    const el = findTour(f);
    if (el) return el;
  }
  return null;
}

/**
 * Press the step's folds and choices in order, from `from`: each one (or the
 * button around it) is clicked only when it's shut or not picked. Stops at the
 * first that isn't on the page yet (it may appear once the one before it
 * opens). Returns how many are done.
 */
export function revealFrom(reveal: string[], from: number): number {
  let i = from;
  for (; i < reveal.length; i++) {
    const marker = document.querySelector<HTMLElement>(`[data-tour="${reveal[i]}"]`);
    if (!marker) break;
    const button = marker.closest<HTMLElement>("button") ?? marker;
    const shut = ["aria-expanded", "aria-pressed", "aria-selected"].some((a) => button.getAttribute(a) === "false");
    if (shut) button.click();
  }
  return i;
}

/**
 * The presenter bar's half of a step: once the step opens, press its folds
 * and bring its target (or a fallback) on screen, just under `offset` (the
 * bar, which stays on screen). Content that swaps in after a fold opens can
 * push the target, so it's followed for a moment after the first scroll,
 * until the person scrolls for themselves. Gives up quietly after a few
 * seconds.
 */
export function useBringIntoView(step: { target: string; fallback?: string[]; reveal?: string[] } | undefined, key: string, offset: () => number) {
  const reduce = useReducedMotion();
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const target = step?.target;
  const fallbackKey = step?.fallback?.join(" ") ?? "";
  const revealKey = step?.reveal?.join(" ") ?? "";
  useEffect(() => {
    if (!target) return;
    const fallbacks = fallbackKey ? fallbackKey.split(" ") : [];
    const reveals = revealKey ? revealKey.split(" ") : [];
    const start = Date.now();
    let revealed = 0;
    let pressedAt = 0;
    let scrolledAt = 0;
    const stop = () => window.clearInterval(t);
    const tick = () => {
      const now = Date.now();
      const done = revealFrom(reveals, revealed);
      if (done > revealed) pressedAt = now;
      revealed = done;
      const el = pickTarget(target, fallbacks, now - start);
      // Wait for the folds to open and what they hold to swap in.
      if (!el || revealed < reveals.length || now - start < 600 || now - pressedAt < 700) {
        if (now - start > 5000) stop();
        return;
      }
      // One scroll, then (once a smooth scroll has had time to land) one correction if the target moved.
      if (scrolledAt && now - scrolledAt < 900) return;
      const r = el.getBoundingClientRect();
      const top = offsetRef.current();
      const off = scrolledAt ? Math.abs(r.top - top) > 24 : r.top < top || r.bottom > window.innerHeight;
      if (off) window.scrollTo?.({ top: Math.max(0, window.scrollY + r.top - top), behavior: reduce || scrolledAt ? "auto" : "smooth" });
      if (scrolledAt || !off) stop();
      else scrolledAt = now;
    };
    const t = window.setInterval(tick, 200);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    return () => {
      stop();
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
    };
  }, [target, fallbackKey, revealKey, key, reduce]);
}
