import { useState } from "react";
import FadeIn from "./FadeIn";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const structures = [
  {
    value: "Revenue Share",
    label: "Revenue Share",
    desc: "We build it, you sell it. We earn as you earn. Zero upfront cost.",
  },
  {
    value: "Advisory Equity",
    label: "Advisory Equity",
    desc: "We invest our time for a small piece of the upside. Best for early-stage ideas with real potential.",
  },
  {
    value: "Hybrid",
    label: "Hybrid",
    desc: "A reduced build fee plus a smaller stake. Balances risk for both sides.",
  },
  {
    value: "Paid MVP Build",
    label: "Paid Build",
    desc: "Flat fee, fast timeline. You own 100%. Simple.",
  },
];

const ContactForm = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    idea: "",
    structure: "Revenue Share",
  });
  const [activeStructure, setActiveStructure] = useState(0);

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await (supabase.from as any)("contact_submissions").insert({
        name: form.name.trim(),
        email: form.email.trim(),
        idea: form.idea.trim(),
        structure: form.structure,
      });
      if (error) throw error;
      toast.success("Submitted. Most ideas get a response within 24 hours.");
      setForm({ name: "", email: "", idea: "", structure: "Revenue Share" });
      setActiveStructure(0);
    } catch (err) {
      console.error("Contact form error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-secondary border border-border rounded-sm px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors";

  return (
    <section id="contact" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-2xl mx-auto">
          <FadeIn>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-4">
              Tell us your idea.
            </h2>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-10">
              Most ideas get a response within 24 hours.
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

              <textarea
                placeholder="What's the idea? What problem does it solve, and for whom?"
                required
                rows={4}
                value={form.idea}
                onChange={(e) => update("idea", e.target.value)}
                className={inputClass + " resize-none"}
                aria-label="Your idea"
              />

              {/* Structure selector */}
              <div>
                <label className="font-mono text-sm text-muted-foreground mb-3 flex items-center gap-1.5">
                  Preferred partnership structure
                  <Info size={14} className="text-primary/50" />
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {structures.map((s, i) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        setActiveStructure(i);
                        update("structure", s.value);
                      }}
                      className={`relative font-mono text-xs px-3 py-2.5 rounded-sm border transition-all duration-300 text-center ${
                        activeStructure === i
                          ? "border-primary/50 bg-primary/10 text-primary glow-accent-subtle"
                          : "border-border bg-secondary text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-secondary/50 border border-border rounded-sm">
                  <p className="font-mono text-xs text-foreground/70 leading-relaxed">
                    {structures[activeStructure].desc}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full font-mono text-sm bg-primary text-primary-foreground px-6 py-3 rounded-sm hover:opacity-90 hover:glow-accent transition-all duration-300 disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Submit →"}
              </button>
            </form>
          </FadeIn>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
