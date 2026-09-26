// Question types ("lenses"). Same agents and brief slots for every lens; the
// lens changes what each slot means, the follow-up questions, and the final
// deliverable. Mirrors src/lib/lenses.ts (labels live there).
import type { Lens } from "./types.ts";

export const LENS_IDS: Lens[] = ["idea", "company", "initiative", "decision"];

// `lens` arrives from request bodies and stored briefs, so only accept known ids.
export function asLens(value: unknown): Lens | undefined {
  return typeof value === "string" && (LENS_IDS as string[]).includes(value) ? (value as Lens) : undefined;
}

/** The lens a stored brief was produced under ("idea" for older briefs). */
export function lensOf(brief: unknown): Lens {
  return asLens((brief as { lens?: unknown } | null)?.lens) ?? "idea";
}

type Slot =
  | "problem"
  | "target_customer"
  | "core_features"
  | "revenue_model"
  | "industry_trends"
  | "investor_perspective"
  | "customer_perspective";

interface LensSpec {
  /** What the user brought, e.g. "decision or disagreement". */
  kind: string;
  slots: Record<Slot, string>;
  followUps: string;
  deliverable: { name: string; format: string };
}

// Only non-idea lenses need a spec; "idea" keeps the original product flow.
export const LENS_SPECS: Record<Exclude<Lens, "idea">, LensSpec> = {
  company: {
    kind: "company, market or topic they want to get smart on (often before an interview, sales call, partnership or investment)",
    slots: {
      problem: "What they do, the core problem they solve, and the biggest pressure they face right now.",
      target_customer: "Who their most important customers are and what those customers care about.",
      core_features: "3-5 key offerings or strategic levers that matter most to understand (name + one-line description each).",
      revenue_model: "How they make money: the business model and main revenue drivers. Label any figures as estimates.",
      industry_trends: "2-3 real competitors and the shifts reshaping this market.",
      investor_perspective: "The hard questions a sharp outsider (interviewer, analyst, partner) should ask, and what to verify before relying on this read.",
      customer_perspective: "First-person quotes from a representative customer: what they value and what frustrates them.",
    },
    followUps: "Ask why they're researching this (interview, sales call, partnership, investment, curiosity) and which angle matters most to them.",
    deliverable: {
      name: "Briefing",
      format: "A one-page briefing in plain text with short headings: 1) What they do, in one line. 2) What matters to them right now (3 bullets). 3) Where the openings are (2-3 bullets). 4) Five questions to ask. 5) One idea worth bringing into the conversation. 6) What to verify before relying on this. 300-600 words.",
    },
  },
  initiative: {
    kind: "business initiative a team is about to try, launch or change",
    slots: {
      problem: "The business problem the initiative addresses, and why now.",
      target_customer: "Who has to adopt or approve it (users, sponsor, likely blockers) and what each of them cares about.",
      core_features: "3-5 workstreams or components of the initiative (name + one-line description each).",
      revenue_model: "The business case: costs, savings or revenue impact, and timeline. Label figures as estimates.",
      industry_trends: "How similar initiatives have gone elsewhere: precedents, patterns and tools.",
      investor_perspective: "What an executive sponsor or CFO would challenge, and the risks that could sink it.",
      customer_perspective: "First-person quotes from the people who would have to adopt it day to day.",
    },
    followUps: "Ask about scope and constraints (budget, timeline, team) and who sponsors or could block it.",
    deliverable: {
      name: "Proposal memo",
      format: "A one-page proposal memo in plain text with short headings: 1) The ask, in one sentence. 2) Why now. 3) The pilot: scope, who's involved, 2-6 weeks. 4) Three success metrics. 5) Costs and risks, each with a mitigation. 6) The decision needed, and by when. 300-600 words.",
    },
  },
  decision: {
    kind: "decision to make, or a disagreement between people",
    slots: {
      problem: "The decision to be made, and why it is hard.",
      target_customer: "Who is most affected by the outcome, and what each side needs.",
      core_features: "The 2-4 realistic options, one per item: name the option and give its strongest case.",
      revenue_model: "Costs and benefits of the leading options, side by side. Label figures as estimates.",
      industry_trends: "Relevant precedents: how others facing this kind of decision chose, and what happened.",
      investor_perspective: "The questions a fair-minded, skeptical advisor would ask each side.",
      customer_perspective: "First-person quotes from each side of the decision, in their own words.",
    },
    followUps: "Ask about the criteria that matter most, the constraints, and what each side fears. Never ask what an app or product should do.",
    deliverable: {
      name: "Decision memo",
      format: "A one-page decision memo in plain text with short headings: 1) The decision, in one sentence. 2) The options, each with its strongest case. 3) The 3-5 criteria that matter. 4) A recommendation or leaning, with reasoning. 5) What would change the call: the milestone or metric, and the date that settles it. 6) A short, fair message the user could send to the other side. 300-600 words.",
    },
  },
};

export function lensSpec(lens: Lens | undefined): LensSpec | undefined {
  return lens && lens !== "idea" ? LENS_SPECS[lens] : undefined;
}

/**
 * Framing for downstream agents (critics, alternatives, distill, synthesis,
 * deep dives). Empty for the original idea flow.
 */
export function lensAgentNote(lens: Lens): string {
  const spec = lensSpec(lens);
  if (!spec) return "";
  const slotGuide = Object.entries(spec.slots).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  return `

IMPORTANT CONTEXT: This is NOT a product or app idea. The user brought a ${spec.kind}. Respond to the question as asked. Do not recommend building an app, tool or startup unless the question is about building one. Wherever your role mentions a product, founder, customers, features or revenue, read them as the question, the person asking, the people affected, the options or components, and the costs and benefits. The brief's fields mean:
${slotGuide}`;
}

/** For refine-prompt: the "prompt" of a non-idea report is its deliverable. */
export function deliverableNote(lens: Lens): string {
  const spec = lensSpec(lens);
  if (!spec) return "";
  return `

The document you are improving is the user's ${spec.deliverable.name}, NOT a Lovable build prompt. Keep it as a ${spec.deliverable.name} in this format: ${spec.deliverable.format} Put the improved document in the lovable_prompt field.`;
}
