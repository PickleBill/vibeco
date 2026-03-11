import FadeIn from "./FadeIn";

const traits = [
  "Founder-minded — we think in terms of leverage, distribution, and unit economics.",
  "Product and market aware — design and growth are not afterthoughts.",
  "Visually opinionated — craft matters. We ship things worth looking at.",
  "Biased toward shipping — ideas are cheap. Testable products are not.",
  "Willing to structure around upside — on the right opportunities, we put skin in the game.",
];

const Credibility = () => (
  <section className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <div className="max-w-3xl">
        <FadeIn>
          <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-4">
            Operating style
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-8">
            Builder, not vendor.
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="font-mono text-sm text-foreground/70 leading-relaxed mb-10">
            VibeCo is led by a founder-operator who has built, shipped, and iterated
            across multiple product domains. This isn't a services play — it's a
            thinking partnership for people building things that matter.
          </p>
        </FadeIn>
        <ul className="space-y-4">
          {traits.map((t, i) => (
            <FadeIn key={i} delay={0.15 + i * 0.05}>
              <li className="flex items-start gap-3">
                <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                <span className="font-mono text-xs text-foreground/60 leading-relaxed">
                  {t}
                </span>
              </li>
            </FadeIn>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

export default Credibility;
