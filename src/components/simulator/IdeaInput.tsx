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
    <div className="flex flex-col items-center py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <p className="font-mono text-xs text-primary uppercase tracking-[0.3em] mb-4">
          AI Idea Simulator
        </p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-foreground leading-tight mb-4">
          Describe your
          <br />
          <span className="text-gradient-accent">wildest idea.</span>
        </h1>
        <p className="font-mono text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          We'll stress-test your assumptions and generate a build-ready prompt.
        </p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-2xl"
      >
        <motion.div
          className="relative"
          animate={shaking ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="An app that lets dog owners find and book verified pet sitters in their neighborhood, with real-time GPS tracking during walks..."
            className={`w-full min-h-[180px] p-6 rounded-lg bg-card/80 backdrop-blur-sm border text-foreground font-mono text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 resize-none transition-all ${
              attempted && isTooShort
                ? "border-destructive/60 focus:border-destructive/80 focus:ring-destructive/30"
                : "border-border/60 focus:border-primary/50 focus:ring-primary/20"
            }`}
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted-foreground/40">
              Enter ↵ to simulate
            </span>
            <span className={`font-mono text-[10px] transition-colors ${
              attempted && isTooShort ? "text-destructive" : "text-muted-foreground/40"
            }`}>
              {text.length} chars
            </span>
          </div>
        </motion.div>

        {attempted && isTooShort && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-xs text-destructive mt-2 ml-1"
          >
            Add a bit more detail — we need at least 10 characters.
          </motion.p>
        )}

        <motion.button
          type="submit"
          disabled={text.trim().length < 10}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-mono text-sm px-6 py-4 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
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
