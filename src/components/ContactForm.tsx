import { useState } from "react";
import FadeIn from "./FadeIn";
import { toast } from "sonner";
import { Info, Upload } from "lucide-react";

const structures = [
  {
    value: "Revenue Share",
    label: "Revenue Share",
    desc: "We build it, you sell it. We take a percentage of first-year ARR as the product grows. Zero upfront cost.",
  },
  {
    value: "Advisory Equity",
    label: "Advisory Equity",
    desc: "We contribute build hours in exchange for 0.5–2% advisory equity. Best for early-stage founders with strong conviction.",
  },
  {
    value: "Hybrid",
    label: "Hybrid",
    desc: "A reduced build fee ($0–$3k) plus a smaller equity or revenue share. Balances risk with sustainable engagement.",
  },
  {
    value: "Paid MVP Build",
    label: "Paid Build",
    desc: "Flat-fee engagement for founders who want speed and quality without equity dilution. Scope-locked, timeline-driven.",
  },
];

const ContactForm = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    idea: "",
    whyNow: "",
    distribution: "",
    structure: "Revenue Share",
  });
  const [activeStructure, setActiveStructure] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Submitted. We review selectively — top fits hear back within 3 business days.");
    setForm({ name: "", email: "", idea: "", whyNow: "", distribution: "", structure: "Revenue Share" });
    setActiveStructure(0);
    setFileName(null);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : null);
  };

  const inputClass =
    "w-full bg-secondary border border-border rounded-sm px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors";

  return (
    <section id="contact" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-2xl mx-auto">
          <FadeIn>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-4">
              Pitch your idea.
            </h2>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-10">
              We review selectively. Top fits respond within 3 business days.
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
                placeholder="Company or idea — what are you building and for whom?"
                required
                rows={3}
                value={form.idea}
                onChange={(e) => update("idea", e.target.value)}
                className={inputClass + " resize-none"}
                aria-label="Company or idea"
              />

              <textarea
                placeholder="Why now? What makes this the right moment?"
                required
                rows={2}
                value={form.whyNow}
                onChange={(e) => update("whyNow", e.target.value)}
                className={inputClass + " resize-none"}
                aria-label="Why now"
              />

              <input
                type="text"
                placeholder="Distribution edge — how will early users find this?"
                required
                value={form.distribution}
                onChange={(e) => update("distribution", e.target.value)}
                className={inputClass}
                aria-label="Distribution edge"
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
                  <p className="font-mono text-xs text-foreground/60 leading-relaxed">
                    {structures[activeStructure].desc}
                  </p>
                </div>
              </div>

              {/* Optional file upload */}
              <div>
                <label
                  htmlFor="file-upload"
                  className="flex items-center gap-2 font-mono text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                >
                  <Upload size={14} />
                  {fileName || "Attach a one-pager (optional)"}
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full font-mono text-sm bg-primary text-primary-foreground px-6 py-3 rounded-sm hover:opacity-90 hover:glow-accent transition-all duration-300"
              >
                Submit Application →
              </button>
            </form>
          </FadeIn>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
