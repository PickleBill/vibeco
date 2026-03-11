import FadeIn from "./FadeIn";
import { Check, X } from "lucide-react";

const good = [
  "You know your customers and their problems better than anyone",
  "You have a strong insight into a painful workflow or gap in your industry",
  "You already have an audience, client base, or way to get it in front of people",
  "You're building tools that solve real problems for real businesses",
  "You're ready to test, sell, and iterate — not just brainstorm",
];

const bad = [
  "Ideas without a clear customer or problem to solve",
  "Looking for the cheapest build possible over the best one",
  "Complex marketplace concepts with no traction yet",
  "Projects with no clear way to make money or no urgency behind them",
  "People who want a vendor, not a thinking partner",
];

const Fit = () => (
  <section className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <FadeIn>
        <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-4">
          Who we partner with
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-16">
          Signal over noise.
        </h2>
      </FadeIn>
      <div className="grid md:grid-cols-2 gap-8">
        <FadeIn delay={0.05}>
          <div className="bg-card border border-border rounded-lg p-8">
            <h3 className="font-display text-xl font-bold text-foreground mb-6">
              Great for you if…
            </h3>
            <ul className="space-y-4">
              {good.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="font-mono text-sm text-foreground/70">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="bg-card border border-border rounded-lg p-8">
            <h3 className="font-display text-xl font-bold text-foreground mb-6">
              Probably not the right fit if…
            </h3>
            <ul className="space-y-4">
              {bad.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <X size={16} className="text-muted-foreground mt-0.5 shrink-0" />
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
