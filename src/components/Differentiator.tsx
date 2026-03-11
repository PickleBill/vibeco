import { useState } from "react";
import FadeIn from "./FadeIn";
import { Zap, Brain, TrendingUp, Target } from "lucide-react";

const diffs = [
  {
    icon: Zap,
    title: "Faster than an agency",
    desc: "From idea to live product in hours, not months. No SOWs, no committee sign-offs, no waiting.",
  },
  {
    icon: Brain,
    title: "More product-driven than freelancers",
    desc: "Real architecture, real design systems, real product thinking — not drag-and-drop guesswork.",
  },
  {
    icon: TrendingUp,
    title: "Aligned with upside",
    desc: "Revenue share, advisory equity, and hybrid models. We structure for shared outcomes, not billable hours.",
  },
  {
    icon: Target,
    title: "GTM-aware from day one",
    desc: "Every product ships with monetization hooks, analytics, and distribution infrastructure baked in.",
  },
];

const Differentiator = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-16">
            Why this is different.
          </h2>
        </FadeIn>
        <div className="grid sm:grid-cols-2 gap-6">
          {diffs.map((d, i) => (
            <FadeIn key={d.title} delay={i * 0.08}>
              <div
                className={`relative bg-card border rounded-lg p-8 transition-all duration-500 overflow-hidden ${
                  hoveredIndex === i
                    ? "border-primary/50 glow-accent-subtle scale-[1.01]"
                    : "border-border hover:border-primary/30"
                }`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className={`absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none ${
                    hoveredIndex === i ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    background: "radial-gradient(circle, hsl(243 76% 58% / 0.2), transparent)",
                  }}
                />
                <d.icon
                  size={20}
                  className={`mb-4 transition-colors duration-300 ${
                    hoveredIndex === i ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <h3 className="font-display text-lg font-bold text-foreground mb-2">
                  {d.title}
                </h3>
                <p className="font-mono text-sm text-foreground/80 leading-relaxed">
                  {d.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Differentiator;
