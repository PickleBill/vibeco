import { useState } from "react";
import FadeIn from "./FadeIn";
import { ChevronDown, MessageCircle, Code2, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  {
    num: "01",
    title: "We Listen",
    short: "You tell us the problem. We poke holes and find the fastest path to something real.",
    detail:
      "Who has this problem? Why does it matter? What's the first version? We work it out in a single conversation — no jargon required.",
    icon: MessageCircle,
    iconColor: "text-blue-400",
  },
  {
    num: "02",
    title: "We Build",
    short: "Conversation to deployed product in hours. Not mockups — the real thing.",
    detail:
      "Designed, built, and deployed — shareable with real customers the same day. AI handles the stack so we can focus on making it right.",
    icon: Code2,
    iconColor: "text-emerald-400",
  },
  {
    num: "03",
    title: "We Grow Together",
    short: "Revenue share, equity, or flat fee — whatever makes us both invested in winning.",
    detail:
      "We're not billing hours. We pick a structure that aligns incentives — so we're betting on the same outcome you are.",
    icon: Rocket,
    iconColor: "text-amber-400",
  },
];

const Model = () => {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <section id="model" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-4">
            How we work together
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-6">
            Three steps. One outcome.
          </h2>
          <p className="text-sm text-foreground/80 mb-16 max-w-xl">
            We only take on projects we believe in. Every deal is
            structured so winning is mutual.
          </p>
        </FadeIn>

        <div className="space-y-4">
          {steps.map((s, i) => {
            const isOpen = expanded === i;
            const StepIcon = s.icon;
            return (
              <FadeIn key={s.num} delay={i * 0.1}>
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className={`w-full text-left relative bg-card border rounded-lg p-8 transition-all duration-500 overflow-hidden group ${
                    isOpen
                      ? "border-primary/50 shadow-warm"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div
                    className={`absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none ${
                      isOpen ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                      background:
                        "radial-gradient(circle, hsl(var(--primary) / 0.2), transparent)",
                    }}
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-6">
                      <span className="font-display text-4xl font-black text-primary/20 leading-none">
                        {s.num}
                      </span>
                      <div>
                        <h3 className="font-display text-xl font-bold text-foreground mb-2">
                          {s.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
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
                        <div className="mt-4 ml-16 border-t border-border pt-4 flex items-start gap-5">
                          {/* Animated icon */}
                          <motion.div
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                            className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0"
                          >
                            <StepIcon size={22} className={s.iconColor} />
                          </motion.div>
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            {s.detail}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </FadeIn>
            );
          })}
        </div>

        {/* Visual step flow */}
        <FadeIn delay={0.4}>
          <div className="mt-12 flex items-center justify-center gap-4">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
                    <s.icon size={16} className={s.iconColor} />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{s.title}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className="w-12 h-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Builder ethos */}
        <FadeIn delay={0.5}>
          <p className="text-center text-xs text-muted-foreground mt-10 tracking-wide">
            Skin in the game · Builder, not vendor · Biased toward shipping
          </p>
        </FadeIn>
      </div>
    </section>
  );
};

export default Model;
