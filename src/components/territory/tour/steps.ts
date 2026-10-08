// The guided tour ("Demo in 2 minutes"): seven steps that tell the story on
// the territory's first account (the demo account). The front door, then
// the demo account's run (who they are, the agents and their verdict, a seat
// to take), the radar, lookalikes seeded with it, and its committee, which
// plays. Each step names the view it lives on and the data-tour target it
// points at; a target that isn't on the page falls back to the next one
// listed, then to a centered card. Bodies stay at 18 words or fewer. The Deal
// Room is in the rail but not on this path.
import type { SellerConfig } from "@/lib/sellers";
import { splitCompany } from "../model";
import type { ModuleId } from "../nav";
import { FRESH_DAYS } from "../radar/model";

export interface TourStep {
  module: ModuleId;
  /** The step opens on the demo account. */
  withAccount?: boolean;
  /** The data-tour attribute on the element the step points at. */
  target: string;
  /** Pointed at instead when the target doesn't show up (a fold that stays shut, a run without a verdict). */
  fallback?: string[];
  /** Folds and choices the step opens first, in order: each one pressed once if it's shut or not picked. */
  reveal?: string[];
  /** The step plays the saved committee meeting. */
  play?: boolean;
  title: string;
  body: string;
}

/** One line on who a demo account is, from its saved run's sources. Others get a plain line. */
const WHO: Record<string, string> = {
  Equifax: "Equifax, the Atlanta credit bureau, signed a $750M acquisition in July",
  Relay: "Relay: a Raleigh frontline-operations platform that just raised $36M",
};

export interface TourContext {
  /** The demo account's name ("Equifax"). */
  demo: string;
  /** The seller's name ("Omni"). */
  seller: string;
  /** The territory's name ("Southeast") and how many accounts are in it. */
  territory?: { name: string; count: number };
}

/** The seller's tour: its steps, on its territory's first saved run. */
export function sellerTour(seller: SellerConfig): { steps: TourStep[]; demoId?: string } {
  const first = seller.territory?.accounts[0];
  const territory = seller.territory && { name: seller.territory.name, count: seller.territory.accounts.length };
  return { steps: tourSteps({ demo: first ? splitCompany(first.company).name : "This account", seller: seller.name, territory }), demoId: first?.reportId };
}

/** The step's view is the one open: its module, and the demo account when it names one (the front door is the empty form). */
export function onStepView(s: TourStep, module: string, reportId: string | undefined, demoId: string | undefined) {
  if (module !== s.module) return false;
  if (!s.withAccount) return s.module !== "account" || !reportId;
  return !demoId || reportId === demoId;
}

/** The seven steps for the demo account. */
export function tourSteps({ demo, seller, territory }: TourContext): TourStep[] {
  const who = WHO[demo];
  const accounts = territory ? `${territory.count} ${territory.name} accounts.` : "Every territory account.";
  return [
    {
      module: "account",
      target: "company-box",
      title: "Any company, live",
      body: "Type any company and it runs live in about a minute. Or open a saved run instantly.",
    },
    {
      module: "account",
      withAccount: true,
      target: "whys",
      title: "Who they are",
      body: who ? `${who}. Then why change, why now, why ${seller}.` : `${demo}’s saved run. First, why change, why now, why ${seller}.`,
    },
    {
      module: "account",
      withAccount: true,
      target: "tensions",
      fallback: ["agents"],
      title: "Seven readers, one verdict",
      body: "Seven agents read the same sources at once. Where they disagree is where the deal is.",
    },
    {
      module: "account",
      withAccount: true,
      target: "take-seat",
      // Shut on phones: open "Explore one lens at a time", the stress test, then the CFO's seat.
      reveal: ["lens-fold", "lens-stress", "seat-skeptic"],
      fallback: ["lens-fold", "agents"],
      title: "Take a seat",
      body: `Answer the CFO. It grades your reply against ${demo}’s evidence and pushes back.`,
    },
    {
      module: "radar",
      target: "radar",
      title: "The territory",
      body: `${accounts} Pink means a dated trigger in the last ${FRESH_DAYS} days.`,
    },
    {
      module: "lookalikes",
      withAccount: true,
      target: "lookalikes-find",
      fallback: ["lookalikes-seed"],
      title: "More like it",
      body: `Find companies like ${demo} outside the territory, found on the web and checked before you see them.`,
    },
    {
      module: "committee",
      withAccount: true,
      target: "committee",
      play: true,
      title: "The buying room",
      body: "The Head of Data and the CFO argue it out. MEDDPICC shows what research can’t know.",
    },
  ];
}
