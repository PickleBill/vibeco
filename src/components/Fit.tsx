import FadeIn from "./FadeIn";
import { Check, X } from "lucide-react";

const good = [
  "Deep industry expertise",
  "Strong insight into a painful workflow or market gap",
  "Existing audience, pipeline, or distribution edge",
  "B2B SaaS, vertical AI, workflow tools, commerce tools",
  "Serious intent to test, sell, and iterate quickly",
];

const bad = [
  "Vague consumer ideas with no wedge",
  "Founders looking for the cheapest build possible",
  "Multi-sided marketplace concepts with no traction",
  "Projects with unclear monetization or no urgency",
  "People who want a vendor, not a thinking partner",
];

const Fit = () => (
  <section className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <FadeIn>
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-4">
          Who we partner with
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-16">
          Signal over noise.
        </h2>
      </FadeIn>
      <div className="grid md:grid-cols-2 gap-8">
        <FadeIn delay={0.05}>
          <div className="bg-card border border-border rounded-lg p-8">
            <h3 className="font-display text-lg font-bold text-foreground mb-6">
              Good fit
            </h3>
            <ul className="space-y-4">
              {good.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check size={14} className="text-primary mt-0.5 shrink-0" />
                  <span className="font-mono text-sm text-foreground/70">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="bg-card border border-border rounded-lg p-8">
            <h3 className="font-display text-lg font-bold text-foreground mb-6">
              Not a fit
            </h3>
            <ul className="space-y-4">
              {bad.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <X size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <span className="font-mono text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>
      </div>
    </div>
  </section>
);

export default Fit;
