import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FadeIn from "./FadeIn";
import heroMindmap from "@/assets/hero-mindmap.jpg";

const headlineWords = ["Your", "wildest", "idea."];
const taglineChars = "Live in minutes.".split("");

const wordSpring = { type: "spring" as const, stiffness: 90, damping: 12 };

const Hero = () => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Grid lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-full h-px bg-border/30" />
        <div className="absolute top-2/4 left-0 w-full h-px bg-border/20" />
        <div className="absolute top-3/4 left-0 w-full h-px bg-border/10" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          <div>
            <FadeIn>
              <p className="font-mono text-sm text-primary uppercase tracking-widest mb-6">
                try things. break things. ship things.
              </p>
            </FadeIn>

            {/* Staggered word reveal */}
            <div className="font-display text-5xl sm:text-6xl lg:text-7xl font-black text-foreground leading-[1.05] mb-1 scan-line">
              {prefersReduced ? (
                <FadeIn delay={0.1}>
                  <h1>
                    Your wildest idea.
                    <br />
                    <span className="text-gradient-accent">Live in minutes.</span>
                  </h1>
                </FadeIn>
              ) : (
                <h1>
                  {headlineWords.map((word, i) => (
                    <motion.span
                      key={word}
                      className="inline-block mr-[0.3em]"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...wordSpring, delay: 0.3 + i * 0.15 }}
                    >
                      {word}
                    </motion.span>
                  ))}
                  <br />
                  <span className="text-gradient-accent inline-block">
                    {taglineChars.map((ch, i) => (
                      <motion.span
                        key={i}
                        className="inline-block"
                        style={{ whiteSpace: ch === " " ? "pre" : undefined }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.08, delay: 0.9 + i * 0.035 }}
                      >
                        {ch}
                      </motion.span>
                    ))}
                  </span>
                </h1>
              )}
            </div>

            <FadeIn delay={1.5}>
              <p className="font-mono text-base text-foreground/80 leading-relaxed mb-4 max-w-lg mt-5">
                You describe it, we build it — powered by AI, driven by obsession.
                No dev team needed. No six-figure budget. Just your idea and our
                hands on the keyboard.
              </p>
            </FadeIn>
            <FadeIn delay={1.7}>
              <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-8 max-w-lg">
                Creator-led&ensp;•&ensp;AI-powered&ensp;•&ensp;Live in hours, not months
              </p>
            </FadeIn>
            <FadeIn delay={1.9}>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate("/simulate")}
                  className="font-mono text-sm bg-primary text-primary-foreground px-6 py-3 rounded-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                >
                  ✦ Simulate Your Idea
                </button>
                <button
                  onClick={() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })}
                  className="font-mono text-sm border border-border text-foreground px-6 py-3 rounded-sm hover:border-primary/50 hover:text-primary transition-colors"
                >
                  Pitch Your Idea
                </button>
              </div>
              <button
                onClick={() => document.querySelector("#projects")?.scrollIntoView({ behavior: "smooth" })}
                className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors mt-3"
              >
                ↓ See what we've built
              </button>
              {/* Mobile stats strip */}
              <div className="flex lg:hidden items-center gap-6 mt-8 pt-6 border-t border-border/30">
                {[
                  { value: "16+", label: "live builds" },
                  { value: "< 48hrs", label: "avg to launch" },
                  { value: "$0", label: "upfront on rev-share" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="font-display text-xl font-black text-primary">{s.value}</p>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Parallax mind-map image */}
          <FadeIn delay={0.5} className="hidden lg:flex items-center justify-center">
            <motion.div className="relative" style={{ y: prefersReduced ? 0 : imageY }}>
              <div
                className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
                style={{
                  background: "radial-gradient(circle, hsl(var(--primary) / 0.2), transparent 70%)",
                  transform: "scale(1.3)",
                }}
              />
              <motion.img
                src={heroMindmap}
                alt="Creative brainstorming mind map — ideas to products to revenue"
                className="relative w-[420px] h-[420px] object-cover rounded-2xl"
                style={{
                  maskImage: "radial-gradient(ellipse 85% 85% at center, black 50%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(ellipse 85% 85% at center, black 50%, transparent 100%)",
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              />
            </motion.div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
};

export default Hero;
