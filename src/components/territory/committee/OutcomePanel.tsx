import { useId, useState, type ReactNode } from "react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { Fold, FoldButton, ReadMore } from "../Memo";
import { cx } from "../style";
import type { CommitteeResult, SeatId } from "./model";
import { CitedLine, SeatToken } from "./parts";

const EASE = "transition-[left,width] duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none";

/** The outcome as a band on 0–100%, with the saved meeting's band dashed behind it under a what-if. */
function OutcomeBand({ outcome, was }: { outcome: CommitteeResult["outcome"]; was?: CommitteeResult["outcome"] }) {
  const changed = was && (was.low !== outcome.low || was.high !== outcome.high || was.label !== outcome.label);
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-[28px] font-bold leading-tight tracking-[-0.01em] text-foreground">{outcome.label}</span>
        <span className="font-mono text-base font-semibold text-foreground">
          {outcome.low}–{outcome.high}%
        </span>
        {changed && (
          <span className="font-mono text-[13px] text-[#4A4F63]">
            saved meeting: {was.label}, {was.low}–{was.high}%
          </span>
        )}
      </p>
      <div
        role="img"
        aria-label={`Synthetic estimate: ${outcome.label}, ${outcome.low} to ${outcome.high} percent${changed ? `; the saved meeting was ${was.label}, ${was.low} to ${was.high} percent` : ""}`}
        className="relative mt-3 h-7 rounded-md border border-foreground bg-muted"
      >
        {[25, 50, 75].map((t) => (
          <span key={t} aria-hidden className="absolute inset-y-0 w-px bg-[#D9D4C7]" style={{ left: `${t}%` }} />
        ))}
        {changed && <span aria-hidden className="absolute inset-y-1 rounded border-2 border-dashed border-[#4A4F63]" style={{ left: `${was.low}%`, width: `${Math.max(1, was.high - was.low)}%` }} />}
        <span aria-hidden className={cx("absolute inset-y-[3px] rounded bg-foreground", EASE)} style={{ left: `${outcome.low}%`, width: `${Math.max(1, outcome.high - outcome.low)}%` }} />
      </div>
      <div aria-hidden className="mt-1 flex justify-between font-mono text-xs text-muted-foreground">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

const H3 = "text-[13px] font-bold uppercase tracking-[0.04em] text-muted-foreground";

/** A step's seat, with the step's "why" folded under a small toggle beside it. */
function Step({ role, children }: { role: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = `why-${useId().replace(/:/g, "")}`;
  const pill = <span className="inline-flex items-center rounded-md border border-[#D9D4C7] bg-white px-1.5 text-[13px] font-semibold leading-5 text-foreground">{role}</span>;
  if (!children) return <p className="mt-1.5">{pill}</p>;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2.5">
        {pill}
        <FoldButton open={open} controls={id} onClick={() => setOpen((v) => !v)} className="text-sm">
          Why<span className="sr-only"> this step</span>
        </FoldButton>
      </div>
      <Fold open={open} id={id}>
        <p className="pb-1 text-[15px] leading-relaxed text-[#4A4F63]">{children}</p>
      </Fold>
    </div>
  );
}

/**
 * After the last round: the path to yes as a stepper, the main blocker and
 * what would flip it, and the outcome band.
 */
export function OutcomePanel({
  committee,
  sources,
  roleOf,
  was,
  whatIf,
}: {
  committee: CommitteeResult;
  sources: ResearchSource[];
  roleOf: (seat: SeatId) => string;
  /** The saved meeting, under a what-if. */
  was?: CommitteeResult;
  whatIf?: boolean;
}) {
  const b = committee.main_blocker;
  return (
    <section aria-labelledby="committee-outcome" className="overflow-hidden rounded-[14px] border border-foreground bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border bg-muted px-4 py-3.5 sm:px-5">
        <h2 id="committee-outcome" className="font-display text-2xl font-semibold tracking-[-0.01em] text-foreground">
          Outcome{whatIf ? " with your what-ifs" : ""}
        </h2>
        <span className="font-mono text-xs text-muted-foreground">synthetic{whatIf ? " · not saved" : ""}</span>
      </div>
      <div className="grid gap-x-8 gap-y-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <OutcomeBand outcome={committee.outcome} was={was?.outcome} />
        </div>
        {committee.outcome.summary && (
          <div className="min-w-0 self-center">
            <ReadMore lines={3} className="text-[17px] leading-relaxed text-foreground">
              <CitedLine text={committee.outcome.summary} sources={sources} />
            </ReadMore>
          </div>
        )}

        <div className="min-w-0 lg:col-start-1">
          {committee.path_to_yes.length > 0 && (
            <>
              <h3 className={H3}>Path to yes</h3>
              <ol className="mt-3 space-y-3.5">
                {committee.path_to_yes.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-foreground font-mono font-semibold text-white" aria-hidden>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-semibold leading-snug text-foreground">
                        <span className="sr-only">Step {i + 1}: </span>
                        <CitedLine text={p.step} sources={sources} />
                      </p>
                      <Step role={roleOf(p.seat)}>{p.why && <CitedLine text={p.why} sources={sources} />}</Step>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>

        <div className="min-w-0">
          <div className="rounded-[10px] border border-dashed border-foreground p-4">
            <div className="flex items-center gap-3">
              <SeatToken seat={b.seat} size="md" stance={committee.seats.find((s) => s.seat === b.seat)?.stance_end} />
              <h3 className={H3}>
                Main blocker · <span className="text-foreground">{roleOf(b.seat)}</span>
              </h3>
            </div>
            {b.why && (
              <p className="mt-3 text-base leading-relaxed text-foreground">
                <CitedLine text={b.why} sources={sources} />
              </p>
            )}
            {b.what_would_flip_it && (
              <>
                <h3 className={cx(H3, "mt-4")}>What would flip it</h3>
                <p className="mt-1 text-base font-semibold leading-relaxed text-foreground">
                  <CitedLine text={b.what_would_flip_it} sources={sources} />
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
