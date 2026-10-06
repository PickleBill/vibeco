import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, MessageSquareQuote, Minimize2, Scissors, Target, Users, Zap } from "lucide-react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { SEATS, criticFor, distillLabel } from "@/lib/lenses";
import { Cited, type AccountBrief } from "../AccountViews";
import { POTENTIAL_LABEL, asList, criticParagraphs, seatPeople, stripMarks, type AccountAnalysis, type CriticResult, type Person } from "./model";
import { SEAT_STYLE } from "./seatStyle";

export type LensId = "stress" | "expand" | "distill";

const EASE = [0.22, 1, 0.36, 1] as const;
const swap = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: EASE },
} as const;

const LENSES: { id: LensId; label: string; description: string; icon: typeof Zap }[] = [
  { id: "stress", label: "Stress test", description: "Five seats, one at a time", icon: Zap },
  { id: "expand", label: "Expand", description: "Three ways into the account", icon: Maximize2 },
  { id: "distill", label: "Distill", description: "The one thing that matters", icon: Minimize2 },
];

interface Props {
  analysis: AccountAnalysis | null;
  brief: AccountBrief;
  sources: ResearchSource[];
  lens: LensId;
  onLens: (lens: LensId) => void;
  seat: string;
  onSeat: (seat: string) => void;
  /** Under a seat's questions: answering the critic (live runs and reports). */
  answer?: (seat: string, critic: CriticResult) => ReactNode;
}

/**
 * "Explore one lens at a time" for an account: pick a seat to see that
 * critic's take and the questions they'd ask, or see the three ways in, or the
 * one thing that matters. Everything here comes from the saved run: no calls.
 */
