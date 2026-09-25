import { ArrowDown } from "lucide-react";

// Each step names the agents that actually run behind it (supabase/functions).
const STEPS = [
  { title: "Frame", line: "Get the question right.", engine: "Brief + follow-up questions" },
  { title: "Explore", line: "See more than one angle.", engine: "Three alternative versions" },
  { title: "Challenge", line: "Find the weak assumptions.", engine: "Five synthetic critics, run in parallel" },
  { title: "Decide", line: "Make the tradeoffs clear.", engine: "Synthesis: consensus, tensions, confidence" },
  { title: "Put it to work", line: "Leave with a next move.", engine: "Build prompt, concept art, research prompts" },
];

const StepsStrip = () => (
  <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-muted/60">
    {/* Old anchor kept for inbound links (e.g. /#model) */}
    <span id="model" className="block scroll-mt-20" aria-hidden />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-14">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          How it works: a little structure, a lot more possibility
        </p>
        <a href="#use-cases" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline underline-offset-4">
          See use cases <ArrowDown size={13} aria-hidden />
        </a>
      </div>

      <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
        {STEPS.map((s, i) => (
          <li key={s.title} className="lg:border-l lg:border-border lg:px-5 first:lg:border-l-0 first:lg:pl-0">
            <p className="flex items-baseline gap-2">
              <span className="text-[11px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-sm font-semibold text-foreground">{s.title}</span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{s.line}</p>
            <p className="mt-2 font-mono text-[10.5px] leading-snug text-primary/80">{s.engine}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default StepsStrip;
