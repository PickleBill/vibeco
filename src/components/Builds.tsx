import FadeIn from "./FadeIn";

const projects = [
  {
    name: "Courtana",
    thesis: "Competitive racquet sports lack accessible, real-time performance analytics.",
    built: "AI-powered match analysis platform with shot tracking, opponent scouting, and performance dashboards.",
    wedge: "Existing coaching networks create natural distribution into a market starved for data tooling.",
    color: "from-primary/20 to-primary/5",
  },
  {
    name: "Unicorse",
    thesis: "Knowledge workers drown in context-switching between fragmented productivity tools.",
    built: "AI-native workflow engine that unifies tasks, docs, and communication into a single adaptive interface.",
    wedge: "Targets power users in fast-scaling ops teams where tool fatigue drives measurable productivity loss.",
    color: "from-primary/15 to-primary/5",
  },
  {
    name: "GreenPaws",
    thesis: "Pet care is a high-frequency, high-loyalty vertical with fragmented digital infrastructure.",
    built: "Modern commerce platform with AI-assisted health tracking, subscription management, and local service booking.",
    wedge: "Vertical integration captures recurring revenue across products, services, and data — in a market resistant to churn.",
    color: "from-primary/10 to-primary/5",
  },
];

const Builds = () => (
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

      {/* Horizontal scroll on desktop */}
      <div className="flex gap-6 overflow-x-auto pb-4 -mx-6 px-6 snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:overflow-visible lg:mx-0 lg:px-0">
        {projects.map((p, i) => (
          <FadeIn key={p.name} delay={i * 0.1}>
            <div className="min-w-[320px] lg:min-w-0 snap-start group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-all duration-300">
              {/* Mockup area */}
              <div className={`h-48 bg-gradient-to-br ${p.color} flex items-center justify-center relative`}>
                <div className="w-3/4 bg-background/60 border border-border rounded-md p-4 shadow-deep">
                  <div className="h-2 w-1/2 bg-secondary rounded-sm mb-2" />
                  <div className="h-2 w-3/4 bg-secondary rounded-sm mb-3" />
                  <div className="flex gap-2">
                    <div className="h-6 flex-1 bg-primary/20 rounded-sm" />
                    <div className="h-6 w-12 bg-primary/30 rounded-sm" />
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <h3 className="font-display text-xl font-bold text-foreground">
                  {p.name}
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                      Thesis
                    </p>
                    <p className="font-mono text-xs text-foreground/70 leading-relaxed">
                      {p.thesis}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                      What was built
                    </p>
                    <p className="font-mono text-xs text-foreground/70 leading-relaxed">
                      {p.built}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                      Why the wedge mattered
                    </p>
                    <p className="font-mono text-xs text-foreground/70 leading-relaxed">
                      {p.wedge}
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

export default Builds;
