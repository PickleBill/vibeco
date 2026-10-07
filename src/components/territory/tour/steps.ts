// The guided tour ("Demo in 60 seconds"): four steps in rail order, on the
// territory's first saved run (the demo account). Each step names the view it
// lives on and the data-tour target it points at; a target that isn't on the
// page gets a centered card instead. Bodies stay at 18 words or fewer. The
// Deal Room is in the rail but not on this path.
import type { ModuleId } from "../nav";

export interface TourStep {
  module: ModuleId;
  /** The step opens on the demo account. */
  withAccount?: boolean;
  /** The data-tour attribute on the element the step points at. */
  target: string;
  title: string;
  body: string;
}

/** The four steps, for the demo account's name ("Relay"). */
export function tourSteps(demo: string): TourStep[] {
  return [
    {
      module: "account",
      withAccount: true,
      target: "agents",
      title: "Run an account",
      body: `${demo}’s saved run: the three whys, seven agents and a verdict. Type any company to run it live.`,
    },
    {
      module: "radar",
      target: "radar",
      title: "Radar",
      body: "The territory at a glance: one dot per account. Pink means a fresh trigger worth a call.",
    },
    {
      module: "lookalikes",
      withAccount: true,
      target: "lookalikes-seed",
      title: "Lookalikes",
      body: `Seeded with ${demo}: find new companies like it, or see how the territory ranks against it.`,
    },
    {
      module: "committee",
      withAccount: true,
      target: "committee",
      title: `Committee for ${demo}`,
      body: "Run the meeting: five synthetic critics debate the deal. Take a seat, then check MEDDPICC for gaps.",
    },
  ];
}
