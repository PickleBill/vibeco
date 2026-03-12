import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download } from "lucide-react";
import IdeaInput from "./IdeaInput";
import IdeaBrief from "./IdeaBrief";
import FollowUpQuestions from "./FollowUpQuestions";
import FinalReport, { generateStructuredPDF, computeScores } from "./FinalReport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BriefData {
  problem: string;
  target_customer: string;
  core_features: { name: string; description: string }[];
  revenue_model: string;
  industry_trends: string;
  investor_perspective: string;
  customer_perspective: string;
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

const SimulatorShell = () => {
  const [phase, setPhase] = useState<"input" | "analyzing" | "brief" | "final">("input");
  const [rounds, setRounds] = useState<RoundState[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [idea, setIdea] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conceptImage, setConceptImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockEmail, setUnlockEmail] = useState("");
  const [lovablePrompt, setLovablePrompt] = useState<string | null>(null);
  const [landingPageHtml, setLandingPageHtml] = useState<string | null>(null);
  const [isGeneratingLandingPage, setIsGeneratingLandingPage] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  // Auto-save session on every round completion (even without email)
  useEffect(() => {
    if (rounds.length === 0) return;
    const saveSession = async () => {
      try {
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
          landing_page_html: landingPageHtml || null,
        }, { onConflict: "id" });
      } catch (err) {
        console.error("Auto-save error:", err);
      }
    };
    saveSession();
  }, [rounds, unlockEmail, lovablePrompt, landingPageHtml]);

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
      history += `Features: ${r.brief.core_features.map((f) => f.name).join(", ")}\n`;
      history += `Revenue: ${r.brief.revenue_model}\n`;
      history += `Industry: ${r.brief.industry_trends}\n`;
      history += `Investor View: ${r.brief.investor_perspective}\n`;
      history += `Customer View: ${r.brief.customer_perspective}\n\n`;
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

      if (data.is_final) {
        setRounds((prev) => [...prev, newRound]);
        setPhase("final");
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
    // Save whatever answers exist, then force final round
    setRounds((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], answers };
      return updated;
    });
    callSimulator("refine", undefined, 3);
  };

  const generateLandingPage = async (prompt?: string) => {
    const promptToUse = prompt || lovablePrompt;
    if (!promptToUse || isGeneratingLandingPage) return;
    setIsGeneratingLandingPage(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-landing-page", {
        body: { prompt: promptToUse },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.html) {
        setLandingPageHtml(data.html);
        toast.success("Landing page generated!");
      }
    } catch (e) {
      console.error("Landing page generation error:", e);
      toast.error(e instanceof Error ? e.message : "Failed to generate landing page");
    } finally {
      setIsGeneratingLandingPage(false);
    }
  };

  const handleUnlock = async (email: string) => {
    setUnlockEmail(email);
    setUnlocked(true);
    try {
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
        landing_page_html: landingPageHtml || null,
      }, { onConflict: "id" });
    } catch (err) {
      console.error("Capture error:", err);
    }
    toast.success("Saved! Your full report will be unlocked at the end.");
  };

  const handleRestart = () => {
    setPhase("input");
    setRounds([]);
    setCurrentRound(0);
    setIdea("");
    setConceptImage(null);
    setLogoImage(null);
    setUnlocked(false);
    setUnlockEmail("");
    setLovablePrompt(null);
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
        {/* Persistent download button when unlocked */}
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

        {/* Round indicator */}
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
              <p className="font-mono text-sm text-muted-foreground animate-pulse">
                {rounds.length === 0 ? "Analyzing your idea..." : "Deepening the analysis..."}
              </p>
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
              />
              <IdeaBrief
                brief={latestRound.brief}
                round={currentRound}
                conceptImage={conceptImage}
                unlocked={unlocked}
                onUnlock={handleUnlock}
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SimulatorShell;
