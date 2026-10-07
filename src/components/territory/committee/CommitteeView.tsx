import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MotionConfig, useReducedMotion } from "framer-motion";
import { Loader2, Play, RotateCcw, SkipForward } from "lucide-react";
import type { SavedReport } from "@/components/account/explorer/savedRuns";
import { qualify } from "../qualification/model";
import { QualificationCard } from "../qualification/QualificationCard";
import { cx, primaryButton, secondaryButton } from "../style";
import { LivePill } from "../ui";
import {
  SEAT_IDS,
  criticsBySeat,
  possessive,
  readCommittee,
  seatRole,
  stancesAt,
  whatIfOptions,
  type AnalysisWithCommittee,
  type SeatId,
  type Stance,
} from "./model";
import { OutcomePanel } from "./OutcomePanel";
import { RoundTable } from "./RoundTable";
import { SavedTakes, SeatCards } from "./SeatCards";
import { TakeASeat } from "./TakeASeat";
import { Stances, Transcript } from "./Transcript";
import { useCommittee } from "./useCommittee";
import { usePlayback } from "./usePlayback";
import { WhatIfPanel } from "./WhatIfPanel";

// A key per meeting, so a new meeting's transcript opens on its own last round.
const keys = new WeakMap<object, number>();
let keySeq = 0;
function meetingKey(c: object) {
  if (!keys.has(c)) keys.set(c, ++keySeq);
  return keys.get(c);
}

/** Seconds since a call started, ticking once a second. */
function useElapsed(since: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [since]);
  return since === null ? 0 : Math.max(0, Math.round((now - since) / 1000));
}

/**
 * One account's simulated buying meeting: the round table and the transcript
 * playing line by line, what-ifs, the outcome, the five seats and a seat to
 * take. The saved meeting comes from the run; without one, "Run the meeting"
 * asks committee-sim for it. The critics' saved takes keep the room full
 * whatever happens to the call.
 */
