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
  type LucideIcon,
} from "lucide-react";
import { Mail, Sparkles } from "lucide-react";
import type { BriefData } from "./SimulatorShell";

interface Props {
  brief: BriefData;
  round: number;
  conceptImage?: string | null;
  unlocked?: boolean;
  onUnlock?: (email: string) => void;
  highlights?: Set<string>;
  onToggleHighlight?: (key: string) => void;
  antiHighlights?: Set<string>;
  onToggleAntiHighlight?: (key: string) => void;
}

const HERO_KEYS = ["problem", "core_features"] as const;
const TENSION_KEYS = ["investor_perspective", "customer_perspective"] as const;
const SUPPORT_KEYS = ["target_customer", "revenue_model", "industry_trends"] as const;

const labels: Record<string, string> = {
  problem: "Problem / Opportunity",
  target_customer: "Target Customer",
  core_features: "Core Features",
  revenue_model: "Revenue Model",
  industry_trends: "Industry & Competitors",
  investor_perspective: "What Investors Would Ask",
  customer_perspective: "What Customers Would Say",
};

const icons: Record<string, LucideIcon> = {
  problem: AlertTriangle,
  target_customer: Users,
  core_features: Layers,
  revenue_model: DollarSign,
  industry_trends: TrendingUp,
  investor_perspective: Eye,
  customer_perspective: MessageSquare,
};

const intentLabels: Record<string, string> = {
  experiment: "🧪 Quick experiment",
  community: "👥 Community project",
  "lead-magnet": "🎯 Lead generation",
  lifestyle: "☀️ Lifestyle business",
  venture: "🚀 Venture-scale startup",
  fun: "🎮 Just for fun",
};

/* ----------------------------- Helpers ----------------------------- */

const HighlightChips = ({
  sectionKey,
  isHighlighted,
  isAntiHighlighted,
  onToggleHighlight,
  onToggleAntiHighlight,
  compact,
}: {
  sectionKey: string;
  isHighlighted: boolean;
  isAntiHighlighted: boolean;
  onToggleHighlight?: (k: string) => void;
  onToggleAntiHighlight?: (k: string) => void;
  compact?: boolean;
}) => {
  if (!onToggleHighlight) return null;
  const sz = compact ? 9 : 10;
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onToggleHighlight(sectionKey)}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] transition-all ${
          isHighlighted
            ? "bg-primary/20 text-primary border border-primary/30"
            : "bg-muted/30 text-muted-foreground/60 border border-transparent hover:text-primary hover:bg-primary/10"
        }`}
      >
        <Sparkles size={sz} className={isHighlighted ? "fill-primary" : ""} />
        {isHighlighted ? "Resonates" : "This resonates"}
      </button>
      {onToggleAntiHighlight && (
        <button
          onClick={() => onToggleAntiHighlight(sectionKey)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-all ${
            isAntiHighlighted
              ? "bg-destructive/15 border border-destructive/40 text-destructive"
              : "border border-border/50 text-muted-foreground/60 hover:border-destructive/30 hover:text-destructive/80"
          }`}
        >
          ✕ {isAntiHighlighted ? "Flagged" : "Not quite"}
        </button>
      )}
    </div>
  );
};

/* ----------------------------- Email banner ----------------------------- */

const EmailUnlockBanner = ({
  round,
  onUnlock,
}: {
  round: number;
  onUnlock: (email: string) => void;
}) => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isProminent = round >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSubmitting(true);
    onUnlock(email);
  };

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
      <div className="flex items-center gap-2 mb-1.5">
        {isProminent ? (
          <Sparkles size={14} className="text-primary" />
        ) : (
          <Mail size={12} className="text-muted-foreground" />
        )}
        <span className={`text-xs ${isProminent ? "text-primary font-bold" : "text-muted-foreground"}`}>
          {isProminent ? "Unlock your build prompt" : "Save this analysis"}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground/70 mb-3 leading-relaxed">
        {isProminent
          ? "Your personalized build prompt, PDF export, and a shareable link — all yours."
          : "Save progress, export PDF, and share via link."}
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-3 py-2 rounded-sm bg-background/50 border border-border/50 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs px-4 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Mail size={12} />
          {isProminent ? "Unlock" : "Save"}
        </button>
      </form>
    </motion.div>
  );
};

/* ============================== Main ============================== */

