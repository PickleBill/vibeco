import { useState } from "react";
import FadeIn from "./FadeIn";
import { ExternalLink, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const projects = [
  {
    name: "Courtana Coach",
    desc: "AI pickleball coaching platform with video analysis and drill builder.",
    url: "https://courtanacoach.lovable.app",
    category: "Sports Tech",
  },
  {
    name: "NaughtyData",
    desc: "Privacy-first data analytics dashboard with real-time monitoring.",
    url: "https://naughtydata.lovable.app",
    category: "Analytics",
  },
  {
    name: "FactFudge",
    desc: "AI-powered fact-checking game that tests media literacy.",
    url: "https://factfudge.lovable.app",
    category: "EdTech",
  },
  {
    name: "Moore Mental",
    desc: "Mental health resource platform with guided self-assessment tools.",
    url: "https://mooremental.lovable.app",
    category: "Health",
  },
  {
    name: "HeadsUp Time",
    desc: "Screen time awareness tool helping families set healthy digital habits.",
    url: "https://headsuptime.lovable.app",
    category: "Wellness",
  },
  {
    name: "Unicorse",
    desc: "Spatial design and room planning tool with 3D visualization.",
    url: "https://unicorse.lovable.app",
    category: "Design",
  },
  {
    name: "The Load",
    desc: "Gamified household task app for couples — draft chores like fantasy sports.",
    url: "https://theload.lovable.app",
    category: "Lifestyle",
  },
  {
    name: "Green Paws",
    desc: "Premium lawn care platform with service booking and before/after showcases.",
    url: "https://greenpaws.lovable.app",
    category: "Local Services",
  },
  {
    name: "Raleigh Crafting",
    desc: "Local crafting community hub with event booking and supply sourcing.",
    url: "https://raleighcrafting.lovable.app",
    category: "Community",
  },
  {
    name: "Audition",
    desc: "Casting and audition management platform for talent and producers.",
    url: "https://audition.lovable.app",
    category: "Entertainment",
  },
];

const getThumbnailUrl = (url: string) =>
  `https://image.thum.io/get/width/640/crop/400/noanimate/${url}`;

const ProjectShowcase = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const navigate = useNavigate();

  return (
    <section id="projects" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <FadeIn>
              <p className="font-mono text-xs text-primary tracking-[0.3em] uppercase mb-4">
                Live Builds
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-4">
                Shipped this month. Not mockups.
              </h2>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                Every project below went from a conversation to a live, working product — most in under 48 hours.
              </p>
            </FadeIn>
          </div>
          <FadeIn delay={0.15}>
            <button
              onClick={() => navigate("/simulate")}
              className="flex items-center gap-2 font-mono text-sm bg-primary text-primary-foreground px-6 py-3 rounded-sm hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Sparkles size={14} />
              Simulate Your Idea
            </button>
          </FadeIn>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project, index) => (
            <FadeIn key={project.name} delay={index * 0.05}>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group block rounded-lg border overflow-hidden transition-all duration-300 ${
                  hoveredIndex === index
                    ? "border-primary/40 shadow-lg"
                    : "border-border/60 hover:border-primary/20"
                }`}
                style={
                  hoveredIndex === index
                    ? { boxShadow: "0 0 30px hsl(var(--primary) / 0.08)" }
                    : {}
                }
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                  <img
                    src={getThumbnailUrl(project.url)}
                    alt={`${project.name} screenshot`}
                    loading="lazy"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-3 left-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm text-primary border border-primary/20">
                      {project.category}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 bg-card/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-base font-bold text-foreground">
                      {project.name}
                    </h3>
                    <ExternalLink
                      size={13}
                      className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0"
                    />
                  </div>
                  <p className="font-mono text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {project.desc}
                  </p>
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
