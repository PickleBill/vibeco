/**
 * The four kinds of question the workbench takes. The same agents run for all
 * of them; the lens only changes how simulate-idea frames the brief.
 * Keep ids in sync with `Lens` in supabase/functions/_shared/types.ts.
 */
export type Lens = "idea" | "company" | "initiative" | "decision";

export const LENS_IDS: Lens[] = ["idea", "company", "initiative", "decision"];

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
  /** One line on what the run hands back, for the examples grid. */
  youGet: string;
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
  },
];

export function getLens(id: Lens): LensConfig {
  return LENSES.find((l) => l.id === id) ?? LENSES[0];
}

/** Link into the workbench with the question pre-filled for review (not auto-run). */
export function workbenchHref(lens: Lens, question?: string): string {
  const params = new URLSearchParams({ lens });
  if (question?.trim()) params.set("q", question.trim());
  return `/simulate?${params.toString()}`;
}
