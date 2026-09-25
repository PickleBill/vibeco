import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { LENSES, workbenchHref } from "@/lib/lenses";
import FadeIn from "../FadeIn";

const ExamplesSection = () => (
  <section id="examples" className="scroll-mt-20 py-20 lg:py-28">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        From questions to things you can try
      </p>
      <h2 className="mt-4 max-w-2xl font-display text-3xl sm:text-4xl font-bold text-foreground">
        Four kinds of question. The same honest process.
      </h2>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Pick a starting question and run it through the real agents. You&rsquo;ll review it first, answer a
        couple of follow-ups, and leave with a report you can share.
      </p>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {LENSES.map((l, i) => (
          <FadeIn key={l.id} delay={i * 0.05}>
            <Link
              to={workbenchHref(l.id, l.startingQuestion)}
              className="group flex h-full flex-col rounded-md border border-border bg-surface-elevated p-6 shadow-warm transition hover:border-primary/40 hover:shadow-warm-lg"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {String(i + 1).padStart(2, "0")} / {l.label}
              </p>
              <p className="mt-3 font-display text-lg font-semibold leading-snug text-foreground">
                &ldquo;{l.startingQuestion}&rdquo;
              </p>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{l.youGet}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Work it through
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </FadeIn>
        ))}
      </div>
    </div>
  </section>
);

export default ExamplesSection;
