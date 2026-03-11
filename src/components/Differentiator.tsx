import FadeIn from "./FadeIn";

const diffs = [
  {
    title: "Faster than a traditional agency",
    desc: "No bloated timelines or committee decisions. We ship MVPs in weeks.",
  },
  {
    title: "More thoughtful than a no-code freelancer",
    desc: "Real architecture, real design, real product thinking — not drag-and-drop guesswork.",
  },
  {
    title: "More aligned than a fixed-fee shop",
    desc: "We structure for shared outcomes. When you win, we win.",
  },
  {
    title: "More commercially grounded than AI demo builders",
    desc: "We build for markets, not for demos. Every feature earns its place.",
  },
];

const Differentiator = () => (
  <section className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <FadeIn>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-16">
          Why this is different.
        </h2>
      </FadeIn>
      <div className="grid sm:grid-cols-2 gap-x-12 gap-y-10">
        {diffs.map((d, i) => (
          <FadeIn key={d.title} delay={i * 0.08}>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                {d.title}
              </h3>
              <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                {d.desc}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  </section>
);

export default Differentiator;
