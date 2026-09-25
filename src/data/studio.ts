export type StudioPurpose = "build" | "research" | "initiative" | "decision";

export const studioStarters: {
  purpose: StudioPurpose;
  label: string;
  title: string;
  question: string;
  outcome: string;
}[] = [
  {
    purpose: "build", label: "Idea or app", title: "A useful idea. A smaller first step.",
    question: "Help independent coaches turn session notes into useful follow-up plans without adding more admin.",
    outcome: "A focused pilot, the assumptions behind it, and instructions for what to build.",
  },
  {
    purpose: "research", label: "Company or topic", title: "Go into the conversation prepared.",
    question: "Research a company before an interview: what should I understand about its customers, partnerships, and growth priorities?",
    outcome: "An evidence map, open questions, and a practical research brief.",
  },
  {
    purpose: "initiative", label: "Business initiative", title: "Give a promising initiative a fair test.",
    question: "Should we launch a partner referral program? Help me define a small pilot and the evidence that would justify expanding it.",
    outcome: "A decision, a bounded experiment, and the signals that would change your mind.",
  },
  {
    purpose: "decision", label: "Decision or disagreement", title: "Find the tradeoff underneath the debate.",
    question: "Our team disagrees about building a new feature or improving onboarding. Help us compare the tradeoffs and agree on the next experiment.",
    outcome: "Different perspectives, shared criteria, and an actionable next move.",
  },
];

export function workbenchUrl(purpose: StudioPurpose, question: string) {
  return `/simulate?${new URLSearchParams({ purpose, question }).toString()}`;
}

export interface StudioProject {
  name: string;
  description: string;
  url: string;
  category: string;
  thumbnail: string;
  maturity: "Product prototype" | "Website concept";
}

// Preserve the original public catalog. Labels describe these demonstrations;
// they do not assert customer adoption, operational readiness, or outcomes.
export const studioProjects: StudioProject[] = [
  { name: "Courtana", description: "Exploring how a coach's expertise can support a player between sessions.", url: "https://courtanacoach.lovable.app", category: "Coaching", thumbnail: "/builds/courtana.png", maturity: "Product prototype" },
  { name: "LitiGator AI", description: "An exploration of organizing arbitration research and case information.", url: "https://litigator.lovable.app", category: "Legal research", thumbnail: "/builds/litigator.png", maturity: "Product prototype" },
  { name: "NauticSim", description: "A simulation concept for exploring vessel operations and voyage tradeoffs.", url: "https://naughtydata.lovable.app", category: "Maritime", thumbnail: "/builds/nauticsim.png", maturity: "Product prototype" },
  { name: "State Policy Partners", description: "A concept for organizing legislative tracking and advocacy work.", url: "https://lobbyhobby.lovable.app", category: "Government affairs", thumbnail: "/builds/statepolicy.png", maturity: "Product prototype" },
  { name: "SizzleAI", description: "Exploring a cooking assistant that offers guidance in the kitchen.", url: "https://sous-chef-vision.lovable.app", category: "Food", thumbnail: "/builds/sizzleai.png", maturity: "Product prototype" },
  { name: "HeadsUp", description: "A concept for presenting industrial safety and equipment monitoring.", url: "https://headsuptime.lovable.app", category: "Industrial operations", thumbnail: "/builds/headsup.png", maturity: "Website concept" },
  { name: "Freakshow", description: "A brand and storefront concept for pickleball equipment.", url: "https://freak-flow-hub.lovable.app", category: "Sports & commerce", thumbnail: "/builds/freakshow.png", maturity: "Website concept" },
  { name: "RAUM", description: "A real estate experience combining property discovery and neighborhood context.", url: "https://unicorse.lovable.app", category: "Real estate", thumbnail: "/builds/raum.png", maturity: "Product prototype" },
  { name: "PicklePro Draft", description: "Exploring discovery and connections for pickleball players and mentors.", url: "https://audition.lovable.app", category: "Sports & community", thumbnail: "/builds/picklepro.png", maturity: "Product prototype" },
  { name: "The Load", description: "A playful approach to making household work visible and shared.", url: "https://theload.lovable.app", category: "Everyday life", thumbnail: "/builds/theload.png", maturity: "Product prototype" },
  { name: "FactFudge", description: "A guessing game about distinguishing real facts from invented ones.", url: "https://factfudge.lovable.app", category: "Play & learning", thumbnail: "/builds/factfudge.png", maturity: "Product prototype" },
  { name: "Green Paws", description: "A local lawn care website concept with services and booking journeys.", url: "https://greenpaws.lovable.app", category: "Local services", thumbnail: "/builds/greenpaws.png", maturity: "Website concept" },
  { name: "Raleigh Crafting", description: "A website concept for handmade work, workshops, and creative events.", url: "https://raleighcrafting.lovable.app", category: "Creative community", thumbnail: "/builds/raleighcrafting.png", maturity: "Website concept" },
  { name: "Moore Life & Wellness", description: "A practice website concept for explaining services and finding care.", url: "https://mooremental.lovable.app", category: "Practice website", thumbnail: "/builds/moorelife.png", maturity: "Website concept" },
];

export const selectedStories = [
  {
    project: studioProjects[0], number: "01", title: "Make expertise useful beyond the session.",
    question: "How could a coach's method reach a player at the moment they need it?",
    approach: "Translate a service into a repeatable product experience: a clear starting point, useful guidance, and a reason to come back.",
    lens: "Service → product",
  },
  {
    project: studioProjects[2], number: "02", title: "Make a complex tradeoff something you can explore.",
    question: "How do you help someone reason about a vessel's operational choices?",
    approach: "Use an interactive simulation to put the decision and its constraints in the same place.",
    lens: "Complexity → clarity",
  },
  {
    project: studioProjects[9], number: "03", title: "Find the human problem inside the workflow.",
    question: "What if sharing household work felt more visible, fair, and approachable?",
    approach: "Explore how language, visibility, and a little play can change the experience of a familiar problem.",
    lens: "Friction → participation",
  },
];