export function LensExplorer({ analysis, brief, sources, lens, onLens, seat, onSeat, answer }: Props) {
  const perspectives = Array.isArray(analysis?.perspectives) ? analysis!.perspectives : [];
  const plays = (analysis?.expansion?.expansions ?? []).filter((p) => p?.title || p?.pitch).slice(0, 3);
  const d = analysis?.distillation ?? null;
  const available: Record<LensId, boolean> = {
    stress: perspectives.length > 0,
    expand: plays.length > 0,
    distill: !!d && ["one_feature", "one_customer", "one_revenue", "thesis_statement"].some((k) => typeof d[k] === "string" && d[k]),
  };
  if (!available.stress && !available.expand && !available.distill) return null;
  const shown = LENSES.filter((l) => available[l.id]);
  const active = available[lens] ? lens : shown[0].id;

  return (
    <section aria-labelledby="lens-title" className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Zap size={18} className="text-primary" aria-hidden />
        </span>
        <div>
          <h3 id="lens-title" className="font-display text-xl font-bold tracking-tight text-foreground">
            Explore one lens at a time
          </h3>
          <p className="text-sm text-muted-foreground">Pressure-test the plan before the call: one seat, one angle, one answer at a time.</p>
        </div>
      </div>

      <div role="tablist" aria-label="Lenses" className={`mt-5 grid gap-2 ${shown.length === 3 ? "grid-cols-3" : shown.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {shown.map((l) => {
          const Icon = l.icon;
          const on = active === l.id;
          return (
            <button
              key={l.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onLens(l.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center transition-all ${
                on ? "border-primary/50 bg-accent/50 text-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <Icon size={16} className={on ? "text-primary" : ""} aria-hidden />
              <span className="text-sm font-semibold">{l.label}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{l.description}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <AnimatePresence mode="wait" initial={false}>
          {active === "stress" && (
            <motion.div key="stress" {...swap}>
              <StressTest perspectives={perspectives} brief={brief} sources={sources} seat={seat} onSeat={onSeat} answer={answer} />
            </motion.div>
          )}
          {active === "expand" && (
            <motion.div key="expand" {...swap}>
              <Expand analysis={analysis} sources={sources} />
            </motion.div>
          )}
          {active === "distill" && (
            <motion.div key="distill" {...swap}>
              <Distill distillation={d} sources={sources} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ─── Stress test ───

function StressTest({
  perspectives,
  brief,
  sources,
  seat,
  onSeat,
  answer,
}: {
  perspectives: CriticResult[];
  brief: AccountBrief;
  sources: ResearchSource[];
  seat: string;
  onSeat: (seat: string) => void;
  answer?: Props["answer"];
}) {
  const seated = seatPeople(Array.isArray(brief.people) ? brief.people : []);
  const seats = SEATS.filter((s) => perspectives.some((p) => p.persona === s));
  const current = seats.includes(seat as (typeof SEATS)[number]) ? seat : seats[0];
  const critic = perspectives.find((p) => p.persona === current);
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {seats.map((s) => {
          const meta = criticFor("account", s);
          const style = SEAT_STYLE[s];
          const Icon = style.icon;
          const on = s === current;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onSeat(s)}
              aria-pressed={on}
              className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all ${
                on ? `${style.active} ring-1 ring-primary/20 ring-offset-1 ring-offset-background` : "border-border hover:border-primary/30"
              }`}
            >
              {seated[s] && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" title="Someone in this seat is named in the sources" />}
              <Icon size={18} className={style.color} aria-hidden />
              <span className="text-sm font-semibold leading-tight text-foreground">{meta?.name ?? s}</span>
              <span className="hidden text-xs leading-tight text-muted-foreground sm:block">{meta?.tagline}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {critic && (
          <motion.div key={critic.persona} {...swap} className="mt-4">
            <SeatTake critic={critic} person={seated[critic.persona]} sources={sources} />
            {answer?.(critic.persona, critic)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SeatTake({ critic, person, sources }: { critic: CriticResult; person?: Person; sources: ResearchSource[] }) {
  const [open, setOpen] = useState(false);
  const meta = criticFor("account", critic.persona);
  const style = SEAT_STYLE[critic.persona] ?? SEAT_STYLE.builder;
  const Icon = style.icon;
  const paragraphs = criticParagraphs(critic.perspective);
  const shown = open ? paragraphs : paragraphs.slice(0, 2);
  const questions = (critic.challenge_questions ?? []).filter((q) => q?.question);
  return (
    <article className="rounded-lg border border-border bg-surface-elevated p-4 sm:p-5">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon size={14} className={style.color} aria-hidden />
        <span className="text-foreground">{meta?.name}</span>
        <span className="font-normal normal-case tracking-normal">{meta?.tagline}</span>
      </p>
      {person && (
        <p className="mt-2 flex flex-wrap items-center gap-x-1 text-sm text-foreground/80">
          <Users size={13} className="text-primary" aria-hidden />
          In this seat today: <span className="font-semibold text-foreground">{person.name}</span>, {person.role}
          <Cited text={`[${person.source}]`} sources={sources} />
        </p>
      )}
      {critic.headline && <h4 className="mt-3 font-display text-xl font-bold leading-snug text-foreground">{stripMarks(critic.headline)}</h4>}
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-foreground/85">
        {shown.map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            <Cited text={p} sources={sources} />
          </p>
        ))}
      </div>
      {paragraphs.length > 2 && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
          {open ? "Show less" : "Read the full take"}
        </button>
      )}
      {questions.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            <MessageSquareQuote size={14} aria-hidden /> What they&rsquo;d ask you
          </p>
          <ol className="mt-2.5 space-y-2.5">
            {questions.map((q, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium leading-snug text-foreground">
                    <Cited text={q.question} sources={sources} />
                  </p>
                  {q.context && <p className="mt-0.5 text-sm text-muted-foreground">{q.context}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">Synthetic critic, written from the brief and its sources. Not a real quote.</p>
    </article>
  );
}

// ─── Expand ───

function Expand({ analysis, sources }: { analysis: AccountAnalysis | null; sources: ResearchSource[] }) {
  const core = analysis?.expansion?.core_insight;
  const plays = (analysis?.expansion?.expansions ?? []).filter((p) => p?.title || p?.pitch).slice(0, 3);
  return (
    <div>
      {core && (
        <div className="rounded-lg border border-primary/25 bg-accent/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Why this account</p>
          <p className="mt-1 text-[15px] leading-relaxed text-foreground">
            <Cited text={stripMarks(core)} sources={sources} />
          </p>
        </div>
      )}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {plays.map((p, i) => (
          <article key={i} className="flex flex-col rounded-lg border border-border bg-surface-elevated p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Way in {i + 1}</p>
              {p.potential && POTENTIAL_LABEL[p.potential] && (
                <span className="rounded-full border border-primary/30 bg-accent px-2 py-0.5 text-xs font-medium text-primary">{POTENTIAL_LABEL[p.potential]}</span>
              )}
            </div>
            {p.title && <h4 className="mt-1.5 font-display text-base font-bold leading-snug text-foreground">{stripMarks(p.title)}</h4>}
            {p.pitch && (
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                <Cited text={p.pitch} sources={sources} />
              </p>
            )}
            {p.how_its_different && (
              <p className="mt-auto pt-3 text-sm leading-relaxed text-muted-foreground">
                <Cited text={p.how_its_different} sources={sources} />
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

// ─── Distill ───

const DISTILL_ICON = { one_feature: Target, one_customer: Users, one_revenue: MessageSquareQuote } as const;

function Distill({ distillation, sources }: { distillation: Record<string, unknown> | null; sources: ResearchSource[] }) {
  const d = distillation ?? {};
  const text = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  const cards = (["one_feature", "one_customer", "one_revenue"] as const).map((k) => ({ k, label: distillLabel("account", k, k), value: text(k) })).filter((c) => c.value);
  const cut = asList(d.what_to_cut).slice(0, 5);
  return (
    <div className="space-y-4">
      {text("thesis_statement") && (
        <p className="rounded-lg border border-primary/25 bg-accent/50 p-4 font-display text-lg font-semibold leading-snug text-foreground">
          <Cited text={stripMarks(text("thesis_statement"))} sources={sources} />
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map(({ k, label, value }) => {
          const Icon = DISTILL_ICON[k];
          return (
            <div key={k} className="rounded-lg border border-border bg-surface-elevated p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                <Icon size={14} aria-hidden /> {label}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                <Cited text={stripMarks(value)} sources={sources} />
              </p>
            </div>
          );
        })}
      </div>
      {(text("mvp_scope") || cut.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {text("mvp_scope") && (
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Goal of the first call</p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                <Cited text={stripMarks(text("mvp_scope"))} sources={sources} />
              </p>
            </div>
          )}
          {cut.length > 0 && (
            <div className="rounded-lg border border-border p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Scissors size={13} aria-hidden /> Leave out of the first call
              </p>
              <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-foreground/85">
                {cut.map((c, i) => (
                  <li key={i}>
                    • <Cited text={stripMarks(c)} sources={sources} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
