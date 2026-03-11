import { motion } from "framer-motion";
import {
  AlertTriangle,
  Users,
  Layers,
  DollarSign,
  TrendingUp,
  Eye,
  MessageSquare,
} from "lucide-react";
import type { BriefData } from "./SimulatorShell";

interface Props {
  brief: BriefData;
  round: number;
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

const IdeaBrief = ({ brief, round }: Props) => (
  <div className="mb-12">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-8"
    >
      <h2 className="font-display text-2xl sm:text-3xl font-black text-foreground">
        {round <= 1 ? "Your Idea, Analyzed" : `Refined Brief — Round ${round}`}
      </h2>
      <p className="font-mono text-xs text-muted-foreground mt-2">
        {round <= 1
          ? "Here's what we see. Answer the questions below to go deeper."
          : "Sharper now. Keep refining or lock it in."}
      </p>
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
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="p-5 rounded-lg bg-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <Icon size={16} className="text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wide">
                {section.label}
              </h3>
            </div>
            {section.key === "core_features" && Array.isArray(value) ? (
              <div className="grid gap-2">
                {(value as BriefData["core_features"]).map((feat, fi) => (
                  <div key={fi} className="flex gap-2">
                    <span className="font-mono text-xs text-primary font-bold mt-0.5">
                      {fi + 1}.
                    </span>
                    <div>
                      <span className="font-mono text-sm text-foreground/90 font-semibold">
                        {feat.name}
                      </span>
                      <span className="font-mono text-sm text-muted-foreground">
                        {" "}— {feat.description}
                      </span>
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
