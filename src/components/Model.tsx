import { useState } from "react";
import FadeIn from "./FadeIn";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  {
    num: "01",
    title: "Founder Signal",
    short: "We evaluate conviction, domain depth, and distribution edge — not decks.",
    detail:
      "We look for founders who have a real insight into a painful market gap and a credible path to early customers. Cold outreach ideas and vague consumer concepts are filtered early.",
  },
  {
    num: "02",
    title: "Rapid Build",
    short: "AI-assisted, design-forward. Concept to testable MVP in weeks.",
    detail:
      "Full-stack product development, responsive design, analytics, and launch infrastructure. Every decision optimized for learning speed and commercial signal.",
  },
  {
    num: "03",
    title: "Shared Upside",
    short: "Structured for alignment. When you win, we win.",
    detail:
      "For the right projects, we go beyond flat fees. Typical structures include: $0–$3k upfront + 0.5–2% advisory equity, or 5–10% of first-year ARR attributed to the product. Hybrid and paid-build options available for founders who prefer no dilution.",
  },
];

const Model = () => {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <section id="model" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-4">
            How we partner
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-6">
            Built for alignment.
          </h2>
          <p className="font-mono text-sm text-muted-foreground mb-16 max-w-xl">
            Selective, founder-grade partnerships. Not a services menu — a shared
            bet on things worth building.
          </p>
        </FadeIn>

        <div className="space-y-4">
          {steps.map((s, i) => {
            const isOpen = expanded === i;
            return (
              <FadeIn key={s.num} delay={i * 0.1}>
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className={`w-full text-left relative bg-card border rounded-lg p-8 transition-all duration-500 overflow-hidden group ${
                    isOpen
                      ? "border-primary/50 glow-accent-subtle"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {/* Glow orb */}
                  <div
                    className={`absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none ${
                      isOpen ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                      background:
                        "radial-gradient(circle, hsl(243 76% 58% / 0.2), transparent)",
                    }}
                  />

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-6">
                      <span className="font-display text-4xl font-black text-primary/15 leading-none">
                        {s.num}
                      </span>
                      <div>
                        <h3 className="font-display text-xl font-bold text-foreground mb-2">
                          {s.title}
                        </h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                          {s.short}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-muted-foreground shrink-0 mt-1 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="font-mono text-sm text-foreground/60 leading-relaxed mt-4 ml-16 border-t border-border pt-4">
                          {s.detail}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Model;
