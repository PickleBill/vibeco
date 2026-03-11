import FadeIn from "./FadeIn";

const services = [
  {
    title: "MVP Strategy",
    desc: "Scope the smallest version worth shipping. We identify the core wedge and strip everything else.",
  },
  {
    title: "Rapid Product Build",
    desc: "AI-assisted, design-forward execution. From concept to testable product in weeks, not quarters.",
  },
  {
    title: "Launch Infrastructure",
    desc: "Landing pages, onboarding flows, analytics, and SEO-ready foundations. Ship ready to learn.",
  },
  {
    title: "Growth Experimentation",
    desc: "Iterate based on signal, not guesswork. We build the feedback loops that drive real traction.",
  },
];

const Services = () => (
  <section id="services" className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <FadeIn>
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-4">
          What we do
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-16">
          Precision, not volume.
        </h2>
      </FadeIn>
      <div className="grid sm:grid-cols-2 gap-6">
        {services.map((s, i) => (
          <FadeIn key={s.title} delay={i * 0.08}>
            <div className="group bg-card border border-border rounded-lg p-8 hover:border-primary/30 hover:glow-accent-subtle transition-all duration-300">
              <h3 className="font-display text-lg font-bold text-foreground mb-3">
                {s.title}
              </h3>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                {s.desc}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  </section>
);

export default Services;
