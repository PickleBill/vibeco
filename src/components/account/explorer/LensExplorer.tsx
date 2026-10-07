import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, MessageSquareQuote, Minimize2, Scissors, Target, Users, Zap } from "lucide-react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { Memo, MoreFold, ReadMore } from "@/components/territory/Memo";
import { cx } from "@/components/territory/style";
import { FieldPill } from "@/components/territory/ui";
import { SEATS, criticFor, distillLabel } from "@/lib/lenses";
import { Cited, type AccountBrief } from "../AccountViews";
import { label } from "./look";
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

const COUNT = ["One", "Two", "Three", "Four", "Five"];

/** The line under the title while it's folded: "Five critic seats, Expand and Distill". */
function lensPreview(seats: number, expand: boolean, distill: boolean) {
  const parts = [seats > 0 && `${COUNT[seats - 1] ?? seats} critic seat${seats === 1 ? "" : "s"}`, expand && "Expand", distill && "Distill"].filter(
    (p): p is string => !!p,
  );
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
}

/**
 * "Explore one lens at a time" for an account: pick a seat to see that
 * critic's take and the questions they'd ask, or see the three ways in, or the
 * one thing that matters. Everything here comes from the saved run: no calls.
 * A fold: open from 1024px, a title and one line on phones.
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
  const seats = SEATS.filter((s) => perspectives.some((p) => p.persona === s)).length;

  return (
    <Memo
      level={3}
      defaultOpen="wide"
      eyebrow="Seven agents · one at a time"
      title={<span data-tour="lens-fold">Explore one lens at a time</span>}
      preview={lensPreview(seats, available.expand, available.distill)}
    >
      <p className="max-w-2xl text-[15px] leading-relaxed text-[#4A4F63]">
        Pressure-test the plan before the call: one seat, one angle, one answer at a time.
      </p>

      <div role="tablist" aria-label="Lenses" className={cx("mt-5 grid gap-2", shown.length === 3 ? "grid-cols-3" : shown.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
        {shown.map((l) => {
          const Icon = l.icon;
          const on = active === l.id;
          return (
            <button
              key={l.id}
              type="button"
              role="tab"
              data-tour={`lens-${l.id}`}
              aria-selected={on}
              onClick={() => onLens(l.id)}
              className={cx(
                "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[8px] px-2 py-2.5 text-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:text-left",
                on ? "border-2 border-primary bg-brand-tint" : "border border-[#9097A6] bg-card hover:border-foreground",
              )}
            >
              <Icon size={17} className="shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className={cx("block text-[15px] leading-tight", on ? "font-bold" : "font-semibold")}>{l.label}</span>
                <span className="hidden text-sm leading-snug text-[#4A4F63] sm:block">{l.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
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
    </Memo>
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
      <div className="flex flex-wrap gap-2 sm:grid sm:grid-cols-5">
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
              data-tour={`seat-${s}`}
              aria-pressed={on}
              className={cx(
                "relative flex min-h-11 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-col sm:justify-start sm:gap-1.5 sm:rounded-xl sm:px-2 sm:py-3 sm:text-center",
                on ? style.active : "border border-border bg-card hover:border-foreground",
              )}
            >
              {seated[s] && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-foreground" title="Someone in this seat is named in the sources" aria-hidden />
              )}
              <span
                className={cx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-card sm:h-10 sm:w-10",
                  on && "shadow-[0_0_0_2px_#fff,0_0_0_5px_hsl(var(--brand))]",
                )}
                aria-hidden
              >
                <Icon size={16} className={style.color} />
              </span>
              <span className={cx("text-[15px] leading-tight text-foreground", on ? "font-bold" : "font-semibold")}>{meta?.name ?? s}</span>
              <span className="hidden text-[13px] leading-snug text-[#4A4F63] sm:block">{meta?.tagline}</span>
              {seated[s] && <span className="sr-only">, named in the sources</span>}
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {critic && (
          <motion.div key={critic.persona} {...swap} className="mt-6">
            <SeatTake critic={critic} person={seated[critic.persona]} sources={sources} />
            {answer?.(critic.persona, critic)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SeatTake({ critic, person, sources }: { critic: CriticResult; person?: Person; sources: ResearchSource[] }) {
  const meta = criticFor("account", critic.persona);
  const style = SEAT_STYLE[critic.persona] ?? SEAT_STYLE.builder;
  const Icon = style.icon;
  const paragraphs = criticParagraphs(critic.perspective);
  // The first paragraph shows; the rest of the take folds under it.
  const para = (p: string, i: number) => (
    <p key={i} className="whitespace-pre-line">
      <Cited text={p} sources={sources} />
    </p>
  );
  const questions = (critic.challenge_questions ?? []).filter((q) => q?.question);
  return (
    <article>
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px]">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-foreground" aria-hidden>
          <Icon size={15} className={style.color} />
        </span>
        <span className="font-bold text-foreground">{meta?.name}</span>
        <span className="text-[#4A4F63]">{meta?.tagline}</span>
        <span className="font-mono text-xs text-muted-foreground">synthetic</span>
      </p>
      {person && (
        <p className="mt-2 flex flex-wrap items-center gap-x-1 text-[15px] text-[#4A4F63]">
          <Users size={14} aria-hidden />
          In this seat today: <span className="font-semibold text-foreground">{person.name}</span>, {person.role}
          <Cited text={`[${person.source}]`} sources={sources} />
        </p>
      )}
      {critic.headline && (
        <h4 className="mt-3 max-w-4xl font-display text-[22px] font-semibold leading-snug tracking-[-0.01em] text-foreground sm:text-2xl">
          {stripMarks(critic.headline)}
        </h4>
      )}
      <div className="mt-3 max-w-4xl text-base leading-relaxed text-foreground">
        {paragraphs.slice(0, 1).map(para)}
        {paragraphs.length > 1 && (
          <MoreFold more="Read the full take">
            <div className="space-y-3 pt-3">{paragraphs.slice(1).map((p, i) => para(p, i + 1))}</div>
          </MoreFold>
        )}
      </div>
      {questions.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className={cx(label, "flex items-center gap-1.5")}>
            <MessageSquareQuote size={14} aria-hidden /> What they&rsquo;d ask you
          </p>
          <ol className="mt-3 space-y-3">
            {questions.map((q, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-foreground font-mono text-[13px] font-semibold text-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-snug text-foreground">
                    <Cited text={q.question} sources={sources} />
                  </p>
                  {q.context && <p className="mt-0.5 text-[15px] leading-relaxed text-[#4A4F63]">{q.context}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="mt-4 text-sm text-muted-foreground">Synthetic critic, written from the brief and its sources. Not a real quote.</p>
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
        <div className="max-w-4xl border-l-4 border-foreground pl-4">
          <p className={label}>Why this account</p>
          <p className="mt-1 text-[17px] leading-relaxed text-foreground">
            <Cited text={stripMarks(core)} sources={sources} />
          </p>
        </div>
      )}
      <div className="mt-6 grid gap-x-8 gap-y-6 md:grid-cols-3">
        {plays.map((p, i) => (
          <article key={i} className="flex flex-col border-t-2 border-foreground pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={label}>Way in {i + 1}</p>
              {p.potential && POTENTIAL_LABEL[p.potential] && <FieldPill>{POTENTIAL_LABEL[p.potential]}</FieldPill>}
            </div>
            {p.title && <h4 className="mt-2 font-display text-lg font-semibold leading-snug text-foreground">{stripMarks(p.title)}</h4>}
            {/* The pitch's first lines show; the rest and how it's different open on a tap. */}
            {p.pitch ? (
              <div className="mt-1.5">
                <ReadMore
                  className="text-[15px] leading-relaxed text-foreground"
                  more={
                    p.how_its_different && (
                      <p className="pt-3 text-[15px] leading-relaxed text-[#4A4F63]">
                        <Cited text={p.how_its_different} sources={sources} />
                      </p>
                    )
                  }
                >
                  <Cited text={p.pitch} sources={sources} />
                </ReadMore>
              </div>
            ) : (
              p.how_its_different && (
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#4A4F63]">
                  <Cited text={p.how_its_different} sources={sources} />
                </p>
              )
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
  const cards = (["one_feature", "one_customer", "one_revenue"] as const).map((k) => ({ k, name: distillLabel("account", k, k), value: text(k) })).filter((c) => c.value);
  const cut = asList(d.what_to_cut).slice(0, 5);
  const thesis = text("thesis_statement");
  const breakdown = (
    <div className="space-y-6">
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-3">
        {cards.map(({ k, name, value }) => {
          const Icon = DISTILL_ICON[k];
          return (
            <div key={k} className="border-t-2 border-foreground pt-3">
              <p className={cx(label, "flex items-center gap-1.5")}>
                <Icon size={14} aria-hidden /> {name}
              </p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-foreground">
                <Cited text={stripMarks(value)} sources={sources} />
              </p>
            </div>
          );
        })}
      </div>
      {(text("mvp_scope") || cut.length > 0) && (
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
          {text("mvp_scope") && (
            <div className="border-t border-border pt-3">
              <p className={label}>Goal of the first call</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-foreground">
                <Cited text={stripMarks(text("mvp_scope"))} sources={sources} />
              </p>
            </div>
          )}
          {cut.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className={cx(label, "flex items-center gap-1.5")}>
                <Scissors size={13} aria-hidden /> Leave out of the first call
              </p>
              <ul className="mt-1.5 space-y-1.5 text-[15px] leading-relaxed text-foreground">
                {cut.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-muted-foreground" aria-hidden>
                      –
                    </span>
                    <span>
                      <Cited text={stripMarks(c)} sources={sources} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
  // The thesis shows; the call plan behind it folds under it.
  if (!thesis) return breakdown;
  return (
    <div>
      <p className="max-w-4xl rounded-xl border border-border bg-background p-4 font-display text-lg font-semibold leading-snug text-foreground sm:p-5 sm:text-xl">
        <Cited text={stripMarks(thesis)} sources={sources} />
      </p>
      {(cards.length > 0 || text("mvp_scope") || cut.length > 0) && (
        <MoreFold more="The reason, the person, the question" buttonClassName="mt-2">
          <div className="pt-4">{breakdown}</div>
        </MoreFold>
      )}
    </div>
  );
}
