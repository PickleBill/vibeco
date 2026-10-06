import { useRef, useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { AccountBrief } from "../AccountViews";
import { AccountHero } from "./AccountHero";
import { AgentBoard } from "./AgentBoard";
import { CriticChat, type ChatTurn } from "./CriticChat";
import { LensExplorer, type LensId } from "./LensExplorer";
import { PlanTabs } from "./PlanTabs";
import { VerdictCard } from "./VerdictCard";
import type { AccountAnalysis, AgentId, CriticResult } from "./model";
import type { AgentBoardState } from "./useAgentBoard";

interface Props {
  company: string;
  brief: AccountBrief;
  plan: string | null;
  analysis: AccountAnalysis | null;
  board: AgentBoardState;
  sellerName?: string;
  /** Shown above the plan tabs (e.g. a note that the agents didn't finish). */
  notice?: ReactNode;
}

/**
 * One account run, answer first: the hero, the seven agents and their
 * verdict, one lens at a time, then the plan as tabs. The same view serves a
 * live run (the board fills as agents finish) and a saved one (it replays).
 */
export function AccountExplorer({ company, brief, plan, analysis, board, sellerName, notice }: Props) {
  const sources = Array.isArray(brief.research?.sources) ? brief.research!.sources : [];
  const [lens, setLens] = useState<LensId>("stress");
  const [seat, setSeat] = useState("champion");
  // One conversation per seat, kept while you switch seats.
  const [chats, setChats] = useState<Record<string, ChatTurn[]>>({});
  const answer = (s: string, critic: CriticResult) => (
    <CriticChat brief={brief} critic={critic} sources={sources} turns={chats[s] ?? []} onTurns={(t) => setChats((c) => ({ ...c, [s]: t }))} />
  );
  const lensRef = useRef<HTMLDivElement>(null);

  const openAgent = (id: AgentId) => {
    if (id === "expand" || id === "distill") setLens(id);
    else {
      setLens("stress");
      setSeat(id.replace("persona-", ""));
    }
    requestAnimationFrame(() => lensRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const agentsRunning = Object.values(board.tiles).some((t) => t.status === "running");

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6">
        <AccountHero company={company} brief={brief} sources={sources} sellerName={sellerName} />
        <AgentBoard board={board} onOpen={analysis ? openAgent : undefined} />
        <VerdictCard synthesis={analysis?.synthesis} state={board.verdict} sources={sources} />
        <div ref={lensRef} className="scroll-mt-24">
          {analysis ? (
            <LensExplorer
              analysis={analysis}
              brief={brief}
              sources={sources}
              lens={lens}
              onLens={setLens}
              seat={seat}
              onSeat={setSeat}
              answer={answer}
            />
          ) : agentsRunning ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" aria-hidden />
              Each seat&rsquo;s full take opens here when the agents finish. The plan is ready below.
            </p>
          ) : null}
        </div>
        {notice}
        <PlanTabs company={company} plan={plan} brief={brief} sources={sources} />
      </div>
    </MotionConfig>
  );
}
