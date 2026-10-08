import { useMemo, useRef, useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { Loader2 } from "lucide-react";
import { readCommittee, type AnalysisWithCommittee } from "@/components/territory/committee/model";
import { splitCompany } from "@/components/territory/model";
import { threeWhys } from "@/components/territory/qualification/model";
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
  /** As typed ("Relay (relaypro.com)") or just the name. */
  company: string;
  brief: AccountBrief;
  plan: string | null;
  analysis: AccountAnalysis | null;
  board: AgentBoardState;
  sellerName?: string;
  /** Where the account is headquartered, when the territory knows ("Atlanta, GA"). */
  hq?: string;
  /** Shown above the plan tabs (e.g. a note that the agents didn't finish). */
  notice?: ReactNode;
}

/**
 * One account run, answer first: the hero, the seven agents and their
 * verdict, then two folds (one lens at a time, the plan as tabs), open on a
 * desktop and shut to a line each on a phone. The same view serves a
 * live run (the board fills as agents finish) and a saved one (it replays).
 */
export function AccountExplorer({ company: typed, brief, plan, analysis, board, sellerName, hq, notice }: Props) {
  const sources = Array.isArray(brief.research?.sources) ? brief.research!.sources : [];
  // "Relay (relaypro.com)": the name heads the page, the domain sits beside it.
  const { name, domain } = splitCompany(typed);
  const company = domain ? name : typed.replace(/\s*\([^)]*\)\s*$/, "");
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
    // The lens explorer folds on phones: open it first (its header is the first button in it), then scroll.
    const header = lensRef.current?.querySelector("button");
    const opening = header?.getAttribute("aria-expanded") === "false";
    if (opening) header!.click();
    const scroll = () => lensRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // A fold or a clamp that measures its height puts the page's scroll back, which stops a smooth scroll midway:
    // an opening fold measures on the next frame, so scroll a frame later, and finish the scroll once the lens has
    // swapped in and its clamps have measured.
    requestAnimationFrame(() => (opening ? requestAnimationFrame(scroll) : scroll()));
    window.setTimeout(() => {
      const el = lensRef.current;
      if (el && Math.abs(el.getBoundingClientRect().top - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0)) > 4) scroll();
    }, 450);
  };

  const agentsRunning = Object.values(board.tiles).some((t) => t.status === "running");
  // A saved run may carry its simulated meeting; the three whys read it when it's there.
  const meeting = useMemo(() => readCommittee((analysis as AnalysisWithCommittee | null)?.committee), [analysis]);
  const whys = useMemo(() => threeWhys(brief, analysis, meeting), [brief, analysis, meeting]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-5 sm:space-y-6">
        <AccountHero company={company} domain={domain} hq={hq} brief={brief} sources={sources} sellerName={sellerName} whys={whys} whysPending={!analysis && agentsRunning} />
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
            <p className="flex items-center gap-2 rounded-xl border border-dotted border-[#9097A6] px-4 py-3 text-[15px] text-[#4A4F63]">
              <Loader2 size={15} className="animate-spin text-foreground" aria-hidden />
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
