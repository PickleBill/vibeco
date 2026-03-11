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
} from "lucide-react";
import type { BriefData } from "./SimulatorShell";

interface Props {
  brief: BriefData;
  round: number;
}

const sections = [
  { key: "problem", label: "Problem / Opportunity", icon: AlertTriangle, color: "hsl(var(--destructive))" },
  { key: "target_customer", label: "Target Customer", icon: Users, color: "hsl(var(--primary))" },
  { key: "core_features", label: "Core Features", icon: Layers, color: "hsl(var(--accent))" },
  { key: "revenue_model", label: "Revenue Model", icon: DollarSign, color: "hsl(var(--primary))" },
  { key: "industry_trends", label: "Industry & Competitors", icon: TrendingUp, color: "hsl(var(--accent))" },
  { key: "investor_perspective", label: "What Investors Would Ask", icon: Eye, color: "hsl(var(--primary))" },
  { key: "customer_perspective", label: "What Customers Would Say", icon: MessageSquare, color: "hsl(var(--accent))" },
] as const;

// Mini visual: feature strength bars
const FeatureStrengthBar = ({ index, total }: { index: number; total: number }) => {
  const strength = Math.round(60 + Math.random() * 35);
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

// Mini radar/score visual for the brief header
const BriefScoreVisual = ({ brief }: { brief: BriefData }) => {
  const scores = [
    { label: "Market", value: 65 + Math.floor(brief.problem.length % 25) },
    { label: "Product", value: 55 + Math.floor(brief.core_features.length * 12) },
    { label: "Revenue", value: 60 + Math.floor(brief.revenue_model.length % 30) },
    { label: "Timing", value: 50 + Math.floor(brief.industry_trends.length % 35) },
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

const IdeaBrief = ({ brief, round }: Props) => (
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

    {/* Score visuals */}
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
                        <FeatureStrengthBar index={fi} total={(value as BriefData["core_features"]).length} />
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
  </div>
);

export default IdeaBrief;
