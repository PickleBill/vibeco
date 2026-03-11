import { useState } from "react";
import FadeIn from "./FadeIn";

const diffs = [
  {
    title: "Faster than a traditional agency",
    desc: "No bloated timelines or committee decisions. We ship MVPs in weeks.",
    detail: "AI-native workflows compress months of development into focused 2-4 week sprints.",
  },
  {
    title: "More thoughtful than a no-code freelancer",
    desc: "Real architecture, real design, real product thinking — not drag-and-drop guesswork.",
    detail: "Production-grade code, scalable infrastructure, and design systems that grow with you.",
  },
  {
    title: "More aligned than a fixed-fee shop",
    desc: "We structure for shared outcomes. When you win, we win.",
    detail: "Revenue share, advisory equity, and hybrid models that put real skin in the game.",
  },
  {
    title: "More commercially grounded than AI demo builders",
    desc: "We build for markets, not for demos. Every feature earns its place.",
    detail: "Every product ships with monetization hooks, analytics, and distribution infrastructure.",
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

                <h3 className="font-display text-lg font-bold text-foreground mb-2">
                  {d.title}
                </h3>
                <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                  {d.desc}
                </p>

                <div
                  className={`overflow-hidden transition-all duration-500 ${
                    hoveredIndex === i ? "max-h-16 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
                  }`}
                >
                  <p className="font-mono text-xs text-primary/70 leading-relaxed border-t border-border pt-3">
                    {d.detail}
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

export default Differentiator;
