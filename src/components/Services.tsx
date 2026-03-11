import { useState } from "react";
import FadeIn from "./FadeIn";

const services = [
  {
    title: "MVP Strategy",
    desc: "Scope the smallest version worth shipping. We identify the core wedge and strip everything else.",
    detail: "Market sizing, competitive positioning, feature prioritization, and go-to-market planning.",
  },
  {
    title: "Rapid Product Build",
    desc: "AI-assisted, design-forward execution. From concept to testable product in weeks, not quarters.",
    detail: "Full-stack development, responsive design, database architecture, and deployment infrastructure.",
  },
  {
    title: "Launch Infrastructure",
    desc: "Landing pages, onboarding flows, analytics, and SEO-ready foundations. Ship ready to learn.",
    detail: "SEO, analytics integration, email capture, A/B testing setup, and conversion optimization.",
  },
  {
    title: "Growth Experimentation",
    desc: "Iterate based on signal, not guesswork. We build the feedback loops that drive real traction.",
    detail: "User interviews, funnel analysis, feature iteration, and data-driven pivot recommendations.",
  },
];

const Services = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="services" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-4">
            What we do
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-16">
            Precision, not volume.
          </h2>
        </FadeIn>
        <div className="grid sm:grid-cols-2 gap-6">
          {services.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.08}>
              <div
                className={`group relative bg-card border rounded-lg p-8 transition-all duration-500 overflow-hidden ${
                  hoveredIndex === i
                    ? "border-primary/50 glow-accent-subtle scale-[1.01]"
                    : "border-border hover:border-primary/30"
                }`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Glow orb */}
                <div
                  className={`absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none ${
                    hoveredIndex === i ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    background: "radial-gradient(circle, hsl(243 76% 58% / 0.2), transparent)",
                  }}
                />

                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {s.title}
                </h3>
                <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>

                {/* Hover detail reveal */}
                <div
                  className={`overflow-hidden transition-all duration-500 ${
                    hoveredIndex === i ? "max-h-20 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
                  }`}
                >
                  <p className="font-mono text-xs text-primary/70 leading-relaxed border-t border-border pt-3">
                    {s.detail}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
