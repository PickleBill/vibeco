import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDealRoom, keepLocal, localAnswers, sendAnswer } from "./api";
import { readDealRoom, type DealAnswer, type DealResponse, type DealRoomData, type Responses, type SaveState } from "./claims";

/**
 * The prospect's answers: shown at once (optimistic), kept on this device, and
 * sent to the deal-room function. A save that can't reach the function reads
 * "Saved on this device" instead of "Saved".
 */
export function useProspectAnswers(reportId: string | undefined) {
  const [responses, setResponses] = useState<Responses>(() => (reportId ? localAnswers(reportId) : {}));
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const current = useRef(responses);
  const seq = useRef<Record<string, number>>({});

  const answer = useCallback(
    async (claimId: string, a: DealAnswer, text?: string, note?: string) => {
      if (!reportId) return;
      const r: DealResponse = {
        answer: a,
        ...(a === "fix" && text ? { text } : {}),
        ...(note ? { note } : {}),
        at: new Date().toISOString(),
      };
      const next = { ...current.current, [claimId]: r };
      current.current = next;
      setResponses(next);
      keepLocal(reportId, next);
      setSaveState((s) => ({ ...s, [claimId]: "saving" }));
      const n = (seq.current[claimId] = (seq.current[claimId] ?? 0) + 1);
      const ok = await sendAnswer(reportId, claimId, r);
      // A newer answer to the same claim is in flight; it reports instead.
      if (seq.current[claimId] !== n) return;
      setSaveState((s) => ({ ...s, [claimId]: ok ? "saved" : "local" }));
    },
    [reportId],
  );

  return { responses, saveState, answer };
}

const POLL_MS = 5_000;
const OFFLINE_POLL_MS = 30_000;

/**
 * The account's answers for the seller: what the saved run held at first, then
 * a fresh read every 5 seconds while the page is open and visible. `reachable`
 * is false when the function can't be reached (then polling slows to 30s).
 */
export function useDealRoom(reportId: string | undefined, initial: unknown) {
  const [room, setRoom] = useState<DealRoomData | null>(() => readDealRoom(initial));
  const [reachable, setReachable] = useState<boolean | null>(null);

  useEffect(() => {
    setRoom(readDealRoom(initial));
    setReachable(null);
    if (!reportId) return;
    let live = true;
    let timer: number | undefined;
    const tick = async () => {
      let ok = true;
      if (!document.hidden) {
        const fresh = await fetchDealRoom(reportId);
        if (!live) return;
        ok = fresh !== undefined;
        setReachable(ok);
        if (fresh !== undefined) setRoom(fresh);
      }
      timer = window.setTimeout(tick, ok ? POLL_MS : OFFLINE_POLL_MS);
    };
    tick();
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [reportId, initial]);

  return { room, reachable };
}
