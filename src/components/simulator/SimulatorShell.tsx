import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download } from "lucide-react";
import IdeaInput from "./IdeaInput";
import IdeaBrief from "./IdeaBrief";
import FollowUpQuestions from "./FollowUpQuestions";
import FinalReport, { generateStructuredPDF, computeScores } from "./FinalReport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const analysisMessages = [
  "Analyzing market size and competitive landscape...",
  "Identifying your most likely early customers...",
  "Generating investor perspective...",
  "Mapping out core features...",
  "Pressure-testing the revenue model...",
  "Evaluating industry trends and timing...",
];

const AnalyzingMessages = ({ isInitial }: { isInitial: boolean }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % analysisMessages.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);
  return (
    <p className="font-mono text-sm text-muted-foreground animate-pulse transition-opacity duration-500">
      {isInitial ? analysisMessages[msgIndex] : "Deepening the analysis..."}
    </p>
  );
};

export interface BriefData {
  problem: string;
  target_customer: string;
  core_features: { name: string; description: string }[];
  revenue_model: string;
  industry_trends: string;
  investor_perspective: string;
  customer_perspective: string;
  builder_intent?: string;
  app_type?: string;
  scale_assessment?: {
    current_scale: string;
    fits_intent: boolean;
    recommendation: string;
  };
}

export interface QuestionData {
  question: string;
  options: { label: string; description: string }[];
  allow_multiple: boolean;
}

interface RoundState {
  brief: BriefData;
  questions: QuestionData[];
  answers?: Record<number, { selected: string[]; freeText?: string }>;
}

const sectionLabels: Record<string, string> = {
  problem: "Problem / Opportunity",
  target_customer: "Target Customer",
  core_features: "Core Features",
  revenue_model: "Revenue Model",
  industry_trends: "Industry & Competitors",
  investor_perspective: "Investor Perspective",
  customer_perspective: "Customer Perspective",
};

const DRAFT_KEY = "vibeco_simulator_draft";
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface DraftState {
  phase: "input" | "analyzing" | "brief" | "final";
  idea: string;
  rounds: RoundState[];
  currentRound: number;
  highlights: string[];
  antiHighlights: string[];
  conceptImage: string | null;
  logoImage: string | null;
  lovablePrompt: string | null;
  unlocked: boolean;
  unlockEmail: string;
  reportId: string | null;
  sessionId: string;
  savedAt: number;
}

function saveDraft(state: DraftState) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function loadDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft: DraftState = JSON.parse(raw);
    if (Date.now() - draft.savedAt > DRAFT_TTL) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

