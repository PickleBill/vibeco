import FadeIn from "./FadeIn";

const Thesis = () => (
  <section id="thesis" className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <div className="max-w-3xl mx-auto">
        <FadeIn>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-foreground leading-tight mb-8">
            Code is cheap. Wrong direction is expensive.
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="font-mono text-sm text-foreground/70 leading-relaxed max-w-2xl">
            The modern bottleneck is no longer whether software can be built. It's
            whether the right thing gets tested, shipped, and learned from before
            time and capital disappear. We help founders compress that cycle.
          </p>
        </FadeIn>
      </div>
    </div>
  </section>
);

export default Thesis;
