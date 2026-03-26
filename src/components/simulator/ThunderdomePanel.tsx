import { useState } from "react";
import { motion } from "framer-motion";
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mb-8 p-6 rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Zap size={16} className="text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">The Thunderdome</h2>
          <p className="font-mono text-[10px] text-muted-foreground">Stress-test, expand, and distill your idea</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/30 mb-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-mono text-xs transition-all ${
                isActive
                  ? "bg-background text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
              <span className="hidden sm:inline text-[9px] text-muted-foreground">{tab.description}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "perspectives" && (
        <PerspectivesPanel brief={brief} idea={idea} reportId={reportId} />
      )}

      {activeTab === "expand" && (
        <ExpandContractPanel mode="expand" brief={brief} idea={idea} highlights={highlights} antiHighlights={antiHighlights} />
      )}

      {activeTab === "contract" && (
        <ExpandContractPanel mode="contract" brief={brief} idea={idea} highlights={highlights} antiHighlights={antiHighlights} />
      )}
    </motion.div>
  );
};

export default ThunderdomePanel;
