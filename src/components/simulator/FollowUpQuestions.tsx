import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { QuestionData } from "./SimulatorShell";

interface Props {
  questions: QuestionData[];
  onSubmit: (answers: Record<number, { selected: string[]; freeText?: string }>) => void;
  isLoading: boolean;
}

const FollowUpQuestions = ({ questions, onSubmit, isLoading }: Props) => {
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

  const allAnswered = questions.every((_, i) => (answers[i]?.selected?.length || 0) > 0);

  const handleSubmit = () => {
    if (!allAnswered) return;
    onSubmit(answers);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mb-12"
    >
      <h3 className="font-display text-xl font-bold text-foreground mb-2 text-center">
        Let's go deeper.
      </h3>
      <p className="font-mono text-xs text-muted-foreground mb-8 text-center">
        Pick your direction. You can select multiple where noted.
      </p>

      <div className="grid gap-8">
        {questions.map((q, qi) => (
          <motion.div
            key={qi}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + qi * 0.1 }}
          >
            <p className="font-mono text-sm text-foreground mb-3">
              {q.question}
              {q.allow_multiple && (
                <span className="text-muted-foreground text-xs ml-2">(select multiple)</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {q.options.map((opt) => {
                const isSelected = answers[qi]?.selected?.includes(opt.label);
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => toggleOption(qi, opt.label, q.allow_multiple)}
                    className={`group relative px-4 py-2.5 rounded-md font-mono text-sm transition-all duration-200 border ${
                      isSelected
                        ? "bg-primary/15 border-primary/50 text-foreground"
                        : "bg-card/40 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <span className="font-semibold">{opt.label}</span>
                    <span className="block text-[11px] mt-0.5 opacity-70">{opt.description}</span>
                    {isSelected && (
                      <motion.div
                        layoutId={`glow-${qi}-${opt.label}`}
                        className="absolute inset-0 rounded-md border border-primary/40 pointer-events-none"
                        style={{
                          boxShadow: "0 0 12px hsl(var(--primary) / 0.15)",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              placeholder="Add your own take (optional)..."
              value={answers[qi]?.freeText || ""}
              onChange={(e) => setFreeText(qi, e.target.value)}
              className="w-full px-4 py-2 rounded-md bg-card/30 border border-border/30 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30"
            />
          </motion.div>
        ))}
      </div>

      <motion.button
        onClick={handleSubmit}
        disabled={!allAnswered || isLoading}
        className="mt-8 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-mono text-sm px-6 py-4 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        Refine My Brief
        <ArrowRight size={16} />
      </motion.button>
    </motion.div>
  );
};

export default FollowUpQuestions;
