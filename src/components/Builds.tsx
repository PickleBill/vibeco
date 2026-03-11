import { useState } from "react";
import FadeIn from "./FadeIn";

const projects = [
  {
    name: "Courtana",
    thesis: "Competitive racquet sports lack accessible, real-time performance analytics for amateur players.",
    built: "AI-powered async coaching platform — upload match footage, receive instant shot-by-shot analysis with improvement plans.",
    kpi: "68% of beta users returned within 7 days for a second analysis session.",
    color: "from-primary/20 to-primary/5",
  },
  {
    name: "GreenPaws",
    thesis: "Local lawn care is a high-frequency, high-loyalty vertical with zero modern booking infrastructure.",
    built: "Premium service platform with instant quoting, automated scheduling, and before/after showcases for Raleigh & Wake County.",
    kpi: "3.2x higher booking conversion vs. the operator's previous contact-form-only site.",
    color: "from-primary/15 to-primary/5",
  },
  {
    name: "Unicorse",
    thesis: "Luxury real estate sellers need data-driven market intelligence, not generic listing pages.",
    built: "Seller-focused platform with live market comps, AI-generated home valuations, and premium listing experience.",
    kpi: "Average session duration 4x longer than the previous site; 22% lead-form completion rate.",
    color: "from-primary/10 to-primary/5",
  },
];

const Builds = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="builds" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-4">
            Selected Builds
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-16">
            Conviction, tested.
          </h2>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6">
          {projects.map((p, i) => (
            <FadeIn key={p.name} delay={i * 0.1}>
              <div
                className={`group relative bg-card border rounded-lg overflow-hidden transition-all duration-500 h-full ${
                  hoveredIndex === i
                    ? "border-primary/50 glow-accent scale-[1.02]"
                    : "border-border hover:border-primary/30"
                }`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none ${
                    hoveredIndex === i ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    background: "radial-gradient(circle, hsl(243 76% 58% / 0.25), transparent)",
                  }}
                />
                <div className={`h-32 bg-gradient-to-br ${p.color} flex items-center justify-center`}>
                  <div className="w-3/4 bg-background/60 border border-border rounded-md p-3 shadow-deep">
                    <div className="h-2 w-1/2 bg-secondary rounded-sm mb-2" />
                    <div className="h-2 w-3/4 bg-secondary rounded-sm mb-2" />
                    <div className="flex gap-2">
                      <div className="h-5 flex-1 bg-primary/20 rounded-sm" />
                      <div className="h-5 w-10 bg-primary/30 rounded-sm" />
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="font-mono text-[10px] text-primary uppercase tracking-widest mb-2">
                      Thesis
                    </p>
                    <h3 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {p.name}
                    </h3>
                    <p className="font-mono text-sm text-foreground/80 leading-relaxed">
                      {p.thesis}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                      What we shipped
                    </p>
                    <p className="font-mono text-sm text-foreground/80 leading-relaxed">
                      {p.built}
                    </p>
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-500 ${
                      hoveredIndex === i ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="border-t border-border pt-3">
                      <p className="font-mono text-[10px] text-primary uppercase tracking-widest mb-1">
                        Test Signal
                      </p>
                      <p className="font-mono text-sm text-primary leading-relaxed">
                        {p.kpi}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Builds;
