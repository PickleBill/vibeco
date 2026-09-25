import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { LENSES, questionHref } from "@/lib/lenses";
import FadeIn from "../FadeIn";

const UseCases = () => (
  <section id="use-cases" className="scroll-mt-20 py-20 lg:py-28">
    {/* Old anchor kept for inbound links */}
    <span id="examples" className="block scroll-mt-20" aria-hidden />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Use cases</p>
      <h2 className="mt-4 max-w-2xl font-display text-3xl sm:text-4xl font-bold text-foreground">
        Four kinds of question. The same honest process.
      </h2>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Pick the one that sounds like your week. Each starts with a real question you can run right now: you&rsquo;ll
        review it first, answer a couple of follow-ups, and leave with a report you can share.
      </p>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {LENSES.map((l, i) => (
          <FadeIn key={l.id} delay={i * 0.05}>
            <article className="flex h-full flex-col rounded-md border border-border bg-surface-elevated p-6 sm:p-7 shadow-warm">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                <span className="text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                {l.label}
              </p>
              <h3 className="mt-3 font-display text-xl font-semibold leading-snug text-foreground">{l.useCase.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{l.useCase.body}</p>

              <div className="mt-5 flex-1 border-t border-border pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Try this</p>
                <p className="mt-1.5 font-display text-base font-medium leading-snug text-foreground">
                  &ldquo;{l.startingQuestion}&rdquo;
                </p>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">You get</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{l.youGet}</p>
              </div>

              <Link
                to={questionHref(l.id, l.startingQuestion)}
                className="group mt-6 inline-flex items-center gap-2 self-start rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                Work it through
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </article>
          </FadeIn>
        ))}
      </div>
    </div>
  </section>
);

export default UseCases;
