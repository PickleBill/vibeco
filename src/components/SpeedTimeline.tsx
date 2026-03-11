import { useState, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Building2, Server, Cloud, Wand2, Zap } from "lucide-react";
import FadeIn from "./FadeIn";

const eras = [
  {
    id: 0,
    years: "1970s–80s",
    label: "Mainframes",
    icon: Building2,
    time: "3–5 years",
    cost: "$1M+",
    desc: "Entire buildings, dedicated teams, millions in hardware. Software was a luxury only corporations could afford.",
    color: "hsl(var(--muted-foreground))",
  },
  {
    id: 1,
    years: "1990s–2000s",
    label: "Dev Shops",
    icon: Server,
    time: "6–12 months",
    cost: "$100K+",
    desc: "Outsourced dev teams, six-figure budgets, on-premise servers. Startups were born but slowly.",
    color: "hsl(var(--muted-foreground))",
  },
  {
    id: 2,
    years: "2010s",
    label: "Cloud & Startups",
    icon: Cloud,
    time: "3–6 months",
    cost: "$50K+",
    desc: "AWS, lean methodology, seed rounds. Faster — but still required engineers and runway.",
    color: "hsl(var(--muted-foreground))",
  },
  {
    id: 3,
    years: "2020–24",
    label: "No-Code & Early AI",
    icon: Wand2,
    time: "Weeks–Months",
    cost: "$5K+",
    desc: "DIY tools democratized building, but you hit walls fast. Still limited, still slow for real products.",
    color: "hsl(var(--muted-foreground))",
  },
  {
    id: 4,
    years: "2025+",
    label: "AI-Native",
    icon: Zap,
    time: "Hours",
    cost: "$0 upfront",
    desc: "One conversation. Live today. AI handles the stack — you bring the idea. Welcome to VibeCo.",
    color: "hsl(var(--primary))",
  },
];

// Generate the inverse exponential curve points
const generateCurvePoints = (width: number, height: number, progress: number) => {
  const points: string[] = [];
  const steps = 100;
  const maxX = Math.floor(steps * progress);

  for (let i = 0; i <= maxX; i++) {
    const x = (i / steps) * width;
    // Inverse exponential: starts high, drops dramatically
    const t = i / steps;
    const y = height * 0.1 + height * 0.8 * Math.exp(-4 * t);
    points.push(`${x},${y}`);
  }

  return points.length > 1 ? `M ${points.join(" L ")}` : "";
};

const SpeedTimeline = () => {
  const [activeEra, setActiveEra] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgWidth, setSvgWidth] = useState(600);

  useEffect(() => {
    const updateWidth = () => {
      if (svgRef.current) {
        setSvgWidth(svgRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Auto-animate on first view
  useEffect(() => {
    if (!isInView) return;
    const timer = setTimeout(() => {
      let step = 0;
      const interval = setInterval(() => {
        step++;
        const val = Math.min(step * 2, 100);
        setSliderValue(val);
        setActiveEra(Math.min(Math.floor(val / 25), 4));
        if (val >= 100) clearInterval(interval);
      }, 40);
      return () => clearInterval(interval);
    }, 400);
    return () => clearTimeout(timer);
  }, [isInView]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSliderValue(val);
    setActiveEra(Math.min(Math.floor(val / 25), 4));
  };

  const progress = sliderValue / 100;
  const svgHeight = 160;

  return (
    <section ref={sectionRef} className="py-32 border-t border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-foreground leading-tight mb-4 max-w-3xl">
            The world changed.
            <br />
            Building didn't keep up. <span className="text-primary">Until now.</span>
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="font-mono text-sm text-muted-foreground mb-16 max-w-lg">
            Drag the slider to see how fast product development has become.
          </p>
        </FadeIn>

        {/* SVG Curve */}
        <FadeIn delay={0.15}>
          <div className="relative mb-4">
            {/* Y-axis label */}
            <p className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-widest">
              Time to launch ↓
            </p>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full"
              style={{ height: svgHeight }}
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((t) => (
                <line
                  key={t}
                  x1={t * svgWidth}
                  y1={0}
                  x2={t * svgWidth}
                  y2={svgHeight}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              ))}
              {/* The curve */}
              <motion.path
                d={generateCurvePoints(svgWidth, svgHeight, progress)}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Glow path */}
              <motion.path
                d={generateCurvePoints(svgWidth, svgHeight, progress)}
                fill="none"
                stroke="hsl(var(--primary) / 0.3)"
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="blur(4px)"
              />
              {/* End dot */}
              {progress > 0.05 && (
                <motion.circle
                  cx={progress * svgWidth}
                  cy={
                    svgHeight * 0.1 +
                    svgHeight * 0.8 * Math.exp(-4 * progress)
                  }
                  r={6}
                  fill="hsl(var(--primary))"
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </svg>
          </div>
        </FadeIn>

        {/* Slider */}
        <FadeIn delay={0.2}>
          <div className="relative mb-12">
            <input
              type="range"
              min={0}
              max={100}
              value={sliderValue}
              onChange={handleSliderChange}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${sliderValue}%, hsl(var(--muted)) ${sliderValue}%, hsl(var(--muted)) 100%)`,
              }}
            />
            {/* Era markers */}
            <div className="flex justify-between mt-2">
              {eras.map((era) => (
                <button
                  key={era.id}
                  onClick={() => {
                    const val = era.id * 25;
                    setSliderValue(val);
                    setActiveEra(era.id);
                  }}
                  className={`font-mono text-[10px] transition-colors duration-200 ${
                    activeEra === era.id
                      ? "text-primary font-bold"
                      : "text-muted-foreground"
                  }`}
                >
                  {era.years}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Era Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {eras.map((era) => {
            const Icon = era.icon;
            const isActive = activeEra === era.id;

            return (
              <motion.button
                key={era.id}
                onClick={() => {
                  setActiveEra(era.id);
                  setSliderValue(era.id * 25);
                }}
                className={`text-left p-4 rounded-sm border transition-all duration-300 ${
                  isActive
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-background hover:border-muted-foreground/30"
                }`}
                animate={{
                  scale: isActive ? 1.02 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Icon
                  size={20}
                  className={`mb-2 transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <p
                  className={`font-display text-sm font-bold mb-1 transition-colors ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {era.label}
                </p>
                <div className="flex gap-3 mb-2">
                  <span className="font-mono text-[10px] text-primary">
                    {era.time}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {era.cost}
                  </span>
                </div>
                <AnimatePresence>
                  {isActive && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="font-mono text-xs text-muted-foreground leading-relaxed"
                    >
                      {era.desc}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SpeedTimeline;
