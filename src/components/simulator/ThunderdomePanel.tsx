import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Maximize2, Minimize2, Sparkles } from "lucide-react";
import PerspectivesPanel from "./PerspectivesPanel";
import ExpandContractPanel from "./ExpandContractPanel";
import SynthesisPanel from "./SynthesisPanel";
import type { BriefData } from "./SimulatorShell";

type ThunderdomeTab = "synthesis" | "perspectives" | "expand" | "contract";

interface Props {
  brief: BriefData;
  idea: string;
  reportId?: string | null;
  highlights?: Set<string>;
  antiHighlights?: Set<string>;
  lovablePrompt?: string | null;
  onPromptUpdate?: (prompt: string) => void;
}

const ThunderdomePanel = ({
  brief,
  idea,
  reportId,
  highlights,
  antiHighlights,
  lovablePrompt,
  onPromptUpdate,
}: Props) => {
  const [activeTab, setActiveTab] = useState<ThunderdomeTab>("synthesis");

  const tabs = [
    { id: "synthesis" as const, label: "Auto-Analyze", icon: Sparkles, description: "All 7 agents + synthesis" },
    { id: "perspectives" as const, label: "Perspectives", icon: Zap, description: "5 personas, one at a time" },
    { id: "expand" as const, label: "Expand", icon: Maximize2, description: "What else could this be?" },
    { id: "contract" as const, label: "Distill", icon: Minimize2, description: "What's the one thing?" },
  ];

  return (
    <div className="mb-8 relative">
      {/* Full-bleed mode break — distinct from the report above */}
      <div
        className="absolute inset-0 -mx-6 sm:-mx-8 rounded-none"
        style={{
          background: "linear-gradient(180deg, hsl(var(--primary) / 0.06) 0%, transparent 100%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 py-8"
      >
        {/* Mode-shift header — feels like entering a different space */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--accent) / 0.15))",
              boxShadow: "0 0 24px hsl(var(--primary) / 0.15), inset 0 1px 1px hsl(var(--primary) / 0.2)",
            }}
          >
            <Zap size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-black text-foreground tracking-tight">Stress-test the whole idea</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Run all 7 agents at once · or explore one lens at a time
            </p>
          </div>
        </div>

        {/* Tabs — larger, bolder treatment */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isPrimary = tab.id === "synthesis";
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg text-xs transition-all border ${
                  isActive
                    ? isPrimary
                      ? "bg-primary/15 border-primary/50 text-foreground shadow-sm ring-1 ring-primary/20"
                      : "bg-primary/10 border-primary/30 text-foreground shadow-sm"
                    : isPrimary
                    ? "bg-primary/5 border-primary/30 text-foreground hover:border-primary/50"
                    : "bg-card/30 border-border/30 text-muted-foreground hover:border-border/60 hover:text-foreground"
                }`}
              >
                <Icon size={16} className={isActive || isPrimary ? "text-primary" : ""} />
                <span className="font-semibold">{tab.label}</span>
                <span className="text-[9px] text-muted-foreground hidden sm:block">{tab.description}</span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/30 mb-6" />

        {/* Tab content with animation */}
        <AnimatePresence mode="wait">
          {activeTab === "synthesis" && (
            <motion.div key="synthesis" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <SynthesisPanel
                brief={brief}
                idea={idea}
                reportId={reportId}
                highlights={highlights}
                antiHighlights={antiHighlights}
                lovablePrompt={lovablePrompt}
                onPromptUpdate={onPromptUpdate}
              />
            </motion.div>
          )}
          {activeTab === "perspectives" && (
            <motion.div key="perspectives" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <PerspectivesPanel brief={brief} idea={idea} reportId={reportId} />
            </motion.div>
          )}
          {activeTab === "expand" && (
            <motion.div key="expand" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <ExpandContractPanel mode="expand" brief={brief} idea={idea} highlights={highlights} antiHighlights={antiHighlights} reportId={reportId} />
            </motion.div>
          )}
          {activeTab === "contract" && (
            <motion.div key="contract" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <ExpandContractPanel mode="contract" brief={brief} idea={idea} highlights={highlights} antiHighlights={antiHighlights} reportId={reportId} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ThunderdomePanel;
