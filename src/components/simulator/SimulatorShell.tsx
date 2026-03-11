import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IdeaInput from "./IdeaInput";
import IdeaBrief from "./IdeaBrief";
import FollowUpQuestions from "./FollowUpQuestions";
import FinalReport from "./FinalReport";
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

  const buildHistory = (upToRound: number): string => {
    let history = `Original idea: "${idea}"\n\n`;
    for (let i = 0; i <= upToRound && i < rounds.length; i++) {
      const r = rounds[i];
      history += `--- Round ${i + 1} Brief ---\n`;
      history += `Problem: ${r.brief.problem}\n`;
      history += `Target Customer: ${r.brief.target_customer}\n`;
      history += `Features: ${r.brief.core_features.map((f) => f.name).join(", ")}\n`;
      history += `Revenue: ${r.brief.revenue_model}\n\n`;
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

  const callSimulator = async (type: "initial" | "refine", round?: number) => {
    setIsLoading(true);
    setPhase("analyzing");
    try {
      const body: Record<string, unknown> =
        type === "initial"
          ? { type: "initial", idea }
          : { type: "refine", history: buildHistory(currentRound - 1), round };

      const { data, error } = await supabase.functions.invoke("simulate-idea", { body });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const newRound: RoundState = {
        brief: data.brief,
        questions: data.follow_up_questions || [],
      };

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
    callSimulator("initial");
  };

  const handleAnswersSubmit = (answers: Record<number, { selected: string[]; freeText?: string }>) => {
    setRounds((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], answers };
      return updated;
    });
    callSimulator("refine", currentRound + 1);
  };

  const handleRestart = () => {
    setPhase("input");
    setRounds([]);
    setCurrentRound(0);
    setIdea("");
  };

  const latestRound = rounds[rounds.length - 1];
  const totalRounds = 3;

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        {/* Round indicator */}
        {rounds.length > 0 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: totalRounds }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i < rounds.length
                    ? "bg-primary scale-110"
                    : "bg-muted-foreground/30"
                }`}
              />
            ))}
            <span className="ml-3 font-mono text-xs text-muted-foreground">
              Round {Math.min(rounds.length, totalRounds)} / {totalRounds}
            </span>
          </div>
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
              <motion.div
                className="w-24 h-24 rounded-full mb-8"
                style={{
                  background: "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)",
                }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <p className="font-mono text-sm text-muted-foreground animate-pulse">
                {rounds.length === 0 ? "Analyzing your idea..." : "Refining your brief..."}
              </p>
            </motion.div>
          )}

          {phase === "brief" && latestRound && (
            <motion.div key={`brief-${currentRound}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <IdeaBrief brief={latestRound.brief} round={currentRound} />
              <FollowUpQuestions
                questions={latestRound.questions}
                onSubmit={handleAnswersSubmit}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {phase === "final" && latestRound && (
            <motion.div key="final" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FinalReport brief={latestRound.brief} idea={idea} onRestart={handleRestart} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SimulatorShell;
