import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Gauge, ListOrdered } from "lucide-react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { Cited } from "../AccountViews";
import { relabelSeats, type Synthesis } from "./model";
import type { VerdictState } from "./useAgentBoard";

/** "**The funding trigger:** All agents agree…" -> a bold lead, then the rest. */
function Lead({ text, sources }: { text: string; sources: ResearchSource[] }) {
  const m = /^\s*(?:\*\*|__)(.+?)(?:\*\*|__)\s*(.*)$/s.exec(text);
  const strip = (t: string) => t.replace(/(\*\*|__)(.+?)\1/g, "$2");
  if (!m) return <Cited text={strip(text)} sources={sources} />;
  return (
    <>
      <span className="font-semibold text-foreground">{strip(m[1]).replace(/:$/, "")}.</span> <Cited text={strip(m[2])} sources={sources} />
    </>
  );
}

function confidence(score: number) {
  if (score >= 80) return { label: "Strong consensus", cls: "text-emerald-700", bar: "bg-emerald-600" };
  if (score >= 50) return { label: "Mixed signals", cls: "text-amber-700", bar: "bg-amber-500" };
  return { label: "High tension", cls: "text-rose-700", bar: "bg-rose-600" };
}

/**
 * The synthesis of all seven agents: how much they agree, the summary, where
 * they agree and disagree, and the next moves. Seat names replace the
 * idea-flow persona names older runs carry ("The Skeptic" -> "The CFO").
 */
export function VerdictCard({ synthesis, state, sources }: { synthesis?: Synthesis | null; state: VerdictState; sources: ResearchSource[] }) {
  if (state === "waiting") return null;
  if (state === "writing") {
    return (
      <section aria-label="Verdict" className="rounded-xl border border-emerald-600/25 bg-emerald-50/40 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">Verdict</p>
        <p className="mt-2 text-sm text-muted-foreground">Reading all seven takes and writing where they agree and where they don&rsquo;t…</p>
        <div className="mt-4 space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-emerald-600/10" style={{ width: `${92 - i * 14}%` }} />
          ))}
        </div>
      </section>
    );
  }
  if (state === "failed" || !synthesis?.executive_summary) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        The verdict didn&rsquo;t finish this time. Each agent&rsquo;s take is below.
      </p>
    );
  }
  const score = typeof synthesis.confidence_score === "number" ? Math.max(0, Math.min(100, synthesis.confidence_score)) : undefined;
  const conf = score !== undefined ? confidence(score) : undefined;
  const consensus = (synthesis.consensus ?? []).filter(Boolean).slice(0, 4);
  const tensions = (synthesis.tensions ?? []).map((t) => t?.topic).filter((t): t is string => !!t).slice(0, 4);
  const moves = (synthesis.ranked_recommendations ?? []).filter((r) => r?.action).slice(0, 3);
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      aria-labelledby="verdict-title"
      className="rounded-xl border border-emerald-600/25 bg-emerald-50/40 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="verdict-title" className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
          Verdict
        </p>
        {conf && score !== undefined && (
          <div className="flex items-center gap-2 text-sm" title="How much the seven agents agree, not a deal score">
            <Gauge size={15} className={conf.cls} aria-hidden />
            <span className={`font-bold tabular-nums ${conf.cls}`}>{score}%</span>
            <span className="text-muted-foreground">{conf.label}</span>
            <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:block" aria-hidden>
              <span className={`block h-full ${conf.bar}`} style={{ width: `${score}%` }} />
            </span>
          </div>
        )}
      </div>
      <p className="mt-3 text-base leading-relaxed text-foreground">
        <Lead text={relabelSeats(synthesis.executive_summary)} sources={sources} />
      </p>
      {(consensus.length > 0 || tensions.length > 0) && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {consensus.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800">
                <CheckCircle2 size={14} aria-hidden /> Where they agree
              </h4>
              <ul className="mt-2 space-y-2">
                {consensus.map((c, i) => (
                  <li key={i} className="text-sm leading-relaxed text-foreground/85">
                    <Lead text={relabelSeats(c)} sources={sources} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tensions.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800">
                <AlertTriangle size={14} aria-hidden /> Where they don&rsquo;t
              </h4>
              <ul className="mt-2 space-y-2">
                {tensions.map((t, i) => (
                  <li key={i} className="text-sm leading-relaxed text-foreground/85">
                    <Lead text={relabelSeats(t)} sources={sources} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {moves.length > 0 && (
        <div className="mt-5 border-t border-emerald-600/15 pt-4">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-foreground/80">
            <ListOrdered size={14} className="text-emerald-700" aria-hidden /> Next moves
          </h4>
          <ol className="mt-2 space-y-2">
            {moves.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600/15 text-xs font-bold text-emerald-800">{i + 1}</span>
                <span className="leading-relaxed text-foreground/85">
                  <span className="font-semibold">
                    <Lead text={relabelSeats(r.action)} sources={sources} />
                  </span>
                  {r.rationale ? (
                    <span className="text-muted-foreground">
                      {" "}
                      &mdash; <Lead text={relabelSeats(r.rationale)} sources={sources} />
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </motion.section>
  );
}
