import { motion } from "framer-motion";
import FadeIn from "./FadeIn";

const HeroMockup = () => (
  <div className="relative w-full max-w-lg mx-auto lg:mx-0">
    {/* Browser frame */}
    <div className="bg-card border border-border rounded-lg shadow-deep overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
        <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
        <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
        <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
        <div className="ml-4 h-5 w-48 bg-secondary rounded-sm" />
      </div>
      <div className="p-6 space-y-4">
        <div className="h-3 w-3/4 bg-secondary rounded-sm" />
        <div className="h-3 w-1/2 bg-secondary rounded-sm" />
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-secondary rounded-sm p-4 space-y-2">
              <div className="h-2 w-full bg-muted-foreground/20 rounded-sm" />
              <div className="h-6 w-2/3 bg-primary/20 rounded-sm" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-4">
          <div className="h-8 flex-1 bg-primary/15 rounded-sm" />
          <div className="h-8 w-20 bg-primary rounded-sm" />
        </div>
      </div>
    </div>

    {/* Floating card */}
    <div className="absolute -bottom-6 -left-6 bg-card border border-border rounded-lg p-4 shadow-deep w-48">
      <div className="h-2 w-16 bg-primary/30 rounded-sm mb-3" />
      <div className="h-2 w-full bg-secondary rounded-sm mb-2" />
      <div className="h-2 w-3/4 bg-secondary rounded-sm" />
    </div>

    {/* Accent glow */}
    <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
  </div>
);

const Hero = () => (
  <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
    {/* Scan line bg effect */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/4 left-0 w-full h-px bg-border/30" />
      <div className="absolute top-2/4 left-0 w-full h-px bg-border/20" />
      <div className="absolute top-3/4 left-0 w-full h-px bg-border/10" />
    </div>

    <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
      <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
        {/* Left */}
        <div>
          <FadeIn>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-6">
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
              We build sharp, testable AI products for founders who need real market
              feedback fast — not six months from now.
            </p>
          </FadeIn>
          <FadeIn delay={0.25}>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Selective partnerships. High-agency founders. MVPs built with speed,
              taste, and commercial discipline.
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

        {/* Right */}
        <FadeIn delay={0.35} className="hidden lg:block">
          <HeroMockup />
        </FadeIn>
      </div>
    </div>
  </section>
);

export default Hero;
