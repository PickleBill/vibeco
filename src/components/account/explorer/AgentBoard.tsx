import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Gauge, Loader2, Minus } from "lucide-react";
import { AGENTS, type AgentId } from "./model";
import { agentIcon } from "./seatStyle";
import type { AgentBoardState } from "./useAgentBoard";

const secs = (ms?: number) => (typeof ms === "number" ? `${(ms / 1000).toFixed(1)}s` : "");

/** A thin bar with a light sweeping across it: working, without dimming the text. */
const Working = ({ tone = "bg-primary/50" }: { tone?: string }) => (
  <span className="relative mt-2 block h-1 overflow-hidden rounded-full bg-primary/10" aria-hidden>
    <span className={`absolute inset-y-0 left-0 w-1/3 rounded-full motion-safe:animate-shimmer ${tone}`} />
  </span>
);

/**
 * Seven agents read the plan at the same time (five critics, Expand and
 * Distill), then a synthesis writes the Verdict. Each tile lights up as its
 * agent finishes, with its headline; a finished critic opens its seat below.
 */
export function AgentBoard({ board, onOpen }: { board: AgentBoardState; onOpen?: (id: AgentId) => void }) {
  const running = AGENTS.some((a) => board.tiles[a.id].status === "running");
  const done = AGENTS.filter((a) => board.tiles[a.id].status === "done").length;
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!running || board.startedAt === undefined) return;
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [running, board.startedAt]);
  const elapsed = running && board.startedAt !== undefined ? now - board.startedAt : undefined;
  if (AGENTS.every((a) => board.tiles[a.id].status === "waiting")) return null;

  return (
    <section aria-labelledby="agents-title" className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 id="agents-title" className="font-display text-lg font-bold text-foreground">
            Seven agents, in parallel
          </h3>
          <p className="text-sm text-muted-foreground">Five critics and two strategists read the plan at the same time. Then one writes the verdict.</p>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
          <span className="font-semibold text-foreground">{done}</span>/7 done{elapsed !== undefined ? ` · ${secs(elapsed)}` : ""}
        </p>
      </div>
      <ol className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {AGENTS.map((a) => {
          const tile = board.tiles[a.id];
          const { icon: Icon, color } = agentIcon(a.id);
          const isDone = tile.status === "done";
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 items-start gap-1.5">
                  <Icon size={15} className={`mt-0.5 shrink-0 ${color}`} aria-hidden />
                  <span className="text-sm font-semibold leading-tight text-foreground">{a.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                  {tile.status === "running" && <Loader2 size={12} className="animate-spin text-primary" aria-label="Working" />}
                  {isDone && <Check size={13} className="text-primary" aria-label="Done" />}
                  {tile.status === "failed" && <Minus size={13} aria-label="Didn't finish" />}
                  {isDone ? secs(tile.ms) : ""}
                </span>
              </div>
              {isDone && tile.teaser ? (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-1.5 line-clamp-3 text-[13px] leading-snug text-foreground/80"
                >
                  {tile.teaser}
                </motion.p>
              ) : (
                <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
                  {tile.status === "failed" ? "Didn't finish this time." : a.role}
                </p>
              )}
              {tile.status === "running" && <Working />}
            </>
          );
          const cls = `block h-full w-full rounded-lg border p-3 text-left transition-colors ${
            isDone
              ? "border-primary/30 bg-accent/40"
              : tile.status === "running"
              ? "border-primary/30 bg-card"
              : "border-border bg-muted/30"
          }`;
          return (
            <li key={a.id}>
              {isDone && onOpen ? (
                <button type="button" onClick={() => onOpen(a.id)} className={`${cls} hover:border-primary/60`} aria-label={`${a.name}: open`}>
                  {body}
                </button>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
        <li>
          <div
            className={`flex h-full flex-col rounded-lg border p-3 ${
              board.verdict === "done"
                ? "border-emerald-600/30 bg-emerald-50/70"
                : board.verdict === "writing"
                ? "border-emerald-600/30 bg-card"
                : "border-dashed border-border bg-muted/20"
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Gauge size={15} className="text-emerald-700" aria-hidden /> Verdict
              </span>
              {board.verdict === "writing" && <Loader2 size={12} className="animate-spin text-emerald-700" aria-label="Writing" />}
              {board.verdict === "done" && <Check size={13} className="text-emerald-700" aria-label="Done" />}
            </span>
            <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
              {board.verdict === "done"
                ? "Written. Below."
                : board.verdict === "writing"
                ? "Reading all seven…"
                : board.verdict === "failed"
                ? "Didn't finish this time."
                : "Reads all seven when they're done."}
            </p>
            {board.verdict === "writing" && <Working tone="bg-emerald-600/50" />}
          </div>
        </li>
      </ol>
    </section>
  );
}
