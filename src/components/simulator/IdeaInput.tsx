import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface Props {
  onSubmit: (idea: string) => void;
}

const IdeaInput = ({ onSubmit }: Props) => {
  const [text, setText] = useState("");
  const [shaking, setShaking] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [focused, setFocused] = useState(false);

  const isTooShort = text.length > 0 && text.trim().length < 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 10) {
      setAttempted(true);
      triggerShake();
      return;
    }
    onSubmit(text.trim());
  };

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim().length >= 10) {
        onSubmit(text.trim());
      } else {
        setAttempted(true);
        triggerShake();
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-10"
      >
        <p className="font-mono text-[10px] text-primary uppercase tracking-[0.4em] mb-5 opacity-60">
          AI Idea Simulator
        </p>
        <h1
          className="font-display font-black text-foreground leading-[1.1] mb-3"
          style={{ fontSize: "clamp(2.5rem, 5vw + 1rem, 4rem)" }}
        >
          What are you building?
        </h1>
        <p className="font-mono text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Describe it. We'll stress-test every assumption and hand you a build-ready prompt.
        </p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full max-w-2xl"
      >
        <motion.div
          className="relative"
          animate={shaking ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Stage-style textarea — no container border, just a vast typing surface */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="An app that connects dog owners with verified pet sitters, featuring real-time GPS tracking and instant booking..."
            className={`w-full min-h-[200px] p-6 rounded-lg bg-transparent border text-foreground font-mono text-sm leading-relaxed placeholder:text-muted-foreground/30 focus:outline-none resize-none transition-all duration-300 ${
              attempted && isTooShort
                ? "border-destructive/40 focus:border-destructive/60"
                : focused
                ? "border-primary/30 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.15)]"
                : "border-border/20 hover:border-border/40"
            }`}
          />

          {/* Minimal metadata */}
          <div className="absolute bottom-3 right-4 flex items-center gap-4">
            <span className="font-mono text-[10px] text-muted-foreground/30">
              ↵ to simulate
            </span>
            <span
              className={`font-mono text-[10px] transition-colors ${
                attempted && isTooShort
                  ? "text-destructive/60"
                  : "text-muted-foreground/25"
              }`}
            >
              {text.length}
            </span>
          </div>
        </motion.div>

        {attempted && isTooShort && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-xs text-destructive/70 mt-2 ml-1"
          >
            A bit more detail — at least 10 characters.
          </motion.p>
        )}

        <motion.button
          type="submit"
          disabled={text.trim().length < 10}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-mono text-sm px-6 py-4 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-20 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Sparkles size={16} />
          Simulate This Idea
        </motion.button>
      </motion.form>
    </div>
  );
};

export default IdeaInput;
