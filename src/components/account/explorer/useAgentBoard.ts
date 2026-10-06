import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AGENTS, stripMarks, teaserFor, type AccountAnalysis, type AgentId } from "./model";

export interface TileState {
  status: "waiting" | "running" | "done" | "failed";
  /** How long the agent took. */
  ms?: number;
  teaser?: string;
}

export type VerdictState = "waiting" | "writing" | "done" | "failed";

export interface AgentBoardState {
  tiles: Record<AgentId, TileState>;
  verdict: VerdictState;
  /** performance.now() when the agents started (live runs). */
  startedAt?: number;
}

const all = (status: TileState["status"]) =>
  Object.fromEntries(AGENTS.map((a) => [a.id, { status }])) as Record<AgentId, TileState>;

/** How long a saved run's replay takes, whatever the real times were. */
const REPLAY_MS = 1600;

/**
 * The seven agents' tiles. Live: `listen(reportId)` subscribes to the run's
 * agent_events (orchestrate writes one as each agent finishes) before the
 * agents start, so no event is missed; `settle(analysis)` fills whatever
 * realtime didn't. Saved runs: `settle(analysis, { replay: true })` lights the
 * tiles in the order they really finished, scaled to under two seconds.
 */
export function useAgentBoard() {
  const reduced = useReducedMotion();
  const [board, setBoard] = useState<AgentBoardState>({ tiles: all("waiting"), verdict: "waiting" });
  const channel = useRef<RealtimeChannel | null>(null);
  const timers = useRef<number[]>([]);

  const stop = useCallback(() => {
    if (channel.current) supabase.removeChannel(channel.current);
    channel.current = null;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => stop, [stop]);

  const reset = useCallback(() => {
    stop();
    setBoard({ tiles: all("waiting"), verdict: "waiting" });
  }, [stop]);

  const listen = useCallback(
    async (reportId: string | null) => {
      stop();
      const startedAt = performance.now();
      setBoard({ tiles: all("running"), verdict: "waiting", startedAt });
      if (!reportId) return;
      await new Promise<void>((resolve) => {
        const ready = window.setTimeout(resolve, 1200);
        channel.current = supabase
          .channel(`account-agents-${reportId}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "agent_events", filter: `report_id=eq.${reportId}` },
            (payload) => {
              const ev = payload.new as { agent?: string; event_type?: string; data?: Record<string, unknown> | null };
              const data = ev.data ?? {};
              if (ev.event_type === "completed" && AGENTS.some((a) => a.id === ev.agent)) {
                const teaser = stripMarks(String(data.headline ?? data.core_insight ?? data.thesis ?? ""));
                const ms = typeof data.latency_ms === "number" ? data.latency_ms : Math.round(performance.now() - startedAt);
                setBoard((b) => ({ ...b, tiles: { ...b.tiles, [ev.agent as AgentId]: { status: "done", ms, teaser } } }));
              } else if (ev.agent === "orchestrator" && ev.event_type === "phase1-complete") {
                setBoard((b) => ({ ...b, verdict: b.verdict === "done" ? "done" : "writing" }));
              }
            },
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              window.clearTimeout(ready);
              resolve();
            }
          });
      });
    },
    [stop],
  );

  const settle = useCallback(
    (analysis: AccountAnalysis | null, opts: { replay?: boolean } = {}) => {
      stop();
      const timing = analysis?.timing ?? {};
      const final = (id: AgentId): TileState => {
        const teaser = teaserFor(id, analysis);
        const key = AGENTS.find((a) => a.id === id)!.timingKey;
        return teaser ? { status: "done", ms: timing[key], teaser } : { status: "failed" };
      };
      const verdict: VerdictState = analysis?.synthesis?.executive_summary ? "done" : "failed";
      if (!analysis || reduced) {
        setBoard((b) => ({ ...b, tiles: Object.fromEntries(AGENTS.map((a) => [a.id, final(a.id)])) as AgentBoardState["tiles"], verdict }));
        return;
      }
      // Light the tiles still running in the order they really finished.
      const order = [...AGENTS].sort((a, b) => (timing[a.timingKey] ?? 1e9) - (timing[b.timingKey] ?? 1e9));
      const slowest = Math.max(1, ...order.map((a) => timing[a.timingKey] ?? 0));
      if (opts.replay) setBoard({ tiles: all("running"), verdict: "waiting" });
      let last = 0;
      order.forEach((a, i) => {
        const at = opts.replay ? Math.round(((timing[a.timingKey] ?? slowest) / slowest) * REPLAY_MS * 0.75) + 120 : i * 90;
        last = Math.max(last, at);
        timers.current.push(
          window.setTimeout(() => {
            setBoard((b) => (b.tiles[a.id].status === "done" ? b : { ...b, tiles: { ...b.tiles, [a.id]: final(a.id) } }));
          }, at),
        );
      });
      if (opts.replay) timers.current.push(window.setTimeout(() => setBoard((b) => ({ ...b, verdict: "writing" })), last + 150));
      timers.current.push(window.setTimeout(() => setBoard((b) => ({ ...b, verdict })), last + (opts.replay ? 650 : 200)));
    },
    [reduced, stop],
  );

  /** Orchestrate failed: whatever is still running didn't finish. */
  const fail = useCallback(() => {
    stop();
    setBoard((b) => ({
      ...b,
      tiles: Object.fromEntries(AGENTS.map((a) => [a.id, b.tiles[a.id].status === "done" ? b.tiles[a.id] : { status: "failed" }])) as AgentBoardState["tiles"],
      verdict: "failed",
    }));
  }, [stop]);

  return { board, listen, settle, reset, fail };
}
