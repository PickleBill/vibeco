// Question types ("lenses"). Same agents and brief slots for every lens; the
// lens changes what each slot means, the follow-up questions, and the final
// deliverable. Mirrors src/lib/lenses.ts (labels live there).
import type { Lens } from "./types.ts";
import { asSeller, sellerAgentNote } from "./sellers/index.ts";

export const LENS_IDS: Lens[] = ["idea", "company", "initiative", "decision", "account"];

/**
 * Express lenses answer in one round: no follow-up questions, and the
 * deliverable comes back in the first response.
 */
export function isExpress(lens: Lens | undefined): boolean {
  return lens === "account";
}

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
      format: "A one-page briefing in plain text with short headings: 1) What they do, in one line. 2) What matters to them right now (3 bullets). 3) Where the openings are (2-3 bullets). 4) Five questions to ask. 5) One idea worth bringing into the conversation. 6) What to verify before relying on this. Cite live sources inline as [1], [2] where they support a point; if there were none, say so. 300-600 words.",
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
  account: {
    kind: "target account: a company they want to win as a customer, researched before a first sales call",
    slots: {
      problem: "Their data and analytics situation today and the pressure on it right now, specific to this company, with [n] citations.",
      target_customer: "The buying committee by role (for example Head of Data, analytics engineering lead, CFO, business-unit leaders) and what each cares about. Include a person's name ONLY when a cited source shows it, with the citation; otherwise roles only.",
      core_features: "Stack signals, one line per named tool or capability, covering Warehouse, Transformation, BI tools, AI and Embedded analytics. Each line is tagged Confirmed (a cited source names it), Inferred (likely, but no source names it) or Not found.",
      revenue_model: "Why now, as dated trigger events from the last 12 months, one per line: 'YYYY-MM: event [n]'. Use 'Date not found' when a source gives no date. Only events that a source shows; if there are none, write 'No dated trigger events found in the sources.'",
      industry_trends: "What they run today for analytics, and who else would likely be in the deal (the incumbent BI vendor and other tools they might evaluate), each marked Confirmed or Inferred.",
      investor_perspective: "What to verify before a first call: 3-5 specific facts this brief could not confirm.",
      customer_perspective: "What their business users would say about getting answers from data today, in the first person. This is SYNTHETIC, not real quotes: start with 'Synthetic:'.",
    },
    followUps: "None: this lens answers in one round.",
    deliverable: {
      name: "First-call plan",
      format: "A first-call plan, 300-600 words: the account in one line; the stack read, each line tagged Confirmed, Inferred or Not found with [n] citations; why now; who to start with and why; seven discovery questions; the migration objection with an honest answer; what to verify; a fit grade A, B or C with the reason; and whether the company is on the seller's public customer list. Never include outreach emails or messages.",
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
export function lensAgentNote(lens: Lens, brief?: unknown): string {
  const spec = lensSpec(lens);
  if (!spec) return "";
  const slotGuide = Object.entries(spec.slots).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  // Account briefs are written for a seller; downstream agents need to know who.
  const seller = lens === "account" ? asSeller((brief as { seller?: unknown } | null)?.seller) : undefined;
  const sellerNote = seller ? sellerAgentNote(seller) : "";
  const accountRules = lens === "account"
    ? "\nNever write outreach emails or messages. Use people's names only when the brief's sources show them; otherwise use roles. Critic voices are synthetic: they may refer to the people the brief's sources name, but never invent a name."
    : "";
  return `

IMPORTANT CONTEXT: This is NOT a product or app idea. The user brought a ${spec.kind}. Respond to the question as asked. Do not recommend building an app, tool or startup unless the question is about building one. Wherever your role mentions a product, founder, customers, features or revenue, read them as the question, the person asking, the people affected, the options or components, and the costs and benefits. The brief's fields mean:
${slotGuide}${sellerNote}${accountRules}`;
}

/** For refine-prompt: the "prompt" of a non-idea report is its deliverable. */
export function deliverableNote(lens: Lens): string {
  const spec = lensSpec(lens);
  if (!spec) return "";
  return `

The document you are improving is the user's ${spec.deliverable.name}, NOT a Lovable build prompt. Keep it as a ${spec.deliverable.name} in this format: ${spec.deliverable.format} Put the improved document in the lovable_prompt field.`;
}

// ─── Critics (Phase B) ───
// The five persona ids are fixed (a DB check constraint on idea_perspectives),
// so each lens redefines who sits in each seat. Names and taglines mirror
// src/lib/lenses.ts (CRITICS).

type Seat = "skeptic" | "champion" | "competitor" | "customer" | "builder";

const CLOSE = "End with 2 sharp questions the user should answer next.";

export const CRITIC_PROMPTS: Record<Exclude<Lens, "idea">, Record<Seat, string>> = {
  company: {
    champion: `You are The Bull Analyst: you see why this company or market wins from here. Give the 3-4 strongest reasons for optimism, grounded in the brief and its sources, and what would have to stay true for each. ${CLOSE}`,
    skeptic: `You are The Bear Analyst: you see what could go wrong for this company or market. Give the 3-4 biggest risks or weak spots, how likely each is, and the signal that would confirm it. ${CLOSE}`,
    competitor: `You are A Competitor's strategist. Explain where you'd attack this company, where it is strong against you, and what it will likely do next. ${CLOSE}`,
    customer: `You are A Customer of this company. Speak in the first person: what you value, what frustrates you, what would make you spend more, and what would make you leave. ${CLOSE}`,
    builder: `You are An Insider: a senior employee who knows how this company actually works. Explain its real priorities, how decisions get made, where the pressure is inside, and what an outsider usually gets wrong. ${CLOSE}`,
  },
  initiative: {
    champion: `You are The Executive Sponsor. Make the strongest case for this initiative: the payoff, why now, and what you need from others to make it work. ${CLOSE}`,
    skeptic: `You are The CFO. Challenge the business case: costs, hidden effort, what it replaces, and the evidence you'd need before funding more than a pilot. ${CLOSE}`,
    competitor: `You are The Blocker: the team or leader most likely to resist this. Explain honestly why you'd push back, what you'd protect, and what would win you over. ${CLOSE}`,
    customer: `You are A Frontline User who will have to live with this day to day. Speak in the first person: what would help, what would annoy you, and what would make you quietly stop using it. ${CLOSE}`,
    builder: `You are The Operator who has to implement it. Cover what's hard, what to fake or skip in a pilot, dependencies, and a realistic timeline. ${CLOSE}`,
  },
  decision: {
    champion: `You are The Advocate for the leading option. Make its strongest honest case, name what it costs, and say what would prove it right. ${CLOSE}`,
    skeptic: `You are The Advocate for the alternative. Make the strongest honest case for the other path, and name the risk of the leading option that others are underweighting. ${CLOSE}`,
    competitor: `You are The Voice of Precedent: someone who has seen this kind of decision play out many times. Share the patterns, the usual mistakes, and how it tends to end. ${CLOSE}`,
    customer: `You are The Person Most Affected by the outcome. Speak in the first person about what each path means for you, and what you need from whoever decides. ${CLOSE}`,
    builder: `You are The Fair Advisor. Turn the disagreement into 3 clear criteria, a way to test the leading option cheaply, and the milestone and date that should settle it. ${CLOSE}`,
  },
  // {SELLER} is replaced with the seller's name (or "a new analytics vendor").
  account: {
    champion: `You are the Head of Data at this account. A seller from {SELLER} wants a first meeting. Say why you'd take it: the pain on your team that makes 30 minutes worth it, grounded in the brief and its sources, and what you'd need to see in that meeting. ${CLOSE}`,
    skeptic: `You are the CFO at this account. Explain why you wouldn't buy from {SELLER} this year: budget timing, overlap with tools you already pay for, switching cost, and the proof that would change your mind. ${CLOSE}`,
    competitor: `You are the account executive for this account's incumbent BI vendor. Explain how you'd defend the account against {SELLER}: what you'd say about migration risk, bundling and existing investment, and where you are honestly vulnerable. ${CLOSE}`,
    customer: `You are a business user at this account (a manager in sales, finance or operations). Speak in the first person about what you can't get from data today, how long answers take, and what you'd want instead. You are a synthetic voice, not a real person. ${CLOSE}`,
    builder: `You are an analytics engineer at this account. Explain what moving to {SELLER} would really take: models and dashboards to migrate, dbt or warehouse work, permissions, and how long. Be honest about the effort. ${CLOSE}`,
  },
};

export function criticPrompt(lens: Lens, seat: string, brief?: unknown): string | undefined {
  if (lens === "idea") return undefined;
  const prompt = CRITIC_PROMPTS[lens][seat as Seat];
  const seller = asSeller((brief as { seller?: unknown } | null)?.seller);
  return prompt?.replaceAll("{SELLER}", seller?.name ?? "a new analytics vendor");
}

// ─── Distill (Phase B) ───
// The distill schema keeps one_feature / one_customer / one_revenue; each lens
// redefines what those three slots hold. Labels mirror src/lib/lenses.ts.

export const DISTILL_SLOTS: Record<Exclude<Lens, "idea">, Record<"one_feature" | "one_customer" | "one_revenue" | "thesis_statement" | "what_to_cut" | "mvp_scope", string>> = {
  company: {
    one_feature: "The ONE insight about this company or market that matters most right now, and why.",
    one_customer: "The ONE question most worth asking them (or about them), and what the answer would reveal.",
    one_revenue: "The ONE idea worth bringing into a conversation with them, stated concretely.",
    thesis_statement: "One sentence: what this company needs most right now, and why.",
    what_to_cut: "3-5 things that look important but are noise for the user's purpose.",
    mvp_scope: "In 2-3 sentences, how to use this read in the user's next conversation.",
  },
  initiative: {
    one_feature: "The ONE workflow or component to pilot first, and why.",
    one_customer: "The ONE sponsor or stakeholder whose support matters most, and how to win it.",
    one_revenue: "The ONE metric that proves it worked, with a target.",
    thesis_statement: "One sentence: the initiative, who it helps, and the result it should deliver.",
    what_to_cut: "3-5 things to leave out of the first pilot.",
    mvp_scope: "The smallest pilot in 2-3 sentences: scope, who's involved, and duration.",
  },
  decision: {
    one_feature: "The milestone or metric, with a date, that should settle this decision.",
    one_customer: "Who has to agree for the decision to stick, and what they need to hear.",
    one_revenue: "A short, fair message the user could send to the other side today.",
    thesis_statement: "One sentence: the decision, the leaning, and why.",
    what_to_cut: "3-5 arguments or worries that are distracting from the real tradeoff.",
    mvp_scope: "In 2-3 sentences, the cheapest way to test the leading option before fully committing.",
  },
  account: {
    one_feature: "The ONE reason to call this account now, tied to a trigger or signal in the brief (cite it).",
    one_customer: "The ONE person to start with: a role, or a name only if a source shows it, and why them.",
    one_revenue: "The ONE question to open the first call with.",
    thesis_statement: "One sentence: why this account, why now, and the angle for the first call.",
    what_to_cut: "3-5 things that look relevant but aren't worth raising on a first call.",
    mvp_scope: "In 2-3 sentences, the goal of the first call and the next step to ask for. No outreach emails or messages.",
  },
};

export function distillSlots(lens: Lens) {
  return lens === "idea" ? undefined : DISTILL_SLOTS[lens];
}
