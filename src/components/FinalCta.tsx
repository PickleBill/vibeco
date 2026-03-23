import { useNavigate } from "react-router-dom";
import FadeIn from "./FadeIn";
import { Sparkles } from "lucide-react";

const FinalCta = () => {
  const navigate = useNavigate();

  return (
    <section
      className="py-32 border-t border-border"
      style={{ background: "radial-gradient(ellipse 60% 40% at 50% 100%, hsl(var(--primary) / 0.06), transparent)" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
        <FadeIn>
          <p className="font-mono text-xs text-primary tracking-[0.3em] uppercase mb-4">
            good vibes, instantly.
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-foreground mb-6">
            Let's bring yours to life.
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="font-mono text-base text-muted-foreground mb-10 max-w-md mx-auto">
            Your idea could be live before dinner. Not a wireframe — a real
            product your first customers can use tonight.
          </p>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate("/simulate")}
              className="group relative font-mono text-sm bg-primary text-primary-foreground px-10 py-4 rounded-sm hover:opacity-90 transition-all duration-300 inline-flex items-center gap-2"
              style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.2)" }}
            >
              <Sparkles size={14} />
              Simulate Your Idea
            </button>
            <button
              onClick={() => {
                const el = document.querySelector("#contact");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="font-mono text-sm border border-primary/40 text-primary px-8 py-4 rounded-sm hover:bg-primary/10 transition-all duration-300 inline-flex items-center gap-2"
            >
              Or Pitch It Directly →
            </button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};

export default FinalCta;