export function CommitteeView({ report, company, accountHref }: { report: SavedReport; company: string; accountHref: string }) {
  const brief = useMemo(() => report.brief ?? {}, [report.brief]);
  const sources = useMemo(() => (Array.isArray(brief.research?.sources) ? brief.research!.sources : []), [brief]);
  const analysis = report.auto_analysis as AnalysisWithCommittee | null;
  const stored = useMemo(() => readCommittee(analysis?.committee), [analysis]);
  const critics = useMemo(() => criticsBySeat(analysis), [analysis]);
  const hasCritics = Object.keys(critics).length > 0;

  const sim = useCommittee(report.id, stored);
  const baseline = sim.baseline;
  const active = sim.whatIf?.result ?? baseline;
  const reduced = !!useReducedMotion();
  const player = usePlayback(active, reduced);
  const roleOf = (seat: SeatId) => seatRole(seat, active);

  const options = useMemo(() => whatIfOptions(brief), [brief]);
  // MEDDPICC reads the meeting of record (saved or just run), never a what-if.
  const qualification = useMemo(() => (baseline ? qualify({ ...brief, company }, analysis, baseline) : null), [brief, company, analysis, baseline]);
  const [checked, setChecked] = useState<string[]>([]);

  const loading = sim.call.status === "loading";
  const elapsed = useElapsed(sim.call.status === "loading" ? sim.call.startedAt : null);
  // While the critics read, a glow passes round the table (under reduced motion, a static dashed ring instead).
  const [lit, setLit] = useState(0);
  useEffect(() => {
    if (!loading || reduced) return;
    const t = window.setInterval(() => setLit((i) => (i + 1) % SEAT_IDS.length), 900);
    return () => window.clearInterval(t);
  }, [loading, reduced]);

  // ─── Where the meeting stands ───
  const { steps, shown, playing, started, done } = player;
  const stances: Partial<Record<SeatId, Stance>> = active ? stancesAt(active, steps, shown) : {};
  const current = shown > 0 ? steps[shown - 1] : undefined;
  const moved = new Set<SeatId>();
  if (active && current && !done) {
    const atRoundStart = stancesAt(active, steps, steps.findIndex((s) => s.round === current.round));
    for (const s of SEAT_IDS) if (stances[s] !== undefined && stances[s] !== atRoundStart[s]) moved.add(s);
  }
  const whatIfOn = !!sim.whatIf && active === sim.whatIf.result;
  const baselineEnd: Partial<Record<SeatId, Stance>> | undefined = whatIfOn && done && baseline ? Object.fromEntries(baseline.seats.map((s) => [s.seat, s.stance_end])) : undefined;
  const deltas = baselineEnd ? Object.fromEntries(SEAT_IDS.filter((s) => stances[s] !== undefined && baselineEnd[s] !== undefined).map((s) => [s, stances[s]! - baselineEnd[s]!])) : undefined;

  const rounds = active?.rounds.length ?? 3;
  const eyebrow = loading ? "Reading the evidence" : done ? "Meeting over" : current ? `Round ${current.round + 1} of ${rounds}` : `${company} buying meeting`;
  const centerTitle = loading ? "The critics take their seats" : done ? active!.outcome.label : current ? active!.rounds[current.round].title : active ? "Waiting to start" : "Not run yet";

  const runMeeting = async () => {
    if (active) {
      player.play(active);
      return;
    }
    const meeting = await sim.run();
    if (meeting) player.play(meeting);
  };
  const runWhatIf = async () => {
    const asked = options.filter((o) => checked.includes(o.id)).map((o) => o.label);
    const meeting = await sim.runWhatIf(asked);
    if (meeting) player.showAll(meeting);
  };
  const backToSaved = () => {
    sim.clearWhatIf();
    if (baseline) player.showAll(baseline);
  };

  const counter = loading
    ? `reading · ${elapsed}s`
    : !active
      ? `${rounds} rounds · 15–30s to set up`
      : playing
        ? `line ${shown} of ${steps.length}`
        : done
          ? `${rounds} rounds · ${steps.length} lines`
          : `${rounds} rounds · about ${Math.max(1, Math.round((steps.length * 1.4) / 5) * 5)} seconds`;

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-7">
        {whatIfOn && (
          <div className="flex flex-wrap items-center gap-3">
            <LivePill>Meeting re-run with your what-ifs</LivePill>
            <span className="text-[15px] text-[#4A4F63]">{sim.whatIf!.asked.join(" · ")}</span>
          </div>
        )}

        <div className="grid gap-7 min-[1100px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] min-[1100px]:grid-rows-[auto_1fr]">
          {/* The table and its controls */}
          <section data-tour="committee" aria-label="Round table" className="min-w-0 min-[1100px]:col-start-1 min-[1100px]:row-start-1">
            <RoundTable
              seats={SEAT_IDS.map((s) => ({
                seat: s,
                role: roleOf(s),
                influence: active?.seats.find((x) => x.seat === s)?.influence,
                stance: active ? stances[s] : undefined,
                delta: deltas?.[s],
              }))}
              speaking={done ? undefined : current?.seat}
              lit={loading && !reduced ? SEAT_IDS[lit] : undefined}
              waiting={loading && reduced}
              eyebrow={eyebrow}
              title={centerTitle}
            />
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={runMeeting} disabled={loading || (!baseline && !hasCritics)} className={cx(primaryButton, "min-h-12 px-5 text-base")}>
                {loading ? <Loader2 size={17} className="motion-safe:animate-spin" aria-hidden /> : started ? <RotateCcw size={17} aria-hidden /> : <Play size={17} aria-hidden />}
                {loading ? "Critics are reading…" : started ? "Replay the meeting" : "Run the meeting"}
              </button>
              {active && !done && (
                <button type="button" onClick={() => player.showAll()} className={cx(secondaryButton, "min-h-12")}>
                  <SkipForward size={16} aria-hidden /> Show all
                </button>
              )}
              <span className="font-mono text-[13px] text-[#4A4F63]">{counter}</span>
            </div>
          </section>

          {/* The meeting: stances and transcript, or why there isn't one yet */}
          <section aria-label="The meeting" className="flex min-w-0 flex-col gap-4 min-[1100px]:col-start-2 min-[1100px]:row-span-2 min-[1100px]:row-start-1">
            {active ? (
              <>
                <Stances committee={active} stances={stances} moved={moved} baseline={baselineEnd} />
                <Transcript key={meetingKey(active)} committee={active} steps={steps} shown={shown} done={done} sources={sources} roleOf={roleOf} />
              </>
            ) : (
              <>
                <MeetingState company={company} call={sim.call} elapsed={elapsed} hasCritics={hasCritics} accountHref={accountHref} onRetry={runMeeting} />
                {hasCritics && <SavedTakes critics={critics} sources={sources} />}
              </>
            )}
          </section>

          {/* What-ifs */}
          <div className="min-w-0 self-start min-[1100px]:col-start-1 min-[1100px]:row-start-2">
            <WhatIfPanel
              options={options}
              checked={checked}
              onToggle={(id) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-3)))}
              onRun={runWhatIf}
              onClear={backToSaved}
              call={sim.whatIfCall}
              active={whatIfOn ? sim.whatIf!.asked : []}
              ready={!!baseline}
            />
          </div>
        </div>

        {active && done && <OutcomePanel committee={active} sources={sources} roleOf={roleOf} was={whatIfOn ? baseline ?? undefined : undefined} whatIf={whatIfOn} />}

        {qualification && !playing && !loading && <QualificationCard qualification={qualification} sources={sources} />}

        {active && <SeatCards committee={active} stances={stances} deltas={deltas} critics={critics} sources={sources} />}

        {hasCritics && <TakeASeat brief={brief} critics={critics} sources={sources} company={company} initial={active?.main_blocker.seat} />}

        <p className="border-t border-border pt-4 text-sm text-muted-foreground">Synthetic: a simulation from public sources and the five critics’ takes. Not a prediction.</p>
      </div>
    </MotionConfig>
  );
}

