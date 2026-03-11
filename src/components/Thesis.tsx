import FadeIn from "./FadeIn";

const Thesis = () => (
  <section id="thesis" className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <div className="max-w-3xl mx-auto">
        <FadeIn>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-foreground leading-tight mb-8">
            The only bottleneck is the speed of your ideas.
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="font-mono text-base text-foreground/80 leading-relaxed max-w-2xl">
            What used to take months and hundreds of thousands of dollars now
            happens in hours. We work shoulder-to-shoulder with you to rapidly
            build, test, and refine — until the product is live, real, and
            generating signal. The iteration cycle is so fast, the only limit is
            how quickly you can think.
          </p>
        </FadeIn>
      </div>
    </div>
  </section>
);

export default Thesis;
