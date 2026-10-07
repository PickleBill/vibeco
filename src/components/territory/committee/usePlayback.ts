import { useCallback, useEffect, useMemo, useState } from "react";
import { timeline, type CommitteeResult } from "./model";

/** How long each line stays the newest before the next seat speaks. */
export const TURN_MS = 1400;

/**
 * Plays a meeting line by line. `play` starts from the first line (or jumps to
 * the end under reduced motion); `showAll` jumps to the end. A new meeting
 * starts unplayed unless it's handed to `play` or `showAll`.
 */
export function usePlayback(active: CommitteeResult | null, reduced: boolean) {
  const steps = useMemo(() => timeline(active), [active]);
  const [state, setState] = useState<{ of: CommitteeResult | null; shown: number; playing: boolean }>({ of: null, shown: 0, playing: false });
  const mine = !!active && state.of === active;
  const shown = mine ? Math.min(state.shown, steps.length) : 0;
  const playing = mine && state.playing;

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(
      () =>
        setState((s) => {
          const total = timeline(s.of).length;
          const next = Math.min(s.shown + 1, total);
          return { ...s, shown: next, playing: next < total };
        }),
      TURN_MS,
    );
    return () => window.clearTimeout(t);
  }, [playing, shown]);

  const play = useCallback(
    (meeting?: CommitteeResult | null) => {
      const c = meeting ?? active;
      if (!c) return;
      const total = timeline(c).length;
      setState(reduced ? { of: c, shown: total, playing: false } : { of: c, shown: Math.min(1, total), playing: total > 1 });
    },
    [active, reduced],
  );

  const showAll = useCallback(
    (meeting?: CommitteeResult | null) => {
      const c = meeting ?? active;
      if (c) setState({ of: c, shown: timeline(c).length, playing: false });
    },
    [active],
  );

  return { steps, shown, playing, started: shown > 0, done: steps.length > 0 && shown >= steps.length, play, showAll };
}
