import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  ListOrdered,
  Wand2,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BriefData } from "./SimulatorShell";

// ─── Types matching synthesize agent output ───

interface SynthesisTension {
  topic: string;
  positions: string[];
  resolution_suggestion: string;
  requires_human_decision: boolean;
}

interface SynthesisRecommendation {
  action: string;
  rationale: string;
  confidence: "high" | "medium" | "low";
  source_agents: string[];
}

export interface SynthesisData {
  consensus: string[];
  tensions: SynthesisTension[];
  confidence_score: number;
  ranked_recommendations: SynthesisRecommendation[];
  refined_brief_suggestions: string[];
  prompt_modifications: string[];
  executive_summary: string;
}

export interface OrchestrateResult {
  perspectives: unknown[];
  expansion: unknown;
  distillation: unknown;
  synthesis: SynthesisData | null;
  timing: Record<string, number>;
  agents_completed: number;
  agents_total: number;
}

interface Props {
  brief: BriefData;
  idea: string;
  reportId?: string | null;
  highlights?: Set<string>;
  antiHighlights?: Set<string>;
  lovablePrompt?: string | null;
  onPromptUpdate?: (prompt: string) => void;
}

const confidenceLabel = (n: number) => {
  if (n >= 80) return { label: "Strong consensus", color: "text-primary", bg: "bg-primary/10", ring: "ring-primary/30" };
  if (n >= 50) return { label: "Mixed signals", color: "text-warning", bg: "bg-warning/10", ring: "ring-warning/30" };
  return { label: "High tension", color: "text-destructive", bg: "bg-destructive/10", ring: "ring-destructive/30" };
};

const confChip = (c: "high" | "medium" | "low") => {
  if (c === "high") return "bg-primary/15 text-primary border-primary/30";
  if (c === "medium") return "bg-warning/10 text-warning border-warning/30";
  return "bg-muted/40 text-muted-foreground border-border/40";
};

