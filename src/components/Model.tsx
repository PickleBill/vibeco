import FadeIn from "./FadeIn";

const steps = [
  {
    num: "01",
    title: "Founder Signal",
    desc: "We evaluate the founder, market insight, and wedge. Conviction and domain depth matter more than a polished deck.",
  },
  {
    num: "02",
    title: "Rapid Execution",
    desc: "We design and build the MVP fast. Every decision is optimized for learning speed and market signal.",
  },
  {
    num: "03",
    title: "Shared Upside",
    desc: "For the right projects, we structure around revenue share, advisory equity, or hybrid economics.",
  },
];

const Model = () => (
  <section id="model" className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <FadeIn>
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-4">
          How the model works
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-6">
          Built for alignment.
        </h2>
        <p className="font-mono text-sm text-muted-foreground mb-16 max-w-xl">
          This model is selective and intended for founders with real domain
          conviction and a credible path to distribution.
        </p>
      </FadeIn>
      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((s, i) => (
          <FadeIn key={s.num} delay={i * 0.1}>
            <div className="relative">
              <span className="font-display text-6xl font-black text-primary/10 absolute -top-4 -left-2">
                {s.num}
              </span>
              <div className="pt-10">
                <h3 className="font-display text-lg font-bold text-foreground mb-3">
                  {s.title}
                </h3>
                <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  </section>
);

export default Model;
