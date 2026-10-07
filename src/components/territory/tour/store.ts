// The welcome card and the guided tour share one small store outside React, so
// the tour survives the route changes it makes and the top-bar button can
// reopen the card from anywhere in the shell.
import { useSyncExternalStore } from "react";

export interface TourState {
  /** The "How this works" card is open. */
  welcome: boolean;
  /** The tour step on screen (0-based; one past the last is the finish card), or null when off. */
  step: number | null;
}

const OFF: TourState = { welcome: false, step: null };
let state: TourState = OFF;
const listeners = new Set<() => void>();

function set(next: Partial<TourState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useTourState = () => useSyncExternalStore(subscribe, () => state);

export const openWelcome = () => set({ welcome: true, step: null });
export const closeWelcome = () => set({ welcome: false });
export const setStep = (step: number | null) => set({ welcome: false, step });

// ─── "Seen it": localStorage when it works, else once per page load ───
// The card never opens by itself; this only records that someone saw it.

const KEY = (seller: string) => `vibeco.territory.welcome.${seller}`;
/** Sellers whose card already showed (or was skipped) in this page load. */
const shownThisLoad = new Set<string>();

export function welcomeSeen(seller: string): boolean {
  if (shownThisLoad.has(seller)) return true;
  try {
    return window.localStorage.getItem(KEY(seller)) === "1";
  } catch {
    return false;
  }
}

/** Remember the card was seen. A blocked or full storage only costs the memory across visits. */
export function markWelcomeSeen(seller: string, persist = true) {
  shownThisLoad.add(seller);
  if (!persist) return;
  try {
    window.localStorage.setItem(KEY(seller), "1");
  } catch {
    // Private windows and blocked site data: once per page load is the fallback.
  }
}

/** Tests only: back to a fresh page load. */
export function resetTour() {
  state = OFF;
  shownThisLoad.clear();
  listeners.forEach((l) => l());
}
