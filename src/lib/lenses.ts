/**
 * The kinds of question VibeCo takes. The same agents run for all of them;
 * the lens only changes how simulate-idea frames the brief.
 * Keep ids in sync with `Lens` in supabase/functions/_shared/types.ts.
 *
 * "account" (target account) is written for a seller and answers in one
 * round. It isn't in the public picker (LENSES); it runs from /for/:seller
 * and /simulate?lens=account.
 */
export type Lens = "idea" | "company" | "initiative" | "decision" | "account";

export const LENS_IDS: Lens[] = ["idea", "company", "initiative", "decision", "account"];

export function isLens(value: string | null | undefined): value is Lens {
  return !!value && (LENS_IDS as string[]).includes(value);
}

interface Perspective {
  label: string;
  quote: string;
  note: string;
}

export interface LensConfig {
  id: Lens;
  label: string;
  tag: string;
  placeholder: string;
  startingQuestion: string;
  /** Hand-written illustration for the homepage card. Not an AI run. */
  example: {
    perspectives: Perspective[];
    nextMove: { title: string; body: string };
  };
  /** One line on what the run hands back, for the use-case cards. */
  youGet: string;
  /** When someone reaches for this lens, for the use-case cards. */
  useCase: { title: string; body: string };
}

export const LENSES: LensConfig[] = [
  {
    id: "idea",
    label: "Idea or app",
    tag: "Build",
    placeholder: "A rough idea is a perfectly good start…",
    startingQuestion: "How could coaches help more between sessions?",
    example: {
      perspectives: [
        {
          label: "Customer",
          quote: "I want to remember what to practice. Another dashboard might become another chore.",
          note: "Fit into the follow-up a coach already sends.",
        },
        {
          label: "Skeptic",
          quote: "Coaches already text their players. Why would they switch to something new?",
          note: "Prove it saves coach time before asking for a new habit.",
        },
        {
          label: "Builder",
          quote: "Start with a one-page practice plan a coach can edit and send in two minutes.",
          note: "No accounts and no dashboard in version one.",
        },
      ],
      nextMove: {
        title: "Test the follow-up. Then build the tool.",
        body: "Try a coach-reviewed practice plan with a small pilot. Look for repeat use before adding features.",
      },
    },
    youGet: "A brief, three alternative versions, a pressure test, and a build prompt you can paste into Lovable.",
    useCase: {
      title: "Pressure-test an idea before you build it",
      body: "For founders, product teams and weekend builders. See it from the customer, the skeptic and the builder, then run the smallest test worth running.",
    },
  },
  {
    id: "company",
    label: "Company or topic",
    tag: "Research",
    placeholder: "A company, a market, or a topic you want to get smart on…",
    startingQuestion: "What does a mid-size payments company need from its partner program right now?",
    example: {
      perspectives: [
        {
          label: "Customer",
          quote: "I don't care about the partner program. I care whether my payouts land on time.",
          note: "Partnerships win when they fix a customer problem, not when they fill a logo slot.",
        },
        {
          label: "Skeptic",
          quote: "Partner programs look busy on slides. Which partners actually move volume?",
          note: "Ask about the three partners that matter, not the list of forty.",
        },
        {
          label: "Hiring manager",
          quote: "I need someone who can open the door and then make the deal work day to day.",
          note: "Bring one concrete partner idea into the conversation.",
        },
      ],
      nextMove: {
        title: "Walk in with one partner idea, not a list.",
        body: "Pick the partner that fixes a real customer pain, sketch the deal on one page, and use it to steer the conversation.",
      },
    },
    youGet: "A clear read on how the company or market works, the hard questions to ask, and where the openings are.",
    useCase: {
      title: "Get smart on a company before a big conversation",
      body: "Interviews, sales calls, partnership pitches. Learn how they make money, what keeps them up at night, and the one idea worth bringing in.",
    },
  },
  {
    id: "initiative",
    label: "Business initiative",
    tag: "Initiative",
    placeholder: "Something your team is about to try, launch, or change…",
    startingQuestion: "Should our sales team roll out an AI assistant this quarter?",
    example: {
      perspectives: [
        {
          label: "Sales rep",
          quote: "If it adds clicks to my CRM, I'll stop using it by week two.",
          note: "Adoption lives or dies inside the tools reps already use.",
        },
        {
          label: "Skeptic",
          quote: "What does it replace? Show me hours saved, not a demo.",
          note: "Agree on the metric before the pilot starts.",
        },
        {
          label: "Builder",
          quote: "Start with one workflow: call notes to follow-up email.",
          note: "Measure time to send, not the number of features.",
        },
      ],
      nextMove: {
        title: "Pilot one workflow with five reps.",
        body: "Pick the most repeated task, run a two-week pilot, and measure time saved before a wider rollout.",
      },
    },
    youGet: "The business case, who has to say yes, what could sink it, and the smallest pilot worth running.",
    useCase: {
      title: "Stress-test an initiative before your team commits",
      body: "Rollouts, launches, new processes. Find out who has to say yes, what could sink it, and how to prove it small before going big.",
    },
  },
  {
    id: "decision",
    label: "Decision or disagreement",
    tag: "Decide",
    placeholder: "A call you need to make, or two sides that don't agree…",
    startingQuestion: "Two co-founders disagree: raise money now, or grow on revenue for another year?",
    example: {
      perspectives: [
        {
          label: "Champion",
          quote: "If we wait, a funded competitor takes the category.",
          note: "Name the competitor and the timeline. Vague fear decides nothing.",
        },
        {
          label: "Skeptic",
          quote: "Raising now sets a valuation we may not grow into.",
          note: "Model the next round, not just this one.",
        },
        {
          label: "Advisor",
          quote: "What result would change your mind? Decide that first.",
          note: "Turn the argument into a milestone and a date.",
        },
      ],
      nextMove: {
        title: "Agree on the milestone that settles it.",
        body: "Write down the one metric and date that would trigger a raise. Revisit then, instead of re-arguing every week.",
      },
    },
    youGet: "The options side by side, the strongest case for each, the tradeoffs, and a way to decide.",
    useCase: {
      title: "Work through a decision when people disagree",
      body: "Co-founders, teams, or just you at 11pm. Put each side's strongest case on the table and agree on what would settle it.",
    },
  },
];

