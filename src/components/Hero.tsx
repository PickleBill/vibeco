<!-- This site must be exported to static HTML via CI for SEO prerendering. -->
import { motion } from "framer-motion";
import FadeIn from "./FadeIn";

const HeroMockup = () => (
  <div className="relative w-full max-w-lg mx-auto lg:mx-0">
    {/* Animated glow behind mockup */}
    <motion.div
      className="absolute -inset-8 rounded-full blur-3xl pointer-events-none"
      style={{
        background: "radial-gradient(circle, hsl(243 76% 58% / 0.15), transparent 70%)",
      }}
      animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />

    {/* Browser frame */}
    <div className="relative bg-card border border-border rounded-lg shadow-deep overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
        <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-accent/40" />
        <div className="w-2.5 h-2.5 rounded-full bg-primary/40" />
        <div className="ml-4 h-5 w-48 bg-secondary rounded-sm flex items-center px-2">
          <span className="font-mono text-[9px] text-muted-foreground">app.yourstartup.io/dashboard</span>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-3 w-28 bg-secondary rounded-sm" />
          <div className="h-6 w-16 bg-primary/30 rounded-sm" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "MRR", value: "$4.2k" },
            { label: "Users", value: "312" },
            { label: "NPS", value: "72" },
          ].map((m) => (
            <div key={m.label} className="bg-secondary rounded-sm p-3 space-y-1">
              <p className="font-mono text-[9px] text-muted-foreground uppercase">{m.label}</p>
              <p className="font-display text-sm font-bold text-foreground">{m.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full bg-secondary rounded-sm" />
          <div className="h-2 w-4/5 bg-secondary rounded-sm" />
        </div>
        <div className="flex gap-3">
          <div className="h-8 flex-1 bg-primary/15 rounded-sm" />
          <div className="h-8 w-20 bg-primary rounded-sm" />
        </div>
      </div>
    </div>

    {/* Floating notification card */}
    <motion.div
      className="absolute -bottom-6 -left-6 bg-card border border-border rounded-lg p-4 shadow-deep w-52"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="font-mono text-[10px] text-primary">Live signal</span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-sm mb-1.5" />
      <div className="h-2 w-3/4 bg-secondary rounded-sm" />
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
            <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-6">
              AI-native product studio
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black text-foreground leading-[1.05] mb-6 scan-line">
              Turn conviction into software.
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="font-mono text-base text-foreground/80 leading-relaxed mb-4 max-w-lg">
              We partner with high-agency founders to ship testable,
              revenue-oriented MVPs fast. Selective partnerships. Skin in the
              game.
            </p>
          </FadeIn>
          <FadeIn delay={0.25}>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Founder-operated&ensp;•&ensp;Product + GTM operator&ensp;•&ensp;Selective partnerships
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
          <HeroMockup />
        </FadeIn>
      </div>
    </div>
  </section>
);

export default Hero;
