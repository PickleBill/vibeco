// The guided tour: one key element per view, in the order the rail tells the
// story. Each step names the view it lives on and the data-tour target it
// points at; a target that isn't on the page gets a centered card instead.
import type { ModuleId } from "../nav";

export interface TourStep {
  module: ModuleId;
  /** The step opens on the territory's first account (the demo account). */
  withAccount?: boolean;
  /** The data-tour attribute on the element the step points at. */
  target: string;
  title: string;
  body: string;
}

export function tourSteps(sellerName: string): TourStep[] {
  return [
    {
      module: "radar",
      target: "radar",
      title: "The territory, re-checked",
      body: "Every account’s latest run on one radar. Closer to the center means a fresher trigger; pink means something new.",
    },
    {
      module: "radar",
      target: "change-card",
      title: "An account worth a call",
      body: "Why it matters and the one question to ask. Open the account, its committee or its Deal Room from here.",
    },
    {
      module: "account",
      withAccount: true,
      target: "agents",
      title: "Seven agents and a verdict",
      body: "This saved run opened instantly: seven agents read the account, then a verdict. Type any company at the top to run it live.",
    },
    {
      module: "committee",
      withAccount: true,
      target: "committee",
      title: "Simulate the buying room",
      body: "Press Run the meeting. Five synthetic critics debate and stances move. Read the path to yes, then take a seat yourself.",
    },
    {
      module: "deal",
      withAccount: true,
      target: "deal-view",
      title: "The link you’d send",
      body: "The prospect gets this link and marks each claim right, fix or not sure. Switch to Seller view to see corrections become discovery notes.",
    },
    {
      module: "lookalikes",
      target: "lookalikes-seed",
      title: "More like your customers",
      body: `Start from a customer on ${sellerName}’s public list. Every territory account is scored against it, trait by trait.`,
    },
  ];
}