const IdeaBrief = ({
  brief,
  round,
  conceptImage,
  highlights,
  onToggleHighlight,
  antiHighlights,
  onToggleAntiHighlight,
}: Props) => {
  const isHighlighted = (k: string) => !!highlights?.has(k);
  const isAnti = (k: string) => !!antiHighlights?.has(k);

  return (
    <div className="mb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Target size={12} className="text-primary" />
          <span className="text-[10px] text-primary uppercase tracking-wider">
            {round <= 1 ? "Initial Analysis" : `Refined · Round ${round}`}
          </span>
        </div>

        {brief.builder_intent && (
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[11px] text-accent">
              Building for: {intentLabels[brief.builder_intent] || brief.builder_intent}
            </span>
          </div>
        )}

        <h2 className="font-display text-2xl sm:text-3xl font-black text-foreground break-words">
          {round <= 1 ? "Your Idea, Analyzed" : `Deeper Insights — Round ${round}`}
        </h2>
        <p className="text-xs text-muted-foreground mt-2">
          {round <= 1
            ? "Here's what we found. Answer questions to go deeper."
            : "Updated based on your input. Keep refining or skip to your report."}
        </p>
        {highlights && highlights.size > 0 && (
          <p className="text-[10px] text-primary/70 mt-1">
            ✦ {highlights.size} area{highlights.size > 1 ? "s" : ""} highlighted — these will shape your final prompt
          </p>
        )}
      </motion.div>

      {/* Scale assessment callout */}
      {brief.scale_assessment && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className={`mb-6 p-4 rounded-lg border ${
            brief.scale_assessment.fits_intent
              ? "border-primary/30 bg-primary/5"
              : "border-warning/30 bg-warning/5"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
              brief.scale_assessment.fits_intent
                ? "bg-primary/15 text-primary"
                : "bg-warning/15 text-warning"
            }`}>
              {brief.scale_assessment.fits_intent ? "✓" : "⚖️"}
            </div>
            <div>
              <p className={`text-xs font-bold ${
                brief.scale_assessment.fits_intent ? "text-primary" : "text-warning"
              }`}>
                Scale: {brief.scale_assessment.current_scale.charAt(0).toUpperCase() + brief.scale_assessment.current_scale.slice(1)}
                {brief.scale_assessment.fits_intent ? " — matches your intent" : " — might not match your intent"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {brief.scale_assessment.recommendation}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Concept image */}
      {conceptImage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
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
              <span className="text-[9px] text-muted-foreground">AI Concept Art</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ============ TIER 1: HERO — Problem + Core Features ============ */}
      <div className="space-y-8 mb-12">
        {HERO_KEYS.map((key, i) => {
          const Icon = icons[key];
          const value = brief[key as keyof BriefData];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative pl-4 sm:pl-6 border-l-2 border-primary/30"
            >
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Icon size={18} className="text-primary" />
                  <h3 className="font-display text-base font-black text-foreground uppercase tracking-wide">
                    {labels[key]}
                  </h3>
                </div>
                <HighlightChips
                  sectionKey={key}
                  isHighlighted={isHighlighted(key)}
                  isAntiHighlighted={isAnti(key)}
                  onToggleHighlight={onToggleHighlight}
                  onToggleAntiHighlight={onToggleAntiHighlight}
                />
              </div>
              {key === "core_features" && Array.isArray(value) ? (
                <div className="grid gap-3">
                  {(value as BriefData["core_features"]).map((feat, fi) => (
                    <div key={fi} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Zap size={12} className="text-primary" />
                      </div>
                      <p className="text-base sm:text-lg text-foreground/90 leading-relaxed flex-1">
                        <span className="font-semibold text-foreground">{feat.name}</span>
                        <span className="text-muted-foreground"> — {feat.description}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-base sm:text-lg text-foreground/90 leading-relaxed">
                  {typeof value === "string" ? value : ""}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ============ TIER 2: TENSION — Investor vs Customer dialogue ============ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-12"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em]">
            Two voices in the room
          </span>
          <div className="flex-1 h-px bg-border/30" />
        </div>
        <div className="grid sm:grid-cols-2 gap-px bg-border/30 rounded-lg overflow-hidden">
          {TENSION_KEYS.map((key) => {
            const Icon = icons[key];
            const value = brief[key as keyof BriefData];
            const isInvestor = key === "investor_perspective";
            return (
              <div
                key={key}
                className={`relative p-5 bg-card/50 ${
                  isHighlighted(key) ? "ring-1 ring-inset ring-primary/40 bg-primary/5" : ""
                } ${isAnti(key) ? "ring-1 ring-inset ring-destructive/30 bg-destructive/5" : ""}`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={isInvestor ? "text-amber-400" : "text-emerald-400"} />
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                      isInvestor ? "text-amber-400/80" : "text-emerald-400/80"
                    }`}>
                      {isInvestor ? "Investor" : "Customer"}
                    </span>
                  </div>
                  <HighlightChips
                    sectionKey={key}
                    isHighlighted={isHighlighted(key)}
                    isAntiHighlighted={isAnti(key)}
                    onToggleHighlight={onToggleHighlight}
                    onToggleAntiHighlight={onToggleAntiHighlight}
                    compact
                  />
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed italic">
                  {typeof value === "string" ? `"${value}"` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ============ TIER 3: SUPPORTING — left-rule strip ============ */}
      <div className="space-y-4">
        {SUPPORT_KEYS.map((key, i) => {
          const Icon = icons[key];
          const value = brief[key as keyof BriefData];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`group relative pl-4 py-3 border-l transition-colors ${
                isHighlighted(key)
                  ? "border-primary/50"
                  : isAnti(key)
                  ? "border-destructive/40"
                  : "border-border/40 hover:border-primary/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-1.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <Icon size={12} className="text-muted-foreground" />
                  <h3 className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">
                    {labels[key]}
                  </h3>
                </div>
                <HighlightChips
                  sectionKey={key}
                  isHighlighted={isHighlighted(key)}
                  isAntiHighlighted={isAnti(key)}
                  onToggleHighlight={onToggleHighlight}
                  onToggleAntiHighlight={onToggleAntiHighlight}
                  compact
                />
              </div>
              <p className="text-sm text-foreground/75 leading-relaxed">
                {typeof value === "string" ? value : ""}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default IdeaBrief;
