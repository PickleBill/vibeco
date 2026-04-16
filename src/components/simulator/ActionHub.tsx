import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  MessageSquare,
  Palette,
  TestTube,
  RefreshCw,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { copyToClipboard } from "@/lib/copyToClipboard";
import type { BriefData } from "./SimulatorShell";

interface Props {
  brief: BriefData;
  idea: string;
  lovablePrompt?: string | null;
  reportId?: string | null;
  onIterate: () => void;
}

interface GeneratedPrompt {
  platform: string;
  prompt: string;
  description: string;
}

const ActionHub = ({ brief, idea, lovablePrompt, reportId, onIterate }: Props) => {
  const navigate = useNavigate();
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [altPrompts, setAltPrompts] = useState<Record<string, GeneratedPrompt>>({});
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  const builderIntent = brief.builder_intent || "venture";
  const scaleAssessment = brief.scale_assessment;

  const handleCopy = async (text: string, key: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedAction(key);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedAction(null), 2000);
    }
  };

  const handleGenerateAltPrompt = async (promptType: string) => {
    if (altPrompts[promptType]) {
      setExpandedAction(expandedAction === promptType ? null : promptType);
      return;
    }

    setGenerating(promptType);
    setExpandedAction(promptType);
    try {
      const { data, error } = await supabase.functions.invoke("generate-alt-prompt", {
        body: {
          brief,
          idea,
          prompt_type: promptType,
          lovable_prompt: lovablePrompt,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAltPrompts((prev) => ({ ...prev, [promptType]: data }));

      // Persist to report if available
      if (reportId) {
        try {
          const { data: report } = await (supabase.from("idea_reports") as any)
            .select("alt_prompts")
            .eq("id", reportId)
            .single();
          const existing = Array.isArray(report?.alt_prompts) ? report.alt_prompts : [];
          await (supabase.from("idea_reports") as any)
            .update({
              alt_prompts: [...existing, { type: promptType, ...data, generated_at: new Date().toISOString() }],
            })
            .eq("id", reportId);
        } catch (err) {
          console.error("Failed to save alt prompt:", err);
        }
      }
    } catch (e) {
      console.error("Alt prompt error:", e);
      toast.error("Failed to generate prompt. Try again.");
      setExpandedAction(null);
    } finally {
      setGenerating(null);
    }
  };

  // Contextual ordering based on builder intent
  const actions = [
    {
      id: "lovable",
      label: "Build in Lovable",
      description: "Paste this prompt to generate your app",
      icon: Rocket,
      priority: builderIntent === "fun" || builderIntent === "community" ? 1 : 2,
      action: () => {
        if (lovablePrompt) handleCopy(lovablePrompt, "lovable");
      },
      available: !!lovablePrompt,
      accentClass: "border-primary/30 hover:border-primary/60",
      iconClass: "text-primary",
    },
    {
      id: "research",
      label: "Research Prompt",
      description: "Deep-dive prompt for ChatGPT or Claude",
      icon: MessageSquare,
      priority: builderIntent === "venture" ? 1 : 3,
      action: () => handleGenerateAltPrompt("research"),
      available: true,
      accentClass: "border-emerald-500/20 hover:border-emerald-500/40",
      iconClass: "text-emerald-400",
    },
    {
      id: "design",
      label: "Design Brief",
      description: "Impeccable-quality UI spec for your build",
      icon: Palette,
      priority: 3,
      action: () => handleGenerateAltPrompt("design_brief"),
      available: true,
      accentClass: "border-violet-500/20 hover:border-violet-500/40",
      iconClass: "text-violet-400",
    },
    {
      id: "landing",
      label: "Landing Page Test",
      description: "Validate demand before building the full product",
      icon: TestTube,
      priority: builderIntent === "experiment" ? 1 : 4,
      action: () => handleGenerateAltPrompt("landing_page"),
      available: true,
      accentClass: "border-amber-500/20 hover:border-amber-500/40",
      iconClass: "text-amber-400",
    },
    {
      id: "iterate",
      label: "Iterate on This",
      description: "Re-enter the simulator with everything you've learned",
      icon: RefreshCw,
      priority: 5,
      action: onIterate,
      available: true,
      accentClass: "border-border/40 hover:border-foreground/30",
      iconClass: "text-muted-foreground",
    },
  ]
    .filter((a) => a.available)
    .sort((a, b) => a.priority - b.priority);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">
          What's Next?
        </h3>
        <span className="text-[10px] text-muted-foreground">
          {actions.length} actions available
        </span>
      </div>

      {scaleAssessment && !scaleAssessment.fits_intent && (
        <div className="px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs text-amber-400">
            ⚠ {scaleAssessment.recommendation}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const isGenerating = generating === action.id;
          const isCopied = copiedAction === action.id;
          const isExpanded = expandedAction === action.id;
          const promptData = altPrompts[action.id];

          return (
            <div key={action.id}>
              <button
                onClick={action.action}
                disabled={isGenerating}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 text-left group ${action.accentClass} ${
                  isGenerating ? "opacity-70" : ""
                }`}
              >
                {isGenerating ? (
                  <Loader2 size={16} className={`${action.iconClass} animate-spin shrink-0`} />
                ) : isCopied ? (
                  <Check size={16} className="text-primary shrink-0" />
                ) : (
                  <Icon size={16} className={`${action.iconClass} shrink-0`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    {action.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {isGenerating ? "Generating..." : action.description}
                  </p>
                </div>
                <ChevronRight
                  size={14}
                  className={`text-muted-foreground/30 group-hover:text-muted-foreground transition-all ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {isExpanded && promptData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 p-3 rounded-lg bg-muted/20 border border-border/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {promptData.platform} prompt
                        </span>
                        <button
                          onClick={() => handleCopy(promptData.prompt, action.id)}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedAction === action.id ? (
                            <Check size={10} className="text-primary" />
                          ) : (
                            <Copy size={10} />
                          )}
                          {copiedAction === action.id ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        {promptData.description}
                      </p>
                      <div className="max-h-32 overflow-y-auto">
                        <pre className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                          {promptData.prompt}
                        </pre>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ActionHub;
