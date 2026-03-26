import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Loader2, Shield, Flame, Swords, Heart, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BriefData } from "./SimulatorShell";

interface Perspective {
  persona: string;
  perspective: string;
  challenge_questions: { question: string; context: string }[];
  headline: string;
}

interface Props {
  brief: BriefData;
  idea: string;
  reportId?: string | null;
}

const PERSONAS = [
  { id: "skeptic", name: "The Skeptic", tagline: "What kills this?", icon: Shield, color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", hoverBorder: "hover:border-red-500/50" },
  { id: "champion", name: "The Champion", tagline: "Why this wins", icon: Flame, color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30", hoverBorder: "hover:border-emerald-500/50" },
  { id: "competitor", name: "The Competitor", tagline: "How I'd beat you", icon: Swords, color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30", hoverBorder: "hover:border-amber-500/50" },
  { id: "customer", name: "The Customer", tagline: "Would I pay?", icon: Heart, color: "text-pink-400", bgColor: "bg-pink-500/10", borderColor: "border-pink-500/30", hoverBorder: "hover:border-pink-500/50" },
  { id: "builder", name: "The Builder", tagline: "How to ship this", icon: Wrench, color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", hoverBorder: "hover:border-blue-500/50" },
];

const PerspectivesPanel = ({ brief, idea, reportId }: Props) => {
  const [perspectives, setPerspectives] = useState<Record<string, Perspective>>({});
  const [activePersona, setActivePersona] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handlePersonaClick = async (personaId: string) => {
    if (activePersona === personaId) {
      setActivePersona(null);
      return;
    }

    setActivePersona(personaId);

    if (perspectives[personaId]) return;

    setLoading(personaId);
    try {
      const { data, error } = await supabase.functions.invoke("persona-perspective", {
        body: {
          persona: personaId,
          brief,
          idea,
          builder_intent: brief.builder_intent || "venture",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPerspectives((prev) => ({ ...prev, [personaId]: data }));

      if (reportId) {
        try {
          await (supabase.from("idea_perspectives") as any).upsert({
            report_id: reportId,
            persona: personaId,
            perspective: data.perspective,
            challenge_questions: data.challenge_questions,
          }, { onConflict: "report_id,persona" });
        } catch (err) {
          console.error("Failed to save perspective:", err);
        }
      }
    } catch (e) {
      console.error("Perspective error:", e);
      toast.error("Failed to generate perspective. Try again.");
      setActivePersona(null);
    } finally {
      setLoading(null);
    }
  };

  const activeData = activePersona ? perspectives[activePersona] : null;
  const activeMeta = PERSONAS.find((p) => p.id === activePersona);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">The Perspectives Panel</h3>
        <span className="font-mono text-[10px] text-muted-foreground">5 AI personas</span>
      </div>

      <p className="font-mono text-xs text-muted-foreground">
        Click a persona to hear their take on your idea. Each one sees something different.
      </p>

      <div className="grid grid-cols-5 gap-2">
        {PERSONAS.map((persona) => {
          const Icon = persona.icon;
          const isActive = activePersona === persona.id;
          const isLoading = loading === persona.id;
          const hasContent = !!perspectives[persona.id];

          return (
            <button
              key={persona.id}
              onClick={() => handlePersonaClick(persona.id)}
              disabled={isLoading}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border transition-all duration-200 ${
                isActive
                  ? `${persona.bgColor} ${persona.borderColor} ring-1 ring-offset-1 ring-offset-background`
                  : `border-border/50 ${persona.hoverBorder}`
              } ${isLoading ? "opacity-70" : ""}`}
            >
              {hasContent && !isActive && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
              )}
              {isLoading ? (
                <Loader2 size={18} className={`${persona.color} animate-spin`} />
              ) : (
                <Icon size={18} className={persona.color} />
              )}
              <span className="font-mono text-[10px] font-medium text-foreground leading-tight text-center">
                {persona.name}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground leading-tight text-center hidden sm:block">
                {persona.tagline}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activePersona && (
          <motion.div
            key={activePersona}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {loading === activePersona && !activeData ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  {activeMeta?.name} is analyzing your idea...
                </span>
              </div>
            ) : activeData ? (
              <div className="space-y-4 p-4 rounded-lg border border-border/30 bg-muted/10">
                <div className="flex items-start gap-3">
                  {activeMeta && <activeMeta.icon size={16} className={activeMeta.color} />}
                  <p className="font-display text-sm font-semibold text-foreground leading-snug">
                    {activeData.headline}
                  </p>
                </div>

                <div className="prose prose-sm prose-invert max-w-none font-mono text-xs text-muted-foreground leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                      h2: ({ children }) => <h4 className="font-display text-xs font-semibold text-foreground mt-4 mb-2">{children}</h4>,
                      strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                      ul: ({ children }) => <ul className="space-y-1.5 my-2">{children}</ul>,
                      li: ({ children }) => (
                        <li className="flex items-start gap-2">
                          <span className="text-muted-foreground mt-0.5">•</span>
                          <span>{children}</span>
                        </li>
                      ),
                    }}
                  >
                    {activeData.perspective}
                  </ReactMarkdown>
                </div>

                {activeData.challenge_questions?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/20">
                    <h4 className="font-display text-xs font-semibold text-foreground mb-3">
                      Challenge Questions
                    </h4>
                    <div className="space-y-3">
                      {activeData.challenge_questions.map((cq, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="font-mono text-[10px] text-primary font-bold mt-0.5">{i + 1}</span>
                          <div>
                            <p className="font-mono text-xs text-foreground font-medium">{cq.question}</p>
                            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{cq.context}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerspectivesPanel;
