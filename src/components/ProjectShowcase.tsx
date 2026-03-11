import FadeIn from "./FadeIn";
import { ExternalLink } from "lucide-react";

const projects = [
  {
    name: "Client Portal Pro",
    desc: "A sleek client-facing dashboard for service businesses to manage bookings, invoices, and communications.",
    url: "#",
  },
  {
    name: "Route Genius",
    desc: "AI-powered route optimization for field service teams — reduce drive time, increase daily jobs.",
    url: "#",
  },
  {
    name: "FitTrack AI",
    desc: "Personalized workout and nutrition tracking app with AI-generated plans and progress insights.",
    url: "#",
  },
  {
    name: "DealFlow CRM",
    desc: "Lightweight CRM built for solo consultants and small agencies to manage pipeline and close faster.",
    url: "#",
  },
  {
    name: "PropMatch",
    desc: "Real estate lead matching engine that pairs buyers with listings using behavioral signals.",
    url: "#",
  },
  {
    name: "InvoiceSnap",
    desc: "One-click invoicing and payment collection for freelancers and micro-businesses.",
    url: "#",
  },
];

const ProjectShowcase = () => (
  <section id="projects" className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <FadeIn>
        <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-4">
          Shipped with Lovable
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-6">
          Shipped fast. Built to last.
        </h2>
        <p className="font-mono text-base text-muted-foreground mb-16 max-w-2xl">
          A selection of recent builds — real products shipped in days, not
          months. Share your Lovable profile link to populate this with your
          actual projects.
        </p>
      </FadeIn>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((p, i) => (
          <FadeIn key={p.name} delay={i * 0.06}>
            <div className="group bg-card border border-border rounded-lg p-6 hover:border-primary/30 hover:glow-accent-subtle transition-all duration-300 flex flex-col h-full">
              {/* Placeholder mockup bar */}
              <div className="h-32 bg-gradient-to-br from-primary/15 to-primary/5 rounded-md mb-5 flex items-center justify-center">
                <div className="w-3/4 space-y-2">
                  <div className="h-2 w-2/3 bg-secondary rounded-sm" />
                  <div className="h-2 w-full bg-secondary rounded-sm" />
                  <div className="flex gap-2 mt-3">
                    <div className="h-5 flex-1 bg-primary/20 rounded-sm" />
                    <div className="h-5 w-10 bg-primary/30 rounded-sm" />
                  </div>
                </div>
              </div>

              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                {p.name}
              </h3>
              <p className="font-mono text-sm text-muted-foreground leading-relaxed flex-1">
                {p.desc}
              </p>

              {p.url !== "#" && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-sm text-primary hover:text-primary/80 transition-colors mt-4"
                >
                  View live <ExternalLink size={14} />
                </a>
              )}
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  </section>
);

export default ProjectShowcase;
