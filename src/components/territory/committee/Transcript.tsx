import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Equal } from "lucide-react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { cx } from "../style";
import { stanceBefore, stanceWord, type CommitteeResult, type SeatId, type Stance, type Step } from "./model";
import { CitedLine, Delta, SeatToken, StanceMeter } from "./parts";

// ─── Stances: one meter per seat, easing as lines land ───

export function Stances({
  committee,
  stances,
  moved,
  baseline,
}: {
  committee: CommitteeResult;
  stances: Partial<Record<SeatId, Stance>>;
  /** Seats whose stance moved in the round being played. */
  moved: Set<SeatId>;
  /** The saved meeting's final stances, shown under a what-if. */
  baseline?: Partial<Record<SeatId, Stance>>;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-bold text-foreground">Where each seat stands</h3>
        <span className="font-mono text-xs text-muted-foreground">blocks · sponsors</span>
      </div>
      <ul className="mt-3 space-y-3">
        {committee.seats.map((s) => {
          const v = stances[s.seat] ?? s.stance_start;
          const was = baseline?.[s.seat];
          return (
            <li key={s.seat} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold leading-tight text-foreground">{s.role}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[#4A4F63]">
                  {stanceWord(v)}
                  {was !== undefined && <Delta by={v - was} />}
                </span>
              </span>
              <StanceMeter value={v} label={s.role} moved={moved.has(s.seat)} baseline={was} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Transcript: the round being played, or any round once it's over ───

function MoveNote({ before, after }: { before: Stance; after: Stance }) {
  if (before === after)
    return (
      <>
        <Equal size={13} aria-hidden /> Holds at {stanceWord(after)}
      </>
    );
  const Icon = after > before ? ArrowUp : ArrowDown;
  return (
    <>
      <Icon size={13} aria-hidden /> {stanceWord(before)} → <span className="font-semibold text-foreground">{stanceWord(after)}</span>
    </>
  );
}

export function Transcript({
  committee,
  steps,
  shown,
  done,
  sources,
  roleOf,
}: {
  committee: CommitteeResult;
  steps: Step[];
  shown: number;
  done: boolean;
  sources: ResearchSource[];
  roleOf: (seat: SeatId) => string;
}) {
  const rounds = committee.rounds.length;
  const [picked, setPicked] = useState(rounds - 1);
  const current = shown > 0 ? steps[shown - 1].round : -1;
  const round = done ? Math.min(picked, rounds - 1) : current;
  const lines = steps.map((s, i) => ({ ...s, i })).filter((s) => s.round === round && (done || s.i < shown));

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-display text-xl font-semibold tracking-[-0.01em] text-foreground">
          {round < 0 ? "Transcript" : `Round ${round + 1} of ${rounds} · ${committee.rounds[round].title}`}
        </h3>
        <span className="font-mono text-xs text-muted-foreground">all voices synthetic</span>
      </div>

      {done && rounds > 1 && (
        <div role="group" aria-label="Show a round" className="mt-3 flex flex-wrap gap-2">
          {committee.rounds.map((r, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={i === round}
              onClick={() => setPicked(i)}
              className={cx(
                "inline-flex min-h-11 items-center rounded-full px-4 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === round ? "border-2 border-primary bg-brand-tint font-bold text-foreground" : "border border-[#9097A6] bg-white font-medium text-foreground hover:bg-muted",
              )}
            >
              Round {i + 1}
            </button>
          ))}
        </div>
      )}

      {round < 0 ? (
        <p className="mt-3 rounded-xl border border-dotted border-[#9097A6] p-4 text-base text-[#4A4F63]">
          Press <b className="text-foreground">Run the meeting</b>. The five seats debate in {rounds === 1 ? "one round" : `${rounds} short rounds`}; stance meters move as arguments land.
        </p>
      ) : (
        <ol aria-live="polite" className="mt-3 space-y-3">
          <AnimatePresence initial={false}>
            {lines.map((s) => {
              const before = stanceBefore(committee, steps, s.i);
              const moved = before !== s.stance_after;
              return (
                <motion.li key={`${round}-${s.i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex gap-2.5">
                  <SeatToken seat={s.seat} stance={s.stance_after} size="sm" speaking={!done && s.i === shown - 1} />
                  <div className={cx("min-w-0 flex-1 rounded-[4px_14px_14px_14px] border px-3.5 py-3 transition-colors duration-300", moved ? "border-brand bg-brand-tint" : "border-border bg-white")}>
                    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                      <span className="text-sm font-bold text-foreground">{roleOf(s.seat)}</span>
                      <span className="font-mono text-xs text-muted-foreground">Round {s.round + 1} · synthetic</span>
                    </p>
                    <p className="mt-1 text-base leading-relaxed text-foreground">
                      <CitedLine text={s.says} sources={sources} />
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[13px] text-[#4A4F63]">
                      <MoveNote before={before} after={s.stance_after} />
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}
