import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Gauge, Minus } from "lucide-react";
import { cx } from "@/components/territory/style";
import { Eyebrow, LivePill } from "@/components/territory/ui";
import { card, title } from "./look";
import { AGENTS, type AgentId } from "./model";
import type { AgentBoardState } from "./useAgentBoard";

const secs = (ms?: number) => (typeof ms === "number" ? `${(ms / 1000).toFixed(1)}s` : "");

/** A thin track with a pink light sweeping across it: working, without dimming the text. */
const Working = ({ tone = "bg-brand" }: { tone?: string }) => (
  <span className="relative mt-3 block h-1 overflow-hidden rounded-full bg-[#E4E0D6]" aria-hidden>
    <span className={cx("absolute inset-y-0 left-0 w-1/3 rounded-full motion-safe:animate-shimmer", tone)} />
  </span>
);

/** Status dot: pink once finished, grey while waiting or working. */
const Dot = ({ on }: { on: boolean }) => <span className={cx("mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full", on ? "bg-brand" : "bg-[#C9C4B6]")} aria-hidden />;

/**
 * Seven agents read the plan at the same time (five critics, Expand and
 * Distill), then a synthesis writes the Verdict. Each tile turns pink as its
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
    <section aria-labelledby="agents-title" className={cx(card, "p-4 sm:p-6")}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <Eyebrow>Account lens · 7 agents + Verdict</Eyebrow>
          <h3 id="agents-title" className={cx(title, "mt-1")}>
            Seven agents, in parallel
          </h3>
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-[#4A4F63]">
            Five critics and two strategists read the plan at the same time. Then one writes the verdict.
          </p>
        </div>
        <div className="flex items-center gap-3" aria-live="polite">
          {running ? (
            <LivePill>
              Running · {done} of 7
              {elapsed !== undefined && <span className="font-mono text-[13px] font-medium">{secs(elapsed)}</span>}
            </LivePill>
          ) : (
            <p className="font-mono text-sm text-[#4A4F63]">
              <span className="font-semibold text-foreground">{done}</span> of 7 finished
            </p>
          )}
          <span className="font-mono text-xs text-muted-foreground">synthetic</span>
        </div>
      </div>

      <ol className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {AGENTS.map((a) => {
          const tile = board.tiles[a.id];
          const isDone = tile.status === "done";
          const failed = tile.status === "failed";
          const status = (
            <>
              {isDone && (
                <>
                  <Check size={13} className="text-foreground" aria-label="Done" />
                  {secs(tile.ms)}
                </>
              )}
              {failed && <Minus size={13} aria-label="Didn't finish" />}
              {tile.status === "running" && <span className="sr-only">Working</span>}
            </>
          );
          const body = (
            <>
              <span className="flex items-start gap-2">
                <Dot on={isDone} />
                <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground">{a.name}</span>
                {/* One column on phones: the time sits beside the name. */}
                <span className="mt-[3px] flex shrink-0 items-center gap-1.5 font-mono text-xs text-[#4A4F63] sm:hidden">{status}</span>
              </span>
              {isDone && tile.teaser ? (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-1 line-clamp-2 pl-[18px] text-sm leading-snug text-foreground sm:line-clamp-3"
                >
                  {tile.teaser.replace(/\s*\[[\d,\s]+\]/g, "")}
                </motion.span>
              ) : (
                <span className="mt-1 block pl-[18px] text-sm leading-snug text-[#5C6175]">{failed ? "Didn't finish this time." : a.role}</span>
              )}
              <span className="mt-auto hidden items-center gap-1.5 pl-[18px] pt-2 font-mono text-xs text-[#4A4F63] sm:flex">{status}</span>
              {tile.status === "running" && <Working />}
            </>
          );
          const cls = cx(
            "flex h-full w-full flex-col rounded-xl border p-3 text-left transition-colors duration-200 motion-reduce:transition-none",
            isDone ? "border-brand bg-brand-tint" : failed ? "border-dotted border-[#9097A6] bg-transparent" : "border-border bg-muted",
          );
          return (
            <li key={a.id}>
              {isDone && onOpen ? (
                <button
                  type="button"
                  onClick={() => onOpen(a.id)}
                  className={cx(cls, "hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2")}
                  aria-label={`${a.name}: open`}
                >
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
            className={cx(
              "flex h-full flex-col rounded-xl p-3 transition-colors duration-200 motion-reduce:transition-none",
              board.verdict === "done"
                ? "border border-foreground bg-foreground text-white"
                : board.verdict === "writing"
                ? "border-2 border-foreground bg-card"
                : board.verdict === "failed"
                ? "border border-dotted border-[#9097A6]"
                : "border border-dashed border-[#9097A6] bg-card",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[15px] font-semibold">
                <Gauge size={15} aria-hidden /> Verdict
              </span>
              {board.verdict === "writing" && <span className="sr-only">Writing</span>}
              {board.verdict === "done" && <Check size={14} aria-label="Done" />}
            </span>
            <span className={cx("mt-1.5 text-sm leading-snug", board.verdict === "done" ? "text-white/85" : "text-[#5C6175]")}>
              {board.verdict === "done"
                ? "Written. Below."
                : board.verdict === "writing"
                ? "Reading all seven…"
                : board.verdict === "failed"
                ? "Didn't finish this time."
                : "Reads all seven when they're done."}
            </span>
            {board.verdict === "writing" && <Working tone="bg-foreground" />}
          </div>
        </li>
      </ol>
    </section>
  );
}
