import FadeIn from "./FadeIn";

const FinalCta = () => (
  <section className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
      <FadeIn>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-foreground mb-6">
          Stop planning. Start shipping.
        </h2>
      </FadeIn>
      <FadeIn delay={0.1}>
        <p className="font-mono text-base text-foreground/80 mb-10 max-w-md mx-auto">
          Your idea could be live before dinner. Not a wireframe. Not a mockup. A
          real product your customers can use tonight.
        </p>
      </FadeIn>
      <FadeIn delay={0.15}>
        <a
          href="#contact"
          className="group relative font-mono text-sm bg-primary text-primary-foreground px-10 py-4 rounded-sm hover:opacity-90 transition-all duration-300 inline-block hover:glow-accent"
        >
          Pitch Your Idea →
        </a>
      </FadeIn>
    </div>
  </section>
);

export default FinalCta;
