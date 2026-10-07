import { useId, useState } from "react";
import { motion } from "framer-motion";
import { Check, ListOrdered, Split } from "lucide-react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { Fold, FoldButton, ReadMore } from "@/components/territory/Memo";
import { cx } from "@/components/territory/style";
import { Eyebrow } from "@/components/territory/ui";
import { Cited } from "../AccountViews";
import { label } from "./look";
import { relabelSeats, type Synthesis } from "./model";
import type { VerdictState } from "./useAgentBoard";

/**
 * "**The funding trigger:** All agents agree…" -> a bold lead, then the rest.
 * With `first`, text without a marked lead bolds its first sentence instead.
 */
function Lead({ text, sources, first }: { text: string; sources: ResearchSource[]; first?: boolean }) {
  const m = /^\s*(?:\*\*|__)(.+?)(?:\*\*|__)\s*(.*)$/s.exec(text);
  const strip = (t: string) => t.replace(/(\*\*|__)(.+?)\1/g, "$2");
  if (!m) {
    const s = first ? /^(.+?[.!?])(\s+.*)?$/s.exec(strip(text)) : null;
    if (!s) return <Cited text={strip(text)} sources={sources} />;
    return (
      <>
        <span className="font-semibold text-foreground">
          <Cited text={s[1]} sources={sources} />
        </span>
        {s[2] && <Cited text={s[2]} sources={sources} />}
      </>
    );
  }
  return (
    <>
      <span className="font-semibold text-foreground">{strip(m[1]).replace(/:$/, "")}.</span> <Cited text={strip(m[2])} sources={sources} />
    </>
  );
}

function confidence(score: number) {
  if (score >= 80) return "Strong consensus";
  if (score >= 50) return "Mixed signals";
  return "High tension";
}

/**
 * The synthesis of all seven agents, built to scan in five seconds: how much
 * they agree, the one-paragraph answer, where they agree and don't, and the
 * next moves. Seat names replace the idea-flow persona names older runs carry
 * ("The Skeptic" -> "The CFO").
 */
