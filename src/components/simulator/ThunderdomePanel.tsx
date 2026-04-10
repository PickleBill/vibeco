import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Maximize2, Minimize2 } from "lucide-react";
import PerspectivesPanel from "./PerspectivesPanel";
import ExpandContractPanel from "./ExpandContractPanel";
import type { BriefData } from "./SimulatorShell";

type ThunderdomeTab = "perspectives" | "expand" | "contract";

interface Props {
  brief: BriefData;
  idea: string;
  reportId?: string | null;
  highlights?: Set<string>;
  antiHighlights?: Set<string>;
}

const ThunderdomePanel = ({ brief, idea, reportId, highlights, antiHighlights }: Props) => {
  const [activeTab, setActiveTab] = useState<ThunderdomeTab>("perspectives");

  const tabs = [
    { id: "perspectives" as const, label: "Perspectives", icon: Zap, description: "5 AI personas weigh in" },
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
            <h2 className="font-display text-xl font-black text-foreground tracking-tight">Deep Dive</h2>
            <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
              Stress-test · Expand · Distill — push this idea further
            </p>
          </div>
        </div>

        {/* Tabs — larger, bolder treatment */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg font-mono text-xs transition-all border ${
                  isActive
                    ? "bg-primary/10 border-primary/30 text-foreground shadow-sm"
                    : "bg-card/30 border-border/30 text-muted-foreground hover:border-border/60 hover:text-foreground"
                }`}
              >
                <Icon size={16} className={isActive ? "text-primary" : ""} />
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
