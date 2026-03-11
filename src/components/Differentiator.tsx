import { useState } from "react";
import { motion } from "framer-motion";
import FadeIn from "./FadeIn";
import { Zap, Brain, TrendingUp, Target } from "lucide-react";

const diffs = [
  {
    icon: Zap,
    title: "Unbelievably fast",
    desc: "From idea to live product in hours, not months. No proposals, no committee sign-offs, no waiting. Just shipping.",
  },
  {
    icon: Brain,
    title: "Real product thinking, not templates",
    desc: "Architecture, design systems, and product strategy — not drag-and-drop guesswork or cookie-cutter themes.",
  },
  {
    icon: TrendingUp,
    title: "Skin in the game",
    desc: "Revenue share, equity, hybrid models. We bet on the same outcome you do. Your win is our win.",
  },
  {
    icon: Target,
    title: "Ready for real customers from day one",
    desc: "Every product ships with the tools to make money, track results, and reach people — baked in, not bolted on.",
  },
];

const Differentiator = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-16">
            Why this hits different.
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
                <motion.div
                  animate={hoveredIndex === i ? { scale: [1, 1.2, 1], rotate: [0, 5, 0] } : { scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <d.icon
                    size={20}
                    className={`mb-4 transition-colors duration-300 ${
                      hoveredIndex === i ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                </motion.div>
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
