import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CornerDownRight } from "lucide-react";
import { LENSES, questionHref, type LensConfig } from "@/lib/lenses";

interface Props {
  lens: LensConfig;
}

/**
 * Hand-written illustration of one question worked through. Clearly labelled
 * as illustrative; the link runs the same question through the real agents.
 */
const WorkedExample = ({ lens }: Props) => {
  const [active, setActive] = useState(0);
  const index = LENSES.findIndex((l) => l.id === lens.id) + 1;
  const perspective = lens.example.perspectives[active] ?? lens.example.perspectives[0];

  useEffect(() => setActive(0), [lens.id]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-[11px] font-medium tracking-wide text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          A question, worked through
        </span>
        <span className="uppercase tracking-[0.14em]">
          {String(index).padStart(2, "0")} / {lens.tag}
        </span>
      </div>

      <div className="relative rounded-md border border-border bg-surface-elevated shadow-warm-lg">
        <span className="absolute -top-3 right-4 rotate-[2deg] bg-[hsl(52_96%_78%)] px-3 py-1 text-[10px] font-medium text-foreground shadow-sm">
          Illustrative example · no AI run
        </span>

        <div className="p-6 sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            The starting question
          </p>
          <p className="mt-3 font-display text-xl sm:text-2xl font-semibold leading-snug text-foreground">
            &ldquo;{lens.startingQuestion}&rdquo;
          </p>

          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <CornerDownRight size={14} aria-hidden />
            Try a different perspective
          </p>

          <div role="tablist" aria-label="Perspectives" className="mt-3 grid grid-cols-3 border-b border-border">
            {lens.example.perspectives.map((p, i) => (
              <button
                key={p.label}
                role="tab"
                aria-selected={active === i}
                onClick={() => setActive(i)}
                className={`-mb-px border-b-2 px-2 py-2.5 text-xs sm:text-sm transition-colors ${
                  active === i
                    ? "border-primary font-semibold text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="min-h-[128px] pt-4">
            <p className="text-sm leading-relaxed text-foreground">{perspective.quote}</p>
            <p className="mt-3 text-xs text-muted-foreground">{perspective.note}</p>
          </div>

          <p className="text-[11px] text-muted-foreground">Synthetic perspectives, not customer interviews.</p>
        </div>

        <div className="mx-3 mb-3 flex gap-3 rounded-md bg-accent p-5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary">
            <Check size={13} aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">A useful next move</p>
            <p className="mt-1 font-display text-base font-semibold text-foreground">{lens.example.nextMove.title}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{lens.example.nextMove.body}</p>
          </div>
        </div>

        <div className="px-6 pb-5 sm:px-7">
          <Link
            to={questionHref(lens.id, lens.startingQuestion)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4"
          >
            Run this question for real
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>

      <p className="mt-3 text-right text-[11px] text-muted-foreground">The output is a starting point for judgment.</p>
    </div>
  );
};

export default WorkedExample;
