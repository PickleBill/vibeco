import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface Props {
  onSubmit: (idea: string) => void;
}

const IdeaInput = ({ onSubmit }: Props) => {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 10) return;
    onSubmit(text.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim().length >= 10) {
        onSubmit(text.trim());
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
          We'll analyze it, ask smart questions, then generate a ready-to-build prompt.
        </p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-2xl"
      >
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="An app that lets dog owners find and book verified pet sitters in their neighborhood, with real-time GPS tracking during walks..."
            className="w-full min-h-[180px] p-6 rounded-lg bg-card/80 backdrop-blur-sm border border-border/60 text-foreground font-mono text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-all"
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted-foreground/40">
              Press Enter to submit
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/40">
              {text.length} chars
            </span>
          </div>
        </div>

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