/** Target account: unlisted, so the homepage and simulator pickers keep four types. */
export const ACCOUNT_LENS: LensConfig = {
  id: "account",
  label: "Target account",
  tag: "Account",
  placeholder: "Company name or domain",
  startingQuestion: "Guitar Center",
  example: {
    perspectives: [
      {
        label: "Head of Data",
        quote: "If you can show me fewer tools and faster answers, I'll take the meeting.",
        note: "Lead with the pain the sources show, not the product tour.",
      },
      {
        label: "CFO",
        quote: "We already pay for a BI tool. Why switch this year?",
        note: "Find the trigger that makes this year different.",
      },
      {
        label: "Analytics engineer",
        quote: "Migration is the real cost. Tell me what moves and how long it takes.",
        note: "Answer the migration question honestly before it's asked.",
      },
    ],
    nextMove: {
      title: "Open with the one question that matters to them.",
      body: "Start with the person the sources point to, and verify the stack before the call.",
    },
  },
  youGet: "A first-call plan: the stack read with sources, why now, who to start with, seven discovery questions and a fit grade.",
  useCase: {
    title: "Prepare a first sales call",
    body: "Type a company. Get its data stack, trigger events and buying committee from public sources, with every claim tied to a source.",
  },
};

export function isExpress(lens: Lens): boolean {
  return lens === "account";
}

export function getLens(id: Lens): LensConfig {
  if (id === "account") return ACCOUNT_LENS;
  return LENSES.find((l) => l.id === id) ?? LENSES[0];
}

/** Link into /simulate with the question pre-filled for review (not auto-run). */
export function questionHref(lens: Lens, question?: string): string {
  const params = new URLSearchParams({ lens });
  if (question?.trim()) params.set("q", question.trim());
  return `/simulate?${params.toString()}`;
}

// ─── Report rendering ───

/** The lens a saved brief was produced under (older briefs have none = "idea"). */
export function lensOfBrief(brief: { lens?: unknown } | null | undefined): Lens {
  const value = brief?.lens;
  return typeof value === "string" && isLens(value) ? value : "idea";
}

export type SectionKey =
  | "problem"
  | "target_customer"
  | "core_features"
  | "revenue_model"
  | "industry_trends"
  | "investor_perspective"
  | "customer_perspective";

// What each brief slot is called per lens. The idea lens keeps each
// component's own labels. Keep in sync with supabase/functions/_shared/lens.ts.
const SECTION_LABELS: Record<Exclude<Lens, "idea">, Record<SectionKey, string>> = {
  company: {
    problem: "What they do & the pressure they're under",
    target_customer: "Who they serve",
    core_features: "Key offerings & levers",
    revenue_model: "How they make money",
    industry_trends: "Competitors & market shifts",
    investor_perspective: "Questions to ask",
    customer_perspective: "What customers would say",
  },
  initiative: {
    problem: "The business problem",
    target_customer: "Who has to say yes",
    core_features: "Workstreams",
    revenue_model: "The business case",
    industry_trends: "How it's gone elsewhere",
    investor_perspective: "What leadership will challenge",
    customer_perspective: "What adopters would say",
  },
  decision: {
    problem: "The decision",
    target_customer: "Who it affects",
    core_features: "The options",
    revenue_model: "Costs & benefits",
    industry_trends: "Precedents",
    investor_perspective: "Questions for each side",
    customer_perspective: "Each side, in their own words",
  },
  account: {
    problem: "Data & analytics situation",
    target_customer: "Buying committee",
    core_features: "Stack signals",
    revenue_model: "Why now",
    industry_trends: "What they run today & who's in the deal",
    investor_perspective: "What to verify before the call",
    customer_perspective: "What business users would say (synthetic)",
  },
};

