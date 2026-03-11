import FadeIn from "./FadeIn";

const Thesis = () => (
  <section id="thesis" className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <div className="max-w-3xl mx-auto">
        <FadeIn>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-foreground leading-tight mb-8">
            The speed will blow your mind.
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="font-mono text-base text-foreground/80 leading-relaxed max-w-2xl">
            Months of dev cycles? Gone. Six-figure budgets? Irrelevant. You talk,
            we build, you iterate. The loop is so tight it feels like magic — but
            it's just what happens when you stop overthinking and start shipping.
          </p>
        </FadeIn>
      </div>
    </div>
  </section>
);

export default Thesis;
