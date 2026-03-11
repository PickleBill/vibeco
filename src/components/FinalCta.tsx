import FadeIn from "./FadeIn";

const FinalCta = () => (
  <section className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
      <FadeIn>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-foreground mb-6">
          Build the right thing. Faster.
        </h2>
      </FadeIn>
      <FadeIn delay={0.1}>
        <p className="font-mono text-sm text-muted-foreground mb-10 max-w-md mx-auto">
          Not every idea deserves a company. But the right idea deserves a real
          test.
        </p>
      </FadeIn>
      <FadeIn delay={0.15}>
        <a
          href="#contact"
          className="font-mono text-sm bg-primary text-primary-foreground px-8 py-3 rounded-sm hover:opacity-90 transition-opacity inline-block"
        >
          Pitch Your Idea
        </a>
      </FadeIn>
    </div>
  </section>
);

export default FinalCta;
