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
  Target,
  Zap,
  ImageIcon,
  Mail,
  Sparkles,
} from "lucide-react";
import type { BriefData } from "./SimulatorShell";

interface Props {
  brief: BriefData;
  round: number;
  conceptImage?: string | null;
  unlocked?: boolean;
  onUnlock?: (email: string) => void;
}

const sections = [
  { key: "problem", label: "Problem / Opportunity", icon: AlertTriangle },
  { key: "target_customer", label: "Target Customer", icon: Users },
  { key: "core_features", label: "Core Features", icon: Layers },
  { key: "revenue_model", label: "Revenue Model", icon: DollarSign },
  { key: "industry_trends", label: "Industry & Competitors", icon: TrendingUp },
  { key: "investor_perspective", label: "What Investors Would Ask", icon: Eye },
  { key: "customer_perspective", label: "What Customers Would Say", icon: MessageSquare },
] as const;

const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const FeatureStrengthBar = ({ name, index }: { name: string; index: number }) => {
  const strength = 60 + (hashStr(name + index) % 35);
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary/60"
          initial={{ width: 0 }}
          animate={{ width: `${strength}%` }}
          transition={{ delay: 0.3 + index * 0.15, duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="font-mono text-[9px] text-muted-foreground/60 w-8 text-right">{strength}%</span>
    </div>
  );
};

const BriefScoreVisual = ({ brief }: { brief: BriefData }) => {
  const scores = [
    { label: "Market", value: 60 + (hashStr(brief.problem) % 30) },
    { label: "Product", value: 55 + (hashStr(JSON.stringify(brief.core_features)) % 35) },
    { label: "Revenue", value: 60 + (hashStr(brief.revenue_model) % 30) },
    { label: "Timing", value: 50 + (hashStr(brief.industry_trends) % 35) },
  ];

  return (
    <div className="flex items-center gap-6 justify-center py-4">
      {scores.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="relative w-12 h-12">
            <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="2.5"
              />
              <motion.path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                strokeDasharray={`${s.value}, 100`}
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${s.value}, 100` }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.8, ease: "easeOut" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold text-foreground">
              {s.value}
            </span>
          </div>
          <span className="font-mono text-[9px] text-muted-foreground">{s.label}</span>
        </motion.div>
      ))}
    </div>
  );
};

/* Progressive email unlock banner */
const EmailUnlockBanner = ({
  round,
  onUnlock,
}: {
  round: number;
  onUnlock: (email: string) => void;
}) => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSubmitting(true);
    onUnlock(email);
  };

  // Round 1: subtle link-style. Round 2+: more prominent card.
  const isProminent = round >= 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className={`mt-8 rounded-lg border transition-all ${
        isProminent
          ? "p-5 border-primary/30 bg-primary/5"
          : "p-4 border-border/30 bg-card/30"
      }`}
      style={isProminent ? { boxShadow: "0 0 24px hsl(var(--primary) / 0.1)" } : {}}
    >
      <div className="flex items-center gap-2 mb-2">
        {isProminent ? (
          <Sparkles size={14} className="text-primary" />
        ) : (
          <Mail size={12} className="text-muted-foreground" />
        )}
        <span className={`font-mono text-xs ${isProminent ? "text-primary font-bold" : "text-muted-foreground"}`}>
          {isProminent
            ? "Save your progress & unlock the full report"
            : "Want to save this analysis?"}
        </span>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-3 py-2 rounded-sm bg-background/50 border border-border/50 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground font-mono text-xs px-4 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Mail size={12} />
          {isProminent ? "Unlock" : "Save"}
        </button>
      </form>
    </motion.div>
  );
};

const IdeaBrief = ({ brief, round, conceptImage, unlocked, onUnlock }: Props) => (
  <div className="mb-12">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-6"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
        <Target size={12} className="text-primary" />
        <span className="font-mono text-[10px] text-primary uppercase tracking-wider">
          {round <= 1 ? "Initial Analysis" : `Refined · Round ${round}`}
        </span>
      </div>
      <h2 className="font-display text-2xl sm:text-3xl font-black text-foreground">
        {round <= 1 ? "Your Idea, Analyzed" : `Deeper Insights — Round ${round}`}
      </h2>
      <p className="font-mono text-xs text-muted-foreground mt-2">
        {round <= 1
          ? "Here's what we see. Answer the questions above to go deeper."
          : "Sharper analysis based on your choices. Keep refining above."}
      </p>
    </motion.div>

    {conceptImage && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-8 rounded-lg overflow-hidden border border-border/30"
        style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.1)" }}
      >
        <div className="relative">
          <img
            src={conceptImage}
            alt="AI-generated concept visualization"
            className="w-full h-48 sm:h-64 object-cover"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-background/80 backdrop-blur-sm">
            <ImageIcon size={10} className="text-primary" />
            <span className="font-mono text-[9px] text-muted-foreground">AI Concept Art</span>
          </div>
        </div>
      </motion.div>
    )}

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="mb-8 p-4 rounded-lg bg-card/40 border border-border/30"
    >
      <p className="font-mono text-[10px] text-muted-foreground text-center mb-2 uppercase tracking-wider">
        Idea Viability Snapshot
      </p>
      <BriefScoreVisual brief={brief} />
    </motion.div>

    <div className="grid gap-4">
      {sections.map((section, i) => {
        const Icon = section.icon;
        const value = brief[section.key as keyof BriefData];

        return (
          <motion.div
            key={section.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
            className="group p-5 rounded-lg bg-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:bg-card/80"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Icon size={14} className="text-primary" />
              </div>
              <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wide">
                {section.label}
              </h3>
              {section.key === "target_customer" && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 font-mono text-[9px] text-accent">
                  Persona
                </span>
              )}
            </div>
            {section.key === "core_features" && Array.isArray(value) ? (
              <div className="grid gap-3">
                {(value as BriefData["core_features"]).map((feat, fi) => (
                  <div key={fi}>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap size={10} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <span className="font-mono text-sm text-foreground/90 font-semibold">
                          {feat.name}
                        </span>
                        <span className="font-mono text-sm text-muted-foreground">
                          {" "}— {feat.description}
                        </span>
                        <FeatureStrengthBar name={feat.name} index={fi} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-mono text-sm text-foreground/80 leading-relaxed">
                {value as string}
              </p>
            )}
          </motion.div>
        );
      })}
    </div>

    {/* Progressive email unlock banner */}
    {!unlocked && onUnlock && (
      <EmailUnlockBanner round={round} onUnlock={onUnlock} />
    )}
  </div>
);

export default IdeaBrief;