const SynthesisPanel = ({ brief, idea, reportId, highlights, antiHighlights, lovablePrompt, onPromptUpdate }: Props) => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [agentStatus, setAgentStatus] = useState<Record<string, "pending" | "done">>({});
  const [result, setResult] = useState<OrchestrateResult | null>(null);
  const [mode, setMode] = useState<"fast" | "deep">("fast");
  const [applying, setApplying] = useState(false);
  const [showRecs, setShowRecs] = useState(true);
  const [showBriefSuggestions, setShowBriefSuggestions] = useState(false);

  // ─── Realtime: subscribe to agent_events for live progress ───
  useEffect(() => {
    if (!running || !reportId) return;

    const channel = supabase
      .channel(`agent-events-${reportId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_events", filter: `report_id=eq.${reportId}` },
        (payload) => {
          const ev = payload.new as { agent: string; event_type: string };
          if (ev.event_type === "completed" && ev.agent) {
            setAgentStatus((prev) => ({ ...prev, [ev.agent]: "done" }));
            setProgress((prev) => prev ? { ...prev, completed: prev.completed + 1 } : prev);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [running, reportId]);

  const runOrchestrate = async () => {
    setRunning(true);
    setResult(null);
    setAgentStatus({});
    setProgress({ completed: 0, total: 7 });

    try {
      const effectiveIdea = (idea && idea.trim()) || brief?.problem || "Untitled idea";
      const { data, error } = await supabase.functions.invoke("orchestrate", {
        body: {
          idea: effectiveIdea,
          brief,
          mode,
          report_id: reportId || undefined,
          highlights: highlights ? Array.from(highlights) : [],
          antiHighlights: antiHighlights ? Array.from(antiHighlights) : [],
        },
      });

      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      const r = data as OrchestrateResult;
      setResult(r);
      setProgress({ completed: r.agents_completed, total: r.agents_total });

      if (!r.synthesis) {
        toast.warning("Auto-Analyze finished but synthesis didn't complete. Try again or run agents individually.");
      } else {
        toast.success(`Auto-Analyze complete — ${r.agents_completed}/${r.agents_total} agents responded.`);
      }
    } catch (e) {
      console.error("Orchestrate error:", e);
      toast.error(e instanceof Error ? e.message : "Auto-Analyze failed.");
    } finally {
      setRunning(false);
    }
  };

  const handleApplyToPrompt = async () => {
    if (!result?.synthesis) return;
    setApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("refine-prompt", {
        body: {
          brief,
          idea,
          original_prompt: lovablePrompt || undefined,
          distillation: result.distillation,
          highlights: highlights ? Array.from(highlights) : [],
          antiHighlights: antiHighlights ? Array.from(antiHighlights) : [],
          refinement_context: [
            "AUTO-ANALYZE SYNTHESIS:",
            result.synthesis.executive_summary,
            "",
            "PROMPT MODIFICATIONS TO INCORPORATE:",
            ...result.synthesis.prompt_modifications.map((m, i) => `${i + 1}. ${m}`),
            "",
            "TOP RECOMMENDATIONS:",
            ...result.synthesis.ranked_recommendations
              .slice(0, 3)
              .map((r, i) => `${i + 1}. ${r.action} (${r.confidence} confidence)`),
          ].join("\n"),
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      const newPrompt = (data as { lovable_prompt?: string }).lovable_prompt;
      if (newPrompt && onPromptUpdate) {
        onPromptUpdate(newPrompt);
        toast.success("Prompt updated with synthesis insights.");
      } else {
        toast.warning("Refine returned no prompt — try again.");
      }
    } catch (e) {
      console.error("Apply to prompt error:", e);
      toast.error(e instanceof Error ? e.message : "Failed to apply synthesis to prompt.");
    } finally {
      setApplying(false);
    }
  };

  // ─── Empty state — invite the user to run Auto-Analyze ───

  if (!result && !running) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-foreground">Auto-Analyze</h3>
          <span className="text-[10px] text-muted-foreground">7 agents · 1 click</span>
        </div>

        <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="font-display text-sm font-bold text-foreground">Run all 7 agents in parallel</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Fires the 5 personas + Expand + Distill simultaneously, then a synthesis agent reads all their outputs
                  and produces consensus, tensions, and ranked recommendations.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <button
                  onClick={runOrchestrate}
                  className="flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Sparkles size={12} />
                  Run Auto-Analyze
                </button>

                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    onClick={() => setMode("fast")}
                    className={`px-2.5 py-1 rounded-full border transition-colors ${
                      mode === "fast"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/40 text-muted-foreground hover:border-border"
                    }`}
                  >
                    Quick (~30s)
                  </button>
                  <button
                    onClick={() => setMode("deep")}
                    className={`px-2.5 py-1 rounded-full border transition-colors ${
                      mode === "deep"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/40 text-muted-foreground hover:border-border"
                    }`}
                  >
                    Deep (~90s)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Running state ───

  if (running) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-foreground">Auto-Analyze</h3>
          <span className="text-[10px] text-muted-foreground">
            {mode === "deep" ? "Deep mode — 60-120s" : "Quick mode — 20-40s"}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-10 rounded-lg border border-border/30 bg-card/30">
          <Loader2 size={28} className="animate-spin text-primary mb-4" />
          <p className="text-sm text-foreground font-medium">Running 7 agents in parallel...</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Skeptic, Champion, Competitor, Customer, Builder, Expand, Distill → Synthesize
          </p>
        </div>
      </div>
    );
  }

  // ─── Result state ───

  const synthesis = result?.synthesis;

  if (!synthesis) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm text-warning font-medium">Synthesis didn't complete</p>
          <p className="text-xs text-muted-foreground mt-1">
            {result?.agents_completed ?? 0} of {result?.agents_total ?? 7} agents responded but synthesis failed. Try
            again.
          </p>
          <button
            onClick={runOrchestrate}
            className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const conf = confidenceLabel(synthesis.confidence_score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Header with confidence ring */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Synthesis</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {result.agents_completed}/{result.agents_total} agents · {(result.timing.total / 1000).toFixed(1)}s
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${conf.bg} ring-1 ${conf.ring}`}>
          <Gauge size={12} className={conf.color} />
          <span className={`text-xs font-bold ${conf.color}`}>{synthesis.confidence_score}</span>
          <span className="text-[10px] text-muted-foreground">{conf.label}</span>
        </div>
      </div>

      {/* Executive summary — the headline */}
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
        <p className="text-[10px] uppercase tracking-wider text-primary/80 font-semibold mb-2">Executive summary</p>
        <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground leading-relaxed">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
            }}
          >
            {synthesis.executive_summary}
          </ReactMarkdown>
        </div>
      </div>

      {/* Apply-to-prompt CTA */}
      {onPromptUpdate && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-lg border border-border/40 bg-card/40">
          <div className="flex-1">
            <p className="font-display text-sm font-bold text-foreground">Apply this synthesis to your prompt</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Re-runs the prompt refiner with the {synthesis.prompt_modifications.length} suggested modifications and
              top recommendations.
            </p>
          </div>
          <button
            onClick={handleApplyToPrompt}
            disabled={applying}
            className="flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
          >
            {applying ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
            {applying ? "Applying..." : lovablePrompt ? "Apply to prompt" : "Generate prompt"}
          </button>
        </div>
      )}

      {/* Consensus */}
      {synthesis.consensus.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-primary" />
            <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
              Consensus ({synthesis.consensus.length})
            </h4>
          </div>
          <ul className="space-y-2">
            {synthesis.consensus.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                <span className="text-primary mt-0.5">✓</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tensions */}
      {synthesis.tensions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-warning" />
            <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
              Tensions ({synthesis.tensions.length})
            </h4>
          </div>
          <div className="space-y-3">
            {synthesis.tensions.map((t, i) => (
              <div key={i} className="rounded-lg border border-warning/20 bg-warning/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-foreground flex-1">{t.topic}</p>
                  {t.requires_human_decision && (
                    <span className="text-[9px] uppercase tracking-wider text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                      Your call
                    </span>
                  )}
                </div>
                <ul className="space-y-1">
                  {t.positions.map((p, pi) => (
                    <li key={pi} className="text-[11px] text-muted-foreground leading-relaxed pl-3 border-l border-warning/30">
                      {p}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-foreground/80 italic mt-1">→ {t.resolution_suggestion}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ranked recommendations */}
      {synthesis.ranked_recommendations.length > 0 && (
        <section className="space-y-3">
          <button
            onClick={() => setShowRecs((v) => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <ListOrdered size={14} className="text-primary" />
            <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wider flex-1">
              Recommendations ({synthesis.ranked_recommendations.length})
            </h4>
            {showRecs ? (
              <ChevronUp size={12} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={12} className="text-muted-foreground" />
            )}
          </button>
          {showRecs && (
            <ol className="space-y-2">
              {synthesis.ranked_recommendations.map((r, i) => (
                <li key={i} className="rounded-lg border border-border/30 bg-card/30 p-3 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-primary mt-0.5">{i + 1}.</span>
                    <p className="text-xs font-medium text-foreground flex-1 leading-snug">{r.action}</p>
                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${confChip(r.confidence)}`}>
                      {r.confidence}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">{r.rationale}</p>
                  {r.source_agents.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-5">
                      {r.source_agents.map((a, ai) => (
                        <span key={ai} className="text-[9px] text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {/* Brief suggestions — collapsed by default */}
      {synthesis.refined_brief_suggestions.length > 0 && (
        <section className="space-y-3">
          <button
            onClick={() => setShowBriefSuggestions((v) => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <Check size={14} className="text-muted-foreground" />
            <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wider flex-1">
              Brief suggestions ({synthesis.refined_brief_suggestions.length})
            </h4>
            {showBriefSuggestions ? (
              <ChevronUp size={12} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={12} className="text-muted-foreground" />
            )}
          </button>
          {showBriefSuggestions && (
            <ul className="space-y-2">
              {synthesis.refined_brief_suggestions.map((s, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed pl-5 border-l border-border/30 py-0.5">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Re-run footer */}
      <div className="pt-4 border-t border-border/30 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          Synthesis from {result.agents_completed} agents
        </span>
        <button
          onClick={runOrchestrate}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Re-run Auto-Analyze
        </button>
      </div>
    </motion.div>
  );
};

export default SynthesisPanel;
