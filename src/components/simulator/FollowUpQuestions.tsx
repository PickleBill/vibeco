import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Lightbulb } from "lucide-react";
import type { QuestionData } from "./SimulatorShell";

interface Props {
  questions: QuestionData[];
  onSubmit: (answers: Record<number, { selected: string[]; freeText?: string }>) => void;
  isLoading: boolean;
  round: number;
}

const FollowUpQuestions = ({ questions, onSubmit, isLoading, round }: Props) => {
  const [answers, setAnswers] = useState<Record<number, { selected: string[]; freeText?: string }>>({});

  const toggleOption = (qIndex: number, label: string, allowMultiple: boolean) => {
    setAnswers((prev) => {
      const current = prev[qIndex]?.selected || [];
      let next: string[];
      if (allowMultiple) {
        next = current.includes(label)
          ? current.filter((l) => l !== label)
          : [...current, label];
      } else {
        next = current.includes(label) ? [] : [label];
      }
      return { ...prev, [qIndex]: { ...prev[qIndex], selected: next } };
    });
  };

  const setFreeText = (qIndex: number, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qIndex]: { ...prev[qIndex], selected: prev[qIndex]?.selected || [], freeText: text },
    }));
  };

  const answeredCount = questions.filter((_, i) => (answers[i]?.selected?.length || 0) > 0).length;
  const allAnswered = answeredCount === questions.length;

  const handleSubmit = () => {
    if (!allAnswered) return;
    onSubmit(answers);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mb-12"
    >
      {/* Header with progress */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 mb-3">
          <Lightbulb size={12} className="text-accent" />
          <span className="font-mono text-[10px] text-accent uppercase tracking-wider">
            Your Turn · Shape the Direction
          </span>
        </div>
        <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">
          {round <= 1 ? "Let's go deeper." : "Sharpen your vision."}
        </h3>
        <p className="font-mono text-xs text-muted-foreground mb-4">
          Pick your direction below, then we'll refine the analysis.
        </p>

        {/* Progress bar */}
        <div className="max-w-xs mx-auto flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {answeredCount}/{questions.length}
          </span>
        </div>
      </div>

      <div className="grid gap-6">
        {questions.map((q, qi) => {
          const isAnswered = (answers[qi]?.selected?.length || 0) > 0;
          return (
            <motion.div
              key={qi}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + qi * 0.1 }}
              className={`p-5 rounded-lg border transition-all duration-300 ${
                isAnswered
                  ? "bg-primary/5 border-primary/30"
                  : "bg-card/40 border-border/50"
              }`}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  isAnswered ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {isAnswered ? <CheckCircle2 size={14} /> : <span className="font-mono text-[10px] font-bold">{qi + 1}</span>}
                </div>
                <div>
                  <p className="font-mono text-sm text-foreground font-medium leading-snug">
                    {q.question}
                  </p>
                  {q.allow_multiple && (
                    <span className="font-mono text-[10px] text-muted-foreground mt-1 inline-block">
                      Select all that apply
                    </span>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 ml-9">
                {q.options.map((opt) => {
                  const isSelected = answers[qi]?.selected?.includes(opt.label);
                  return (
                    <motion.button
                      key={opt.label}
                      type="button"
                      onClick={() => toggleOption(qi, opt.label, q.allow_multiple)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative text-left px-4 py-3 rounded-lg font-mono text-sm transition-all duration-200 border ${
                        isSelected
                          ? "bg-primary/15 border-primary/50 text-foreground shadow-sm"
                          : "bg-background/50 border-border/40 text-muted-foreground hover:border-primary/25 hover:text-foreground hover:bg-card/60"
                      }`}
                    >
                      <span className="font-semibold block text-[13px]">{opt.label}</span>
                      <span className="block text-[11px] mt-1 opacity-60 leading-snug">{opt.description}</span>
                      {isSelected && (
                        <motion.div
                          layoutId={`sel-${qi}-${opt.label}`}
                          className="absolute top-2 right-2"
                        >
                          <CheckCircle2 size={14} className="text-primary" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="ml-9 mt-3">
                <input
                  type="text"
                  placeholder="Or type your own angle..."
                  value={answers[qi]?.freeText || ""}
                  onChange={(e) => setFreeText(qi, e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-background/30 border border-border/20 font-mono text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30 transition-colors"
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.button
        onClick={handleSubmit}
        disabled={!allAnswered || isLoading}
        className={`mt-8 w-full flex items-center justify-center gap-2 font-mono text-sm px-6 py-4 rounded-md transition-all duration-300 ${
          allAnswered
            ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
        whileHover={allAnswered ? { scale: 1.01 } : {}}
        whileTap={allAnswered ? { scale: 0.99 } : {}}
        style={allAnswered ? { boxShadow: "0 0 20px hsl(var(--primary) / 0.2)" } : {}}
      >
        {allAnswered ? (
          <>
            Refine My Brief
            <ArrowRight size={16} />
          </>
        ) : (
          `Answer all ${questions.length} questions to continue`
        )}
      </motion.button>
    </motion.div>
  );
};

export default FollowUpQuestions;
