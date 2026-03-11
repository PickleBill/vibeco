import { useState } from "react";
import FadeIn from "./FadeIn";
import { toast } from "sonner";

const ContactForm = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    problem: "",
    whyNow: "",
    distribution: "",
    structure: "Revenue Share",
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Submitted. We'll review and follow up if there's a fit.");
    setForm({
      name: "",
      email: "",
      company: "",
      problem: "",
      whyNow: "",
      distribution: "",
      structure: "Revenue Share",
    });
  };

  const inputClass =
    "w-full bg-secondary border border-border rounded-sm px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors";

  return (
    <section id="contact" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-2xl mx-auto">
          <FadeIn>
            <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-4">
              Get in touch
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-4">
              Have a real wedge? Let's talk.
            </h2>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-12">
              We review selectively. The best fits are domain experts with urgency,
              distribution, and a credible monetization path.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <input
                  type="text"
                  placeholder="Name"
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={inputClass}
                  aria-label="Name"
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className={inputClass}
                  aria-label="Email"
                />
              </div>
              <input
                type="text"
                placeholder="Company / Idea Name"
                required
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                className={inputClass}
                aria-label="Company or Idea Name"
              />
              <textarea
                placeholder="What problem are you solving?"
                required
                rows={3}
                value={form.problem}
                onChange={(e) => update("problem", e.target.value)}
                className={inputClass + " resize-none"}
                aria-label="What problem are you solving"
              />
              <textarea
                placeholder="Why now?"
                rows={2}
                value={form.whyNow}
                onChange={(e) => update("whyNow", e.target.value)}
                className={inputClass + " resize-none"}
                aria-label="Why now"
              />
              <textarea
                placeholder="What distribution edge do you have?"
                rows={2}
                value={form.distribution}
                onChange={(e) => update("distribution", e.target.value)}
                className={inputClass + " resize-none"}
                aria-label="Distribution edge"
              />
              <div>
                <label className="font-mono text-xs text-muted-foreground mb-2 block">
                  Preferred structure
                </label>
                <select
                  value={form.structure}
                  onChange={(e) => update("structure", e.target.value)}
                  className={inputClass + " appearance-none cursor-pointer"}
                  aria-label="Preferred structure"
                >
                  <option>Revenue Share</option>
                  <option>Advisory Equity</option>
                  <option>Hybrid</option>
                  <option>Paid MVP Build</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full font-mono text-sm bg-primary text-primary-foreground px-6 py-3 rounded-sm hover:opacity-90 transition-opacity"
              >
                Pitch Your Idea
              </button>
            </form>
          </FadeIn>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
