// The committee step of the tour, and of the presenter walkthrough (?demo,
// where the committee is only ever the last step), plays the meeting by itself.
import { useLocation } from "react-router-dom";
import { tourSteps } from "./steps";
import { useTourState } from "./store";

// Which steps play; the same for every demo account.
const PLAYS = tourSteps({ demo: "", seller: "" }).map((s) => !!s.play);

/** True while the tour, or the presenter bar, is on a step that plays the meeting. */
export function useMeetingAutoplay(): boolean {
  const { step } = useTourState();
  const { search } = useLocation();
  return (step !== null && !!PLAYS[step]) || new URLSearchParams(search).has("demo");
}
