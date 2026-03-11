import { motion } from "framer-motion";
import FadeIn from "./FadeIn";
import { Zap, Rocket, BarChart3, Code2, Users, DollarSign } from "lucide-react";

const floatingFragments = [
  { label: "$MRR", icon: DollarSign, x: 15, y: 20, delay: 0.2 },
  { label: "users", icon: Users, x: 75, y: 15, delay: 0.5 },
  { label: "API", icon: Code2, x: 85, y: 55, delay: 0.8 },
  { label: "launch", icon: Rocket, x: 10, y: 65, delay: 0.4 },
  { label: "growth", icon: BarChart3, x: 50, y: 75, delay: 0.6 },
  { label: "ship it", icon: Zap, x: 45, y: 10, delay: 0.3 },
];

const HeroVibes = () => (
  <div className="relative w-full h-[420px] max-w-lg mx-auto lg:mx-0">
    {/* Central glow orb */}
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none"
      style={{
        background: "radial-gradient(circle, hsl(var(--primary) / 0.25), transparent 70%)",
      }}
      animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />

    {/* Avatar - Founder (left) */}
    <motion.div
      className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="w-14 h-14 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
        <span className="font-display text-lg font-bold text-accent">💡</span>
      </div>
      <span className="font-mono text-[10px] text-muted-foreground">founder</span>
    </motion.div>

    {/* Avatar - Builder (right) */}
    <motion.div
      className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
        <span className="font-display text-lg font-bold text-primary">⚡</span>
      </div>
      <span className="font-mono text-[10px] text-muted-foreground">builder</span>
    </motion.div>

    {/* Connection SVG paths */}
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
      <motion.path
        d="M 70 200 Q 200 140 330 200"
        fill="none"
        stroke="hsl(var(--primary) / 0.3)"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
      />
      <motion.path
        d="M 70 200 Q 200 260 330 200"
        fill="none"
        stroke="hsl(var(--accent) / 0.2)"
        strokeWidth="1"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.8, delay: 0.7, ease: "easeInOut" }}
      />
      {/* Pulsing dot along path */}
      <motion.circle
        r="3"
        fill="hsl(var(--primary))"
        animate={{
          cx: [70, 200, 330],
          cy: [200, 140, 200],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>

    {/* Floating idea fragments */}
    {floatingFragments.map((frag) => (
      <motion.div
        key={frag.label}
        className="absolute flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card/80 backdrop-blur-sm border border-border/60 shadow-lg"
        style={{ left: `${frag.x}%`, top: `${frag.y}%` }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          opacity: [0, 1, 1, 0.7, 1],
          scale: [0.5, 1, 1, 0.98, 1],
          y: [0, -6, 0, 4, 0],
        }}
        transition={{
          duration: 5,
          delay: frag.delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <frag.icon size={12} className="text-primary" />
        <span className="font-mono text-[11px] text-foreground/90">{frag.label}</span>
      </motion.div>
    ))}

    {/* Typing indicator near builder */}
    <motion.div
      className="absolute right-16 top-[38%] px-2.5 py-1 rounded bg-primary/10 border border-primary/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
    >
      <motion.span
        className="font-mono text-[10px] text-primary"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        {"building..."}
      </motion.span>
    </motion.div>
  </div>
);

const Hero = () => (
  <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
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
          <FadeIn delay={0.1}>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black text-foreground leading-[1.05] mb-6 scan-line">
              Your wildest idea.
              <br />
              <span className="text-gradient-accent">Live in minutes.</span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="font-mono text-base text-foreground/80 leading-relaxed mb-4 max-w-lg">
              We don't do decks, timelines, or hand-wringing. You describe it, we
              build it — often before you finish your coffee. The only bottleneck
              is how fast you can think.
            </p>
          </FadeIn>
          <FadeIn delay={0.25}>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Founder-operated&ensp;•&ensp;Minutes to live product&ensp;•&ensp;Hands-on iteration partner
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="flex flex-wrap gap-4">
              <a
                href="#contact"
                className="font-mono text-sm bg-primary text-primary-foreground px-6 py-3 rounded-sm hover:opacity-90 transition-opacity inline-block"
              >
                Pitch Your Idea
              </a>
              <a
                href="#builds"
                className="font-mono text-sm border border-border text-foreground px-6 py-3 rounded-sm hover:border-primary/50 hover:text-primary transition-colors inline-block"
              >
                See Selected Builds
              </a>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.35} className="hidden lg:block">
          <HeroVibes />
        </FadeIn>
      </div>
    </div>
  </section>
);

export default Hero;
