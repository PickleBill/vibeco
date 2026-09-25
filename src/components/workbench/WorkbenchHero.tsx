import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { LENSES, getLens, workbenchHref, type Lens } from "@/lib/lenses";
import WorkedExample from "./WorkedExample";

const WorkbenchHero = () => {
  const navigate = useNavigate();
  const [lens, setLens] = useState<Lens>("idea");
  const [question, setQuestion] = useState("");
  const config = getLens(lens);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(workbenchHref(lens, question));
  };

  return (
    <section className="pt-28 pb-20 lg:pt-36 lg:pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 items-start">
        <div className="lg:pt-10">
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <span className="h-px w-6 bg-primary" aria-hidden />
            Bill Bricker&rsquo;s working AI lab
          </p>

          <h1 className="mt-6 font-display text-[2.6rem] leading-[1.02] sm:text-6xl font-bold tracking-[-0.045em] text-foreground">
            Turn a messy question into a <span className="text-primary">clear next move.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base sm:text-lg text-muted-foreground">
            Explore an idea, research a company, pressure-test an initiative, or work through a decision.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 max-w-xl">
            <p id="lens-label" className="text-sm font-semibold text-foreground">
              What are you working through?
            </p>
            <div role="radiogroup" aria-labelledby="lens-label" className="mt-3 flex flex-wrap gap-2">
              {LENSES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={lens === l.id}
                  onClick={() => setLens(l.id)}
                  className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
                    lens === l.id
                      ? "border-primary/40 bg-accent text-primary"
                      : "border-border bg-surface-elevated text-foreground hover:border-primary/30"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-md border border-border bg-surface-elevated shadow-warm focus-within:border-primary/50">
              <label htmlFor="workbench-question" className="sr-only">
                Your question
              </label>
              <textarea
                id="workbench-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={config.placeholder}
                rows={4}
                className="block w-full resize-y rounded-t-md bg-transparent px-4 pt-4 pb-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <div className="flex flex-col-reverse gap-3 px-4 pb-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setQuestion(config.startingQuestion)}
                  className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Try a starting question
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  Let&rsquo;s work it through
                  <ArrowRight size={15} aria-hidden />
                </button>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              You can review your question before anything runs. Or{" "}
              <a href="#examples" className="underline underline-offset-4 hover:text-foreground">
                explore the examples
              </a>
              .
            </p>
          </form>
        </div>

        <WorkedExample lens={config} />
      </div>
    </section>
  );
};

export default WorkbenchHero;
