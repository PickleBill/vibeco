import { useState } from "react";
import FadeIn from "./FadeIn";
import { ExternalLink } from "lucide-react";

const projects = [
  {
    name: "Courtana",
    desc: "AI-powered async coaching platform for pickleball. Upload footage, get instant AI analysis with coach-grade feedback.",
    url: "https://courtanacoach.lovable.app",
    category: "Sports Tech / AI",
  },
  {
    name: "RAUM",
    desc: "Luxury real estate platform for Raleigh sellers. Market intelligence, home valuations, and premium listing experience.",
    url: "https://unicorse.lovable.app",
    category: "Real Estate",
  },
  {
    name: "The Load",
    desc: "Gamified household task division app for couples. Draft chores like fantasy sports — settle the score with brownie points.",
    url: "https://theload.lovable.app",
    category: "Consumer / Lifestyle",
  },
  {
    name: "Green Paws",
    desc: "Premium lawn care platform for Raleigh & Wake County. Service booking, pricing, and before/after showcases.",
    url: "https://greenpaws.lovable.app",
    category: "Local Services",
  },
  {
    name: "Moore Life & Wellness",
    desc: "Therapist practice site with booking, client portal, and resource library. Warm, accessible, clinically credible.",
    url: "https://mooremental.lovable.app",
    category: "Healthcare",
  },
  {
    name: "PicklePro Draft",
    desc: "Talent scouting platform for pickleball. Scout rising stars, analyze potential, and draft athletes to your roster.",
    url: "https://audition.lovable.app",
    category: "Sports / Marketplace",
  },
  {
    name: "Sup Time",
    desc: "Industrial safety ML system — sub-400ms hazard detection and machine intervention replacing legacy 3-5 second warnings.",
    url: "https://esuptime.lovable.app",
    category: "Industrial IoT / ML",
  },
];

const ProjectShowcase = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="projects" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-4">
            Recent Builds
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-6">
            Shipped fast. Built to last.
          </h2>
          <p className="font-mono text-base text-muted-foreground mb-16 max-w-2xl">
            Real products shipped in days, not months. Each one designed, built,
            and deployed using AI-native workflows.
          </p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p, i) => (
            <FadeIn key={p.name} delay={i * 0.06}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className={`relative bg-card border rounded-lg p-6 transition-all duration-500 flex flex-col h-full overflow-hidden ${
                    hoveredIndex === i
                      ? "border-primary/50 glow-accent scale-[1.02]"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {/* Glow orb on hover */}
                  <div
                    className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none ${
                      hoveredIndex === i ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                      background:
                        "radial-gradient(circle, hsl(243 76% 58% / 0.25), transparent)",
                    }}
                  />

                  {/* Category badge */}
                  <span className="inline-block font-mono text-[10px] text-primary uppercase tracking-widest mb-4 border border-primary/20 rounded-full px-3 py-1 w-fit">
                    {p.category}
                  </span>

                  <h3 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                    {p.name}
                  </h3>
                  <p className="font-mono text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                    {p.desc}
                  </p>

                  {/* Hover reveal */}
                  <div
                    className={`flex items-center gap-1.5 font-mono text-sm text-primary transition-all duration-300 ${
                      hoveredIndex === i
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-2"
                    }`}
                  >
                    View live <ExternalLink size={14} />
                  </div>
                </div>
              </a>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectShowcase;
