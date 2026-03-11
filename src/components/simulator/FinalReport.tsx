import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Users,
  Layers,
  DollarSign,
  TrendingUp,
  Eye,
  MessageSquare,
  Mail,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import type { BriefData } from "./SimulatorShell";

interface Props {
  brief: BriefData;
  idea: string;
  onRestart: () => void;
}

const sectionMeta = [
  { key: "problem", label: "Problem / Opportunity", icon: AlertTriangle },
  { key: "target_customer", label: "Target Customer", icon: Users },
  { key: "core_features", label: "Core Features", icon: Layers },
  { key: "revenue_model", label: "Revenue Model", icon: DollarSign },
  { key: "industry_trends", label: "Industry & Competitors", icon: TrendingUp },
  { key: "investor_perspective", label: "Investor Perspective & Next Steps", icon: Eye },
  { key: "customer_perspective", label: "Customer Perspective", icon: MessageSquare },
] as const;

const FinalReport = ({ brief, idea, onRestart }: Props) => {
  const [email, setEmail] = useState("");
  const [showReport, setShowReport] = useState(false);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setShowReport(true);
    toast.success("You're in! Here's your full report.");
  };

  return (
    <div className="py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <p className="font-mono text-sm text-primary uppercase tracking-widest mb-3">
          Simulation Complete
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-3">
          Your Breakout Idea
        </h2>
        <p className="font-mono text-xs text-muted-foreground max-w-md mx-auto">
          Three rounds of refinement distilled into one actionable summary.
        </p>
      </motion.div>

      {!showReport ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-md mx-auto"
        >
          {/* Teaser */}
          <div className="p-6 rounded-lg bg-card/60 backdrop-blur-sm border border-primary/30 mb-6"
            style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.1)" }}
          >
            <p className="font-mono text-sm text-foreground/80 mb-4 leading-relaxed">
              <span className="text-primary font-bold">"{idea.slice(0, 80)}..."</span>
              <br /><br />
              We've analyzed your idea across 7 dimensions and refined it through strategic questioning.
              Your full report is ready.
            </p>
          </div>

          <form onSubmit={handleEmailSubmit}>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-sm bg-card/40 border border-border/50 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
              <button
                type="submit"
                className="flex items-center gap-2 bg-primary text-primary-foreground font-mono text-sm px-5 py-3 rounded-sm hover:opacity-90 transition-opacity"
              >
                <Mail size={14} />
                Unlock
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <a
              href="#contact"
              className="font-mono text-xs text-primary hover:underline"
            >
              Or talk to us about building this →
            </a>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className="p-px rounded-lg mb-8"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.4), hsl(var(--accent) / 0.2))",
            }}
          >
            <div className="p-8 rounded-lg bg-background">
              <div className="grid gap-6">
                {sectionMeta.map((section, i) => {
                  const Icon = section.icon;
                  const value = brief[section.key as keyof BriefData];
                  return (
                    <motion.div
                      key={section.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className="text-primary" />
                        <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wide">
                          {section.label}
                        </h4>
                      </div>
                      {section.key === "core_features" && Array.isArray(value) ? (
                        <div className="grid gap-1.5 ml-5">
                          {(value as BriefData["core_features"]).map((feat, fi) => (
                            <p key={fi} className="font-mono text-sm text-foreground/80">
                              <span className="text-primary font-bold">{fi + 1}.</span>{" "}
                              <span className="font-semibold">{feat.name}</span> — {feat.description}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="font-mono text-sm text-foreground/80 leading-relaxed ml-5">
                          {value as string}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="#contact"
              className="font-mono text-sm bg-primary text-primary-foreground px-6 py-3 rounded-sm hover:opacity-90 transition-opacity inline-block"
            >
              Let's Build This →
            </a>
            <button
              onClick={onRestart}
              className="flex items-center gap-2 font-mono text-sm border border-border text-foreground px-6 py-3 rounded-sm hover:border-primary/50 transition-colors"
            >
              <RotateCcw size={14} />
              Simulate Another Idea
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default FinalReport;
