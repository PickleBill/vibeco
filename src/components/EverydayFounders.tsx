import FadeIn from "./FadeIn";
import { Home, Scissors, Dumbbell, Briefcase } from "lucide-react";

const personas = [
  {
    icon: Home,
    title: "Real Estate Agent",
    desc: "Build a client matching tool, automated follow-ups, or a neighborhood insights dashboard — live by tomorrow.",
  },
  {
    icon: Scissors,
    title: "Lawn Care / Service Pro",
    desc: "Automate scheduling, route planning, invoicing — and stop losing jobs to missed calls. Built in hours.",
  },
  {
    icon: Dumbbell,
    title: "Fitness Coach",
    desc: "Create a personalized training app, meal tracker, or client progress portal — your clients use it tonight.",
  },
  {
    icon: Briefcase,
    title: "Consultant / Expert",
    desc: "Turn your methodology into a SaaS product — capture recurring revenue from your expertise. No code needed.",
  },
];

const EverydayFounders = () => (
  <section id="everyday" className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <div className="max-w-3xl mb-16">
        <FadeIn>
          <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-4">
            Not just for tech founders
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-6">
            You don't need to code. You need to care.
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="font-mono text-base text-foreground/80 leading-relaxed">
            The best products come from people who are obsessed with a problem —
            not people who know React. Bring the obsession. We'll handle the rest
            in hours, not months.
          </p>
        </FadeIn>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {personas.map((p, i) => (
          <FadeIn key={p.title} delay={i * 0.08}>
            <div className="group bg-card border border-border rounded-lg p-8 hover:border-primary/30 hover:glow-accent-subtle transition-all duration-300">
              <p.icon
                size={24}
                className="text-primary mb-4 group-hover:scale-110 transition-transform duration-300"
              />
              <h3 className="font-display text-xl font-bold text-foreground mb-3">
                {p.title}
              </h3>
              <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                {p.desc}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.4}>
        <div className="mt-12 text-center">
          <p className="font-mono text-sm text-muted-foreground mb-6">
            You don't need a pitch deck. You just need a real problem and the
            guts to test a solution.
          </p>
          <a
            href="#contact"
            className="font-mono text-sm bg-primary text-primary-foreground px-8 py-3 rounded-sm hover:opacity-90 transition-opacity inline-block"
          >
            Tell Us Your Idea
          </a>
        </div>
      </FadeIn>
    </div>
  </section>
);

export default EverydayFounders;