const SimulatorShell = () => {
  const [initialized, setInitialized] = useState(false);
  const draft = !initialized ? loadDraft() : null;

  const [phase, setPhase] = useState<"input" | "analyzing" | "brief" | "final">(draft?.phase === "analyzing" ? "brief" : draft?.phase || "input");
  const [rounds, setRounds] = useState<RoundState[]>(draft?.rounds || []);
  const [currentRound, setCurrentRound] = useState(draft?.currentRound || 0);
  const [idea, setIdea] = useState(draft?.idea || "");
  const [isLoading, setIsLoading] = useState(false);
  const [conceptImage, setConceptImage] = useState<string | null>(draft?.conceptImage || null);
  const [logoImage, setLogoImage] = useState<string | null>(draft?.logoImage || null);
  const [unlocked, setUnlocked] = useState(draft?.unlocked || false);
  const [unlockEmail, setUnlockEmail] = useState(draft?.unlockEmail || "");
  const [lovablePrompt, setLovablePrompt] = useState<string | null>(draft?.lovablePrompt || null);
  const [sessionId] = useState(() => draft?.sessionId || crypto.randomUUID());
  const [highlights, setHighlights] = useState<Set<string>>(new Set(draft?.highlights || []));
  const [antiHighlights, setAntiHighlights] = useState<Set<string>>(new Set(draft?.antiHighlights || []));
  const [reportId, setReportId] = useState<string | null>(draft?.reportId || null);
  const [depthRecommendation, setDepthRecommendation] = useState<string | undefined>();

  useEffect(() => {
    setInitialized(true);
    if (draft) {
      toast.info("Resumed your previous session.");
    }
  }, []);

  // Persist state to localStorage on meaningful changes
  useEffect(() => {
    if (phase === "input" && rounds.length === 0) return;
    saveDraft({
      phase,
      idea,
      rounds,
      currentRound,
      highlights: Array.from(highlights),
      antiHighlights: Array.from(antiHighlights),
      conceptImage,
      logoImage,
      lovablePrompt,
      unlocked,
      unlockEmail,
      reportId,
      sessionId,
      savedAt: Date.now(),
    });
  }, [phase, idea, rounds, currentRound, highlights, antiHighlights, conceptImage, logoImage, lovablePrompt, unlocked, unlockEmail, reportId, sessionId]);

  const toggleHighlight = (key: string) => {
    setHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    // Clear anti-highlight if setting positive
    setAntiHighlights((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const toggleAntiHighlight = (key: string) => {
    setAntiHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    // Clear positive highlight
    setHighlights((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  // Auto-save to simulator_captures (DB backup)
  useEffect(() => {
    if (rounds.length === 0) return;
    const saveSession = async () => {
      try {
        const userId = (await supabase.auth.getSession()).data.session?.user?.id || null;
        await (supabase.from("simulator_captures") as any).upsert({
          id: sessionId,
          email: unlockEmail || `anonymous-${sessionId.slice(0, 8)}`,
          idea: idea.trim() || "untitled",
          rounds: rounds.map((r) => ({
            brief: r.brief,
            questions: r.questions,
            answers: r.answers || null,
          })),
          concept_image_url: conceptImage || null,
          logo_image_url: logoImage || null,
          lovable_prompt: lovablePrompt || null,
          ...(userId ? { user_id: userId } : {}),
        }, { onConflict: "id" });
      } catch (err) {
        console.error("Auto-save error:", err);
      }
    };
    saveSession();
  }, [rounds, unlockEmail, lovablePrompt]);

  // Also update idea_reports when highlights or lovablePrompt change (if reportId exists)
  const updateReport = useCallback(async () => {
    if (!reportId) return;
    try {
      await (supabase.from("idea_reports") as any)
        .update({
          lovable_prompt: lovablePrompt || null,
          highlights: Array.from(highlights),
          concept_image_url: conceptImage || null,
          logo_image_url: logoImage || null,
        })
        .eq("id", reportId);
    } catch (err) {
      console.error("Report update error:", err);
    }
  }, [reportId, lovablePrompt, highlights, conceptImage, logoImage]);

  useEffect(() => {
    if (reportId && phase === "final") {
      updateReport();
    }
  }, [highlights, lovablePrompt, reportId, phase]);

  const generateImages = async (ideaText: string) => {
    try {
      const [conceptRes, logoRes] = await Promise.allSettled([
        supabase.functions.invoke("generate-idea-image", {
          body: { idea: ideaText, type: "concept" },
        }),
        supabase.functions.invoke("generate-idea-image", {
          body: { idea: ideaText, type: "logo" },
        }),
      ]);

      if (conceptRes.status === "fulfilled" && conceptRes.value.data?.image_url) {
        setConceptImage(conceptRes.value.data.image_url);
      }
      if (logoRes.status === "fulfilled" && logoRes.value.data?.image_url) {
        setLogoImage(logoRes.value.data.image_url);
      }
    } catch (e) {
      console.error("Image generation failed:", e);
    }
  };

  const buildHistory = (upToRound: number): string => {
    let history = `Original idea: "${idea}"\n\n`;
    for (let i = 0; i <= upToRound && i < rounds.length; i++) {
      const r = rounds[i];
      history += `--- Round ${i + 1} Brief ---\n`;
      history += `Problem: ${r.brief.problem}\n`;
      history += `Target Customer: ${r.brief.target_customer}\n`;
      history += `Features (in user's priority order): ${r.brief.core_features.map((f, fi) => `${fi + 1}. ${f.name}`).join(", ")}\n`;
      history += `Revenue: ${r.brief.revenue_model}\n`;
      history += `Industry: ${r.brief.industry_trends}\n`;
      history += `Investor View: ${r.brief.investor_perspective}\n`;
      history += `Customer View: ${r.brief.customer_perspective}\n`;
      if (r.brief.builder_intent) history += `Builder Intent: ${r.brief.builder_intent}\n`;
      if (r.brief.scale_assessment) history += `Scale: ${r.brief.scale_assessment.current_scale} (${r.brief.scale_assessment.fits_intent ? "matches intent" : "mismatch"}) — ${r.brief.scale_assessment.recommendation}\n`;
      history += `\n`;
      if (r.answers) {
        history += `User answers:\n`;
        r.questions.forEach((q, qi) => {
          const a = r.answers![qi];
          if (a) {
            history += `Q: ${q.question}\nA: ${a.selected.join(", ")}${a.freeText ? ` — Additional: ${a.freeText}` : ""}\n\n`;
          }
        });
      }
    }

    if (highlights.size > 0) {
      history += `\n--- USER HIGHLIGHTS (these areas resonated most — prioritize them in the lovable_prompt and deeper analysis) ---\n`;
      highlights.forEach((key) => {
        const label = sectionLabels[key] || key;
        history += `✦ ${label}\n`;
      });
      history += `\n`;
    }

    if (antiHighlights.size > 0) {
      history += `\n--- USER FLAGS (these areas do NOT resonate — deprioritize or reframe in the lovable_prompt) ---\n`;
      antiHighlights.forEach((key) => {
        const label = sectionLabels[key] || key;
        history += `✕ ${label}\n`;
      });
      history += `\n`;
    }

    return history;
  };

  const callSimulator = async (type: "initial" | "refine", ideaText?: string, round?: number) => {
    setIsLoading(true);
    setPhase("analyzing");
    try {
      const body: Record<string, unknown> =
        type === "initial"
          ? { type: "initial", idea: ideaText || idea }
          : { type: "refine", history: buildHistory(currentRound - 1), round };

      const { data, error } = await supabase.functions.invoke("simulate-idea", { body });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const newRound: RoundState = {
        brief: data.brief,
        questions: data.follow_up_questions || [],
      };

      if (data.lovable_prompt) {
        setLovablePrompt(data.lovable_prompt);
      }

      // Store depth recommendation for follow-up UX
      if (data.depth_recommendation) {
        setDepthRecommendation(data.depth_recommendation);
      }

      if (data.is_final) {
        const allRounds = [...rounds, newRound];
        setRounds(allRounds);
        setPhase("final");

        // Save to idea_reports ONCE
        try {
          const latestBrief = newRound.brief;
          const roundsData = allRounds.map((r) => ({
            brief: r.brief,
            questions: r.questions,
            answers: r.answers || null,
          }));

          if (reportId) {
            await (supabase.from("idea_reports") as any)
              .update({
                brief: latestBrief,
                rounds: roundsData,
                lovable_prompt: data.lovable_prompt || null,
                concept_image_url: conceptImage || null,
                logo_image_url: logoImage || null,
                highlights: Array.from(highlights),
              })
              .eq("id", reportId);
          } else {
            const { data: reportData } = await (supabase.from("idea_reports") as any)
              .insert({
                idea: idea.trim(),
                brief: latestBrief,
                rounds: roundsData,
                lovable_prompt: data.lovable_prompt || null,
                concept_image_url: conceptImage || null,
                logo_image_url: logoImage || null,
                highlights: Array.from(highlights),
              })
              .select("id")
              .single();
            if (reportData?.id) setReportId(reportData.id);
          }
        } catch (err) {
          console.error("Report save error:", err);
        }
      } else {
        setRounds((prev) => [...prev, newRound]);
        setCurrentRound((prev) => prev + 1);
        setPhase("brief");
      }
    } catch (e: unknown) {
      console.error("Simulator error:", e);
      toast.error(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setPhase(rounds.length > 0 ? "brief" : "input");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdeaSubmit = (text: string) => {
    setIdea(text);
    generateImages(text);
    callSimulator("initial", text);
  };

  const handleAnswersSubmit = (answers: Record<number, { selected: string[]; freeText?: string }>) => {
    setRounds((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], answers };
      return updated;
    });
    callSimulator("refine", undefined, currentRound + 1);
  };

  const handleSkipToFinal = (answers: Record<number, { selected: string[]; freeText?: string }>) => {
    setRounds((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], answers };
      return updated;
    });
    callSimulator("refine", undefined, 3);
  };

  const handleReorderFeatures = (newFeatures: BriefData["core_features"]) => {
    setRounds((prev) => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      updated[lastIndex] = {
        ...updated[lastIndex],
        brief: { ...updated[lastIndex].brief, core_features: newFeatures },
      };
      return updated;
    });
  };

  const handleUnlock = async (email: string) => {
    setUnlockEmail(email);
    setUnlocked(true);
    try {
      const userId = (await supabase.auth.getSession()).data.session?.user?.id || null;
      await (supabase.from("simulator_captures") as any).upsert({
        id: sessionId,
        email: email.trim(),
        idea: idea.trim(),
        rounds: rounds.map((r) => ({
          brief: r.brief,
          questions: r.questions,
          answers: r.answers || null,
        })),
        concept_image_url: conceptImage || null,
        logo_image_url: logoImage || null,
        lovable_prompt: lovablePrompt || null,
        ...(userId ? { user_id: userId } : {}),
      }, { onConflict: "id" });
    } catch (err) {
      console.error("Capture error:", err);
    }

    if (reportId) {
      try {
        await (supabase.from("idea_reports") as any)
          .update({
            lovable_prompt: lovablePrompt || null,
            highlights: Array.from(highlights),
            concept_image_url: conceptImage || null,
            logo_image_url: logoImage || null,
          })
          .eq("id", reportId);
      } catch (err) {
        console.error("Report update error:", err);
      }
    } else {
      try {
        const latestBrief = rounds[rounds.length - 1]?.brief;
        if (latestBrief) {
          const { data: reportData } = await (supabase.from("idea_reports") as any)
            .insert({
              idea: idea.trim(),
              brief: latestBrief,
              rounds: rounds.map((r) => ({
                brief: r.brief,
                questions: r.questions,
                answers: r.answers || null,
              })),
              lovable_prompt: lovablePrompt || null,
              concept_image_url: conceptImage || null,
              logo_image_url: logoImage || null,
              highlights: Array.from(highlights),
            })
            .select("id")
            .single();
          if (reportData?.id) setReportId(reportData.id);
        }
      } catch (err) {
        console.error("Report save error:", err);
      }
    }

    toast.success("Saved! Your full report is unlocked.");
  };

  const handleRestart = () => {
    clearDraft();
    setPhase("input");
    setRounds([]);
    setCurrentRound(0);
    setIdea("");
    setConceptImage(null);
    setLogoImage(null);
    setUnlocked(false);
    setUnlockEmail("");
    setLovablePrompt(null);
    setHighlights(new Set());
    setAntiHighlights(new Set());
    setReportId(null);
    setDepthRecommendation(undefined);
  };

  const handleDownloadPDF = () => {
    const latestBrief = rounds[rounds.length - 1]?.brief;
    if (!latestBrief) return;
    const scores = computeScores(latestBrief);
    generateStructuredPDF(latestBrief, idea, rounds, scores, lovablePrompt);
    toast.success("PDF downloaded!");
  };

  const latestRound = rounds[rounds.length - 1];
  const totalRounds = 3;

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        {unlocked && rounds.length > 0 && phase !== "input" && phase !== "analyzing" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 font-mono text-xs px-4 py-2.5 rounded-sm bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
            >
              <Download size={14} />
              Download PDF
            </button>
          </motion.div>
        )}

        {rounds.length > 0 && phase !== "input" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-10"
          >
            {Array.from({ length: totalRounds }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm font-bold transition-all duration-500 ${
                        i < rounds.length || (phase === "final" && i === rounds.length - 1)
                          ? "bg-primary text-primary-foreground"
                          : i === rounds.length && phase === "analyzing"
                          ? "bg-primary/30 text-primary border border-primary/50"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {i === 0 ? "Analyze" : i === 1 ? "Refine" : "Finalize"}
                    </span>
                  </div>
                {i < totalRounds - 1 && (
                  <div
                    className={`w-12 h-px transition-colors duration-500 ${
                      i < rounds.length - 1 || (phase === "final" && i < rounds.length) ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {phase === "input" && (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <IdeaInput onSubmit={handleIdeaSubmit} />
            </motion.div>
          )}

          {phase === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <div className="relative mb-8">
                <motion.div
                  className="w-24 h-24 rounded-full"
                  style={{
                    background: "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)",
                  }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-0 w-24 h-24 rounded-full border border-primary/20"
                  animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
              </div>
              <AnalyzingMessages isInitial={rounds.length === 0} />
              <p className="font-mono text-[10px] text-muted-foreground/50 mt-2">
                This takes about 10-15 seconds
              </p>
            </motion.div>
          )}

          {phase === "brief" && latestRound && (
            <motion.div key={`brief-${currentRound}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FollowUpQuestions
                questions={latestRound.questions}
                onSubmit={handleAnswersSubmit}
                onSkipToFinal={handleSkipToFinal}
                isLoading={isLoading}
                round={currentRound}
                highlights={highlights}
                onToggleHighlight={toggleHighlight}
                depthRecommendation={depthRecommendation}
              />
              <IdeaBrief
                brief={latestRound.brief}
                round={currentRound}
                conceptImage={conceptImage}
                unlocked={unlocked}
                onUnlock={handleUnlock}
                highlights={highlights}
                onToggleHighlight={toggleHighlight}
                antiHighlights={antiHighlights}
                onToggleAntiHighlight={toggleAntiHighlight}
              />
            </motion.div>
          )}

          {phase === "final" && latestRound && (
            <motion.div key="final" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FinalReport
                brief={latestRound.brief}
                idea={idea}
                onRestart={handleRestart}
                conceptImage={conceptImage}
                logoImage={logoImage}
                rounds={rounds}
                unlocked={unlocked}
                unlockEmail={unlockEmail}
                lovablePrompt={lovablePrompt}
                sessionId={sessionId}
                highlights={highlights}
                onToggleHighlight={toggleHighlight}
                antiHighlights={antiHighlights}
                onToggleAntiHighlight={toggleAntiHighlight}
                reportId={reportId}
                onReorderFeatures={handleReorderFeatures}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SimulatorShell;