export function sectionLabel(lens: Lens, key: string, fallback: string): string {
  if (lens === "idea") return fallback;
  return SECTION_LABELS[lens][key as SectionKey] ?? fallback;
}

/** The final "Put it to work" document for each lens. */
export const DELIVERABLE_LABEL: Record<Lens, string> = {
  idea: "Lovable Prompt",
  company: "Briefing",
  initiative: "Proposal Memo",
  decision: "Decision Memo",
  account: "First-call Plan",
};

/** Stack lines on an account brief carry a tool and a tag; other lenses just name + description. */
export interface StackFeature {
  name: string;
  description: string;
  tool?: string;
  status?: "Confirmed" | "Inferred" | "Not found" | string;
  sources?: number[];
  evidence?: string;
  downgraded?: boolean;
}

/** "BI tools: Tableau (Confirmed)" for account stack lines; the name otherwise. */
export function featureTitle(feat: StackFeature): string {
  if (!feat.status) return feat.name;
  return feat.tool ? `${feat.name}: ${feat.tool} (${feat.status})` : `${feat.name}: ${feat.status}`;
}

// ─── Critics & distill (Phase B) ───
// Five fixed persona seats (DB constraint); each lens seats different critics.
// Keep in sync with CRITIC_PROMPTS / DISTILL_SLOTS in supabase/functions/_shared/lens.ts.

export type Seat = "skeptic" | "champion" | "competitor" | "customer" | "builder";

const CRITICS: Record<Exclude<Lens, "idea">, Record<Seat, { name: string; tagline: string }>> = {
  company: {
    champion: { name: "Bull analyst", tagline: "Why they win" },
    skeptic: { name: "Bear analyst", tagline: "What could go wrong" },
    competitor: { name: "Competitor", tagline: "Where I'd attack" },
    customer: { name: "Customer", tagline: "What I value" },
    builder: { name: "Insider", tagline: "How it really works" },
  },
  initiative: {
    champion: { name: "Sponsor", tagline: "Why it pays off" },
    skeptic: { name: "CFO", tagline: "Show me the case" },
    competitor: { name: "Blocker", tagline: "Why I'd resist" },
    customer: { name: "Frontline user", tagline: "Living with it" },
    builder: { name: "Operator", tagline: "How to run the pilot" },
  },
  decision: {
    champion: { name: "Leading option", tagline: "The strongest case" },
    skeptic: { name: "The alternative", tagline: "The other path" },
    competitor: { name: "Precedent", tagline: "How this usually ends" },
    customer: { name: "Most affected", tagline: "What it means for me" },
    builder: { name: "Fair advisor", tagline: "How to settle it" },
  },
  account: {
    champion: { name: "Head of Data", tagline: "Why I'd take the meeting" },
    skeptic: { name: "CFO", tagline: "Why I wouldn't buy this year" },
    competitor: { name: "Incumbent BI vendor", tagline: "How I'd defend the account" },
    customer: { name: "Business user", tagline: "What I can't get today" },
    builder: { name: "Analytics engineer", tagline: "What migration really takes" },
  },
};

/** Seat order for display. */
export const SEATS: Seat[] = ["champion", "skeptic", "competitor", "customer", "builder"];

/** Display name + tagline for a critic seat, or undefined to keep the idea-lens defaults. */
export function criticFor(lens: Lens, seat: string): { name: string; tagline: string } | undefined {
  return lens === "idea" ? undefined : CRITICS[lens][seat as Seat];
}

type DistillKey = "one_feature" | "one_customer" | "one_revenue";

const DISTILL_LABELS: Record<Exclude<Lens, "idea">, Record<DistillKey, string>> = {
  company: { one_feature: "The one insight", one_customer: "The one question to ask", one_revenue: "The one idea to bring" },
  initiative: { one_feature: "The one workflow to pilot", one_customer: "The one sponsor to win", one_revenue: "The one metric" },
  decision: { one_feature: "The milestone that settles it", one_customer: "Who has to agree", one_revenue: "The message to send" },
  account: { one_feature: "The one reason to call now", one_customer: "The one person to start with", one_revenue: "The one question to open with" },
};

export function distillLabel(lens: Lens, key: DistillKey, fallback: string): string {
  return lens === "idea" ? fallback : DISTILL_LABELS[lens][key];
}