export function VerdictCard({ synthesis, state, sources }: { synthesis?: Synthesis | null; state: VerdictState; sources: ResearchSource[] }) {
  // Shut, it reads in a glance: the answer's first lines and the top item of
  // each list. One button opens the rest.
  const [full, setFull] = useState(false);
  const id = `verdict-${useId().replace(/:/g, "")}`;
  if (state === "waiting") return null;
  if (state === "writing") {
    return (
      <section aria-label="Verdict" className="rounded-xl border-2 border-foreground bg-card p-5 sm:p-6">
        <p className="flex items-center gap-2 font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-brand motion-safe:animate-pulse" aria-hidden />
          Verdict
        </p>
        <p className="mt-2 text-[15px] text-[#4A4F63]">Reading all seven takes and writing where they agree and where they don&rsquo;t…</p>
        <div className="mt-4 space-y-2.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-3.5 rounded bg-muted" style={{ width: `${92 - i * 16}%` }} />
          ))}
        </div>
      </section>
    );
  }
  if (state === "failed" || !synthesis?.executive_summary) {
    return (
      <p className="rounded-xl border border-dotted border-[#9097A6] px-4 py-3 text-[15px] text-[#4A4F63]">
        The verdict didn&rsquo;t finish this time. Each agent&rsquo;s take is below.
      </p>
    );
  }
  const score = typeof synthesis.confidence_score === "number" ? Math.max(0, Math.min(100, synthesis.confidence_score)) : undefined;
  const consensus = (synthesis.consensus ?? []).filter(Boolean).slice(0, 4);
  const tensions = (synthesis.tensions ?? []).map((t) => t?.topic).filter((t): t is string => !!t).slice(0, 4);
  const moves = (synthesis.ranked_recommendations ?? []).filter((r) => r?.action).slice(0, 3);
  const more = Math.max(0, consensus.length - 1) + Math.max(0, tensions.length - 1) + Math.max(0, moves.length - 1);
  // The top items clamp while the rest is folded, and open in full with it.
  const top = !full && more > 0 ? "line-clamp-3" : undefined;
  const folds = [consensus.length > 1 && `${id}-agree`, tensions.length > 1 && `${id}-split`, moves.length > 1 && `${id}-moves`].filter(Boolean).join(" ");
  const agree = (c: string, i: number) => (
    <li key={i} className="py-3 text-[15px] leading-relaxed text-foreground">
      <div className={i === 0 ? top : undefined}>
        <Lead text={relabelSeats(c)} sources={sources} />
      </div>
    </li>
  );
  const split = (t: string, i: number) => (
    <li key={i} className="py-3 text-[15px] leading-relaxed text-foreground">
      <Lead text={relabelSeats(t)} sources={sources} />
    </li>
  );
  const move = (r: (typeof moves)[number], i: number) => (
    <li key={i} className="flex gap-3 text-[15px]">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-foreground font-mono text-[13px] font-semibold text-white">{i + 1}</span>
      <span className={cx("leading-relaxed text-foreground", i === 0 && top)}>
        <span className="font-semibold">
          <Lead text={relabelSeats(r.action)} sources={sources} />
        </span>
        {r.rationale ? (
          <span className="text-[#4A4F63]">
            {" "}
            &mdash; <Lead text={relabelSeats(r.rationale)} sources={sources} />
          </span>
        ) : null}
      </span>
    </li>
  );
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-labelledby="verdict-title"
      className="overflow-hidden rounded-xl border border-foreground bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-foreground px-4 py-3.5 text-white sm:px-6">
        <div className="flex items-baseline gap-3">
          <h3 id="verdict-title" className="font-display text-xl font-semibold tracking-[-0.01em]">
            Verdict
          </h3>
          <span className="font-mono text-xs text-white/75">seven agents · synthetic</span>
        </div>
        {score !== undefined && (
          <div className="flex items-center gap-3" title="How much the seven agents agree, not a deal score">
            <span className="font-mono text-2xl font-semibold leading-none">{score}%</span>
            <span className="text-[15px] font-semibold">{confidence(score)}</span>
            <span
              role="meter"
              aria-label="How much the seven agents agree"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={score}
              className="hidden h-2 w-24 overflow-hidden rounded-full bg-white/20 sm:block"
            >
              <span className="block h-full rounded-full bg-white" style={{ width: `${score}%` }} />
            </span>
          </div>
        )}
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <ReadMore lines={3} className="max-w-4xl text-[17px] leading-relaxed text-foreground">
          <Lead text={relabelSeats(synthesis.executive_summary)} sources={sources} first />
        </ReadMore>

        {(consensus.length > 0 || tensions.length > 0) && (
          <div className={cx("mt-5 grid gap-x-10 gap-y-6", consensus.length > 0 && tensions.length > 0 && "md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]")}>
            {consensus.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 border-b-2 border-foreground pb-2 text-[15px] font-bold text-foreground">
                  <Check size={16} aria-hidden /> Where they agree
                </h4>
                <ul className="divide-y divide-border">{consensus.slice(0, 1).map(agree)}</ul>
                <Fold open={full} id={`${id}-agree`}>
                  <ul className="divide-y divide-border border-t border-border">{consensus.slice(1).map((c, i) => agree(c, i + 1))}</ul>
                </Fold>
              </div>
            )}
            {tensions.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 border-b-2 border-dashed border-foreground pb-2 text-[15px] font-bold text-foreground">
                  <Split size={16} aria-hidden /> Where they don&rsquo;t
                </h4>
                <ul className="divide-y divide-border">{tensions.slice(0, 1).map(split)}</ul>
                <Fold open={full} id={`${id}-split`}>
                  <ul className="divide-y divide-border border-t border-border">{tensions.slice(1).map((t, i) => split(t, i + 1))}</ul>
                </Fold>
              </div>
            )}
          </div>
        )}

        {moves.length > 0 && (
          <div className="mt-5 rounded-xl border border-border bg-background p-4 sm:p-5">
            <p className={cx(label, "flex items-center gap-1.5")}>
              <ListOrdered size={14} aria-hidden /> Next moves
            </p>
            <ol className="mt-3 space-y-3">{moves.slice(0, 1).map(move)}</ol>
            <Fold open={full} id={`${id}-moves`}>
              <ol className="space-y-3 pt-3">{moves.slice(1).map((r, i) => move(r, i + 1))}</ol>
            </Fold>
          </div>
        )}

        {more > 0 && (
          <FoldButton open={full} controls={folds} onClick={() => setFull((v) => !v)} className="mt-3">
            {full ? "Show less" : `Show the full verdict · ${more} more`}
          </FoldButton>
        )}
      </div>
    </motion.section>
  );
}
