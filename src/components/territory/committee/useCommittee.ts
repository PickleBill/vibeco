import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readCommittee, type CommitteeResult } from "./model";

/** A fresh meeting takes 15–30 seconds; give up after a minute and a half. */
const TIMEOUT_MS = 90_000;

export type CallState = { status: "idle" } | { status: "loading"; startedAt: number } | { status: "error"; message: string; rateLimited: boolean };

// Meetings run here, kept for the page's life so switching accounts and back
// doesn't re-run them. What-if meetings are never kept.
const baselines = new Map<string, CommitteeResult>();

// One warm-up call per page, so the first real meeting doesn't wait on a cold start.
let warmed = false;
function warmUp() {
  if (warmed) return;
  warmed = true;
  supabase.functions.invoke("committee-sim", { body: { ping: true } }).catch(() => undefined);
}

class SimError extends Error {
  constructor(
    message: string,
    readonly rateLimited = false,
  ) {
    super(message);
  }
}

async function simulate(body: Record<string, unknown>, signal: AbortSignal): Promise<CommitteeResult> {
  const { data, error } = await supabase.functions.invoke("committee-sim", { body, signal });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const status = ctx && typeof ctx.status === "number" ? ctx.status : 0;
    let message = "";
    if (ctx && typeof ctx.json === "function") {
      try {
        const j = await ctx.json();
        if (j?.error) message = String(j.error);
      } catch {
        // no JSON body
      }
    }
    if (status === 429) throw new SimError("Too many meetings from this connection just now. Wait a minute, then try again.", true);
    if (status >= 400 && status < 500 && status !== 404 && message) throw new SimError(message);
    throw new SimError(status >= 500 ? "The meeting didn’t finish on our side." : "The committee isn’t available right now.");
  }
  if ((data as { error?: string } | null)?.error) throw new SimError(String((data as { error: string }).error));
  const meeting = readCommittee(data);
  if (!meeting) throw new SimError("The meeting came back incomplete.");
  return meeting;
}

/**
 * One account's simulated meeting: the saved one when the run has it, else
 * one run here on request; and what-if meetings, which are compared with it
 * and never kept. Both calls resolve to the meeting (or null on failure or
 * after the view closes) so the caller can start playing it.
 */
export function useCommittee(reportId: string, stored: CommitteeResult | null) {
  const [baseline, setBaseline] = useState<CommitteeResult | null>(() => stored ?? baselines.get(reportId) ?? null);
  const [call, setCall] = useState<CallState>({ status: "idle" });
  const [whatIf, setWhatIf] = useState<{ asked: string[]; result: CommitteeResult } | null>(null);
  const [whatIfCall, setWhatIfCall] = useState<CallState>({ status: "idle" });
  const live = useRef(new Set<AbortController>());

  useEffect(() => {
    const open = live.current;
    return () => {
      for (const c of open) c.abort();
      open.clear();
    };
  }, []);

  const needsRun = !baseline;
  useEffect(() => {
    if (needsRun) warmUp();
  }, [needsRun]);

  const request = useCallback(async (body: Record<string, unknown>, set: (s: CallState) => void): Promise<CommitteeResult | null> => {
    const ctrl = new AbortController();
    live.current.add(ctrl);
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, TIMEOUT_MS);
    set({ status: "loading", startedAt: Date.now() });
    try {
      const meeting = await simulate(body, ctrl.signal);
      if (!live.current.has(ctrl)) return null;
      set({ status: "idle" });
      return meeting;
    } catch (e) {
      if (!live.current.has(ctrl) || (ctrl.signal.aborted && !timedOut)) return null;
      set({
        status: "error",
        message: timedOut ? "The meeting took longer than expected." : e instanceof SimError ? e.message : "The committee isn’t available right now.",
        rateLimited: e instanceof SimError && e.rateLimited,
      });
      return null;
    } finally {
      window.clearTimeout(timer);
      live.current.delete(ctrl);
    }
  }, []);

  /** Run the meeting (no what-ifs); the endpoint saves it with the run. */
  const run = useCallback(async () => {
    const meeting = await request({ report_id: reportId }, setCall);
    if (meeting) {
      baselines.set(reportId, meeting);
      setBaseline(meeting);
    }
    return meeting;
  }, [reportId, request]);

  /** Re-run with hypotheticals; shown against the saved meeting, never kept. */
  const runWhatIf = useCallback(
    async (asked: string[]) => {
      const meeting = await request({ report_id: reportId, what_if: asked.slice(0, 3) }, setWhatIfCall);
      if (meeting) setWhatIf({ asked, result: meeting });
      return meeting;
    },
    [reportId, request],
  );

  const clearWhatIf = useCallback(() => {
    setWhatIf(null);
    setWhatIfCall({ status: "idle" });
  }, []);

  return { baseline, call, run, whatIf, whatIfCall, runWhatIf, clearWhatIf };
}