/** No meeting on screen: not run yet, the critics reading, or a calm failure with a retry. */
function MeetingState({
  company,
  call,
  elapsed,
  hasCritics,
  accountHref,
  onRetry,
}: {
  company: string;
  call: ReturnType<typeof useCommittee>["call"];
  elapsed: number;
  hasCritics: boolean;
  accountHref: string;
  onRetry: () => void;
}) {
  if (!hasCritics)
    return (
      <div className="rounded-xl border border-dotted border-[#9097A6] bg-white p-5">
        <h3 className="font-display text-xl font-semibold text-foreground">No critics in this run yet</h3>
        <p className="mt-2 text-base text-[#4A4F63]">The committee seats the run’s five critics, and this run doesn’t have their takes. Open the run to bring in the seven agents, then come back.</p>
        <Link to={accountHref} className={cx(secondaryButton, "mt-4")}>
          Open the run
        </Link>
      </div>
    );
  if (call.status === "loading")
    return (
      <div className="rounded-xl border border-border bg-white p-5" role="status">
        <h3 className="font-display text-[22px] font-semibold text-foreground">Critics are reading {possessive(company)} evidence</h3>
        <p className="mt-2 text-base text-[#4A4F63]">
          Five seats, three rounds. Each critic argues from the brief, its sources and its own saved take. A fresh meeting takes 15 to 30 seconds.
        </p>
        <p className="mt-3 flex items-center gap-2 font-mono text-[13px] text-[#4A4F63]">
          <Loader2 size={14} className="motion-safe:animate-spin text-primary" aria-hidden /> {elapsed}s
        </p>
      </div>
    );
  if (call.status === "error")
    return (
      <div className="rounded-xl border border-border bg-white p-5" role="alert">
        <h3 className="font-display text-xl font-semibold text-foreground">The meeting didn’t start</h3>
        <p className="mt-2 text-base text-[#4A4F63]">
          {call.message} The five critics’ saved takes are still here, below.
        </p>
        <button type="button" onClick={onRetry} className={cx(secondaryButton, "mt-4")}>
          <RotateCcw size={16} aria-hidden /> Try again
        </button>
      </div>
    );
  return (
    <div className="rounded-xl border border-dotted border-[#9097A6] bg-white p-5">
      <h3 className="font-display text-xl font-semibold text-foreground">This meeting hasn’t run yet</h3>
      <p className="mt-2 text-base text-[#4A4F63]">
        Press <b className="text-foreground">Run the meeting</b>. The five critics from {possessive(company)} run take the seats and debate in three short rounds; stance meters
        move as arguments land. It takes 15 to 30 seconds the first time, then it’s saved with the run.
      </p>
    </div>
  );
}
