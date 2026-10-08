import type { Research } from "./research.ts";
// ─── Shared types for all VibeCo agents ───
// These match the tool schemas used by the LLM function-calling interface.

// ─── Simulate ───

export interface BriefData {
  problem: string;
  target_customer: string;
  core_features: { name: string; description: string }[];
  revenue_model: string;
  industry_trends: string;
  investor_perspective: string;
  customer_perspective: string;
  app_type?: string;
  builder_intent?: string;
  scale_assessment?: {
    current_scale: "feature" | "experiment" | "product" | "platform";
    fits_intent: boolean;
    recommendation: string;
  };
  /** Question type the brief was produced under; absent on older briefs (= "idea"). */
  lens?: Lens;
  /** Live web sources behind a "company" brief (set server-side, cited as [n]). */
  research?: Research;
  /** Seller profile id an account brief was written for. */
  seller?: string;
}

export interface FollowUpQuestion {
  question: string;
  options: { label: string; description: string }[];
  allow_multiple: boolean;
}

export interface SimulationResult {
  brief: BriefData;
  follow_up_questions: FollowUpQuestion[];
  is_final: boolean;
  depth_recommendation?: "ready" | "one-more-recommended";
  lovable_prompt?: string;
  /** Account lens: the model that wrote the brief (diagnostics; not stored). */
  model?: string;
}

export interface DeepDiveResult {
  deep_dive: string;
}

// ─── Persona Perspective ───

export type PersonaType = "skeptic" | "champion" | "competitor" | "customer" | "builder";

export interface PerspectiveResult {
  persona: PersonaType;
  perspective: string;
  challenge_questions: { question: string; context: string }[];
  headline: string;
}

// ─── Expand ───

export interface ExpansionVariation {
  title: string;
  pitch: string;
  how_its_different: string;
  potential: "bigger-market" | "easier-to-build" | "less-competition" | "faster-revenue";
  idea_text: string;
}

export interface ExpandResult {
  core_insight: string;
  expansions: ExpansionVariation[];
}

// ─── Distill ───

export interface DistillResult {
  one_feature: string;
  one_customer: string;
  one_revenue: string;
  thesis_statement: string;
  what_to_cut: string[];
  mvp_scope: string;
}

// ─── Refine Prompt ───

export interface RefinePromptResult {
  lovable_prompt: string;
  version_label: string;
  changes_from_original: string[];
}

// ─── Alt Prompt ───

export type AltPromptType = "research" | "design_brief" | "landing_page";

export interface AltPromptResult {
  platform: string;
  prompt: string;
  description: string;
}

// ─── Landing Page ───

export interface LandingPageResult {
  html: string;
}

// ─── Image Generation ───

export type ImageType = "concept" | "logo";

export interface ImageResult {
  image_url: string;
}

// ─── Common Input Types ───

export type AnalysisMode = "fast" | "deep";

export interface BriefContext {
  brief: BriefData;
  idea: string;
  mode?: AnalysisMode;
}

/** Kind of question the workbench was asked. Mirrors src/lib/lenses.ts. */
export type Lens = "idea" | "company" | "initiative" | "decision" | "account";

export interface SimulateInput {
  /** "research" (account lens) returns sources only, so the UI can show them first. */
  type: "initial" | "refine" | "deep_dive" | "research";
  idea: string;
  mode?: AnalysisMode;
  lens?: Lens;
  /** brief.research from the previous round, so later rounds keep the same sources. */
  research?: unknown;
  /** Page excerpts returned by a "research" call, aligned with research.sources. */
  excerpts?: unknown;
  /** Seller profile id for the account lens (see _shared/sellers). */
  seller?: unknown;
  // Refine-specific
  history?: string;
  round?: number;
  // Deep-dive-specific
  section?: string;
  section_label?: string;
  brief?: BriefData;
}

export interface PersonaInput extends BriefContext {
  persona: PersonaType;
  builder_intent?: string;
}

export interface ExpandInput extends BriefContext {}

export interface DistillInput extends BriefContext {
  highlights?: string[];
  antiHighlights?: string[];
}

export interface StackItemInput {
  kind: "highlight" | "deep_dive" | "expansion" | "persona" | "distill" | "note";
  source?: string | null;
  label: string;
  content: string;
  pinned?: boolean;
}

export interface RefinePromptInput extends BriefContext {
  original_prompt?: string;
  perspectives?: PerspectiveResult[];
  distillation?: DistillResult;
  annotations?: { type: string; section: string; content: string }[];
  highlights?: string[];
  antiHighlights?: string[];
  refinement_context?: string;
  stack_items?: StackItemInput[];
  premium?: boolean; // role-verified upstream; routes to GPT-5.5 when true
}

// ─── critic-chat (answer an account critic) ───

export interface CriticChatTurn {
  role: "seller" | "critic";
  content: string;
}

export interface CriticChatInput {
  /** The account brief the critic read (lens "account"). */
  brief: Record<string, unknown>;
  seat: PersonaType;
  /** The seller's latest reply. */
  message: string;
  /** The challenge question being answered, if any. */
  question?: string;
  /** The critic's earlier take. */
  critic: { headline: string; perspective: string };
  /** Earlier turns, three exchanges at most. */
  history: CriticChatTurn[];
}

export interface CriticChatResult {
  reply: string;
  verdict: "strong" | "partial" | "misses";
  follow_up: string;
  model: string;
  latencyMs: number;
}

// ─── committee-sim (simulate an account's buying committee) ───

/** One account critic's earlier take, as the committee reads it. */
export interface CommitteeCritic {
  persona: PersonaType;
  headline: string;
  perspective: string;
  challenge_questions: string[];
}

/** Checked input for one simulated meeting. */
export interface CommitteeSimInput {
  /** The account brief (lens "account"). */
  brief: Record<string, unknown>;
  /** The critics' takes; at least one, one per seat. */
  perspectives: CommitteeCritic[];
  /** Hypotheticals the seller toggles, true for this run only (3 at most, 120 characters each). */
  what_if: string[];
  /** Where the plain run left each seat; a what-if run starts from it so the moves show the what-if's effect. */
  baseline?: CommitteeBaseline;
}

/** What the endpoint accepts: a saved run by id, or the brief and critics inline. */
export type CommitteeSimRequest =
  | { report_id: string; what_if?: string[] }
  | { brief: Record<string, unknown>; perspectives: unknown[]; what_if?: string[]; baseline?: unknown };

/** -2 blocks, -1 leans no, 0 neutral, 1 leans yes, 2 sponsors. */
export type CommitteeStance = -2 | -1 | 0 | 1 | 2;

/** The parts of a plain (no what-if) run a what-if run is compared with. */
export interface CommitteeBaseline {
  seats: { seat: PersonaType; stance_start: CommitteeStance; stance_end: CommitteeStance }[];
  outcome: { label: CommitteeOutcomeLabel; low: number; high: number };
}

export interface CommitteeSeat {
  seat: PersonaType;
  /** The account-lens role name ("Head of Data"), set in code. */
  role: string;
  stance_start: CommitteeStance;
  /** Always the seat's last stance_after (stance_start if it never spoke). */
  stance_end: CommitteeStance;
  influence: 1 | 2 | 3;
  top_concern: string;
}

export interface CommitteeTurn {
  seat: PersonaType;
  says: string;
  stance_after: CommitteeStance;
}

export interface CommitteeRound {
  title: string;
  turns: CommitteeTurn[];
}

export type CommitteeOutcomeLabel = "Likely yes" | "Coin flip" | "Uphill" | "Too early";

export interface CommitteeResult {
  /** Five seats, in the order champion, skeptic, competitor, customer, builder. */
  seats: CommitteeSeat[];
  rounds: CommitteeRound[];
  path_to_yes: { step: string; seat: PersonaType; why: string }[];
  main_blocker: { seat: PersonaType; why: string; what_would_flip_it: string };
  /** A synthetic estimate: a percent band in steps of 5, 10 to 30 wide. */
  outcome: {
    label: CommitteeOutcomeLabel;
    low: number;
    high: number;
    summary: string;
    /** The model's own call, before the band was weighted by the account's evidence. */
    model_label?: CommitteeOutcomeLabel;
    model_low?: number;
    model_high?: number;
  };
  /** The hypotheticals applied to this run (never stored). */
  what_if?: string[];
  model: string;
  latencyMs: number;
  /** Set on the copy saved to auto_analysis.committee. */
  generated_at?: string;
  /** True when served from auto_analysis.committee without a model call. */
  cached?: boolean;
}

// ─── suggest-accounts (companies like a seed, beyond the territory) ───

export type SuggestMotion = "Internal" | "Embedded" | "Both";

/** The account the suggestions should look like, read from its saved run. */
export interface SuggestSeed {
  name: string;
  domain?: string;
  motion: SuggestMotion | "Unclear";
  /** One plain line on the account. */
  line: string;
  /** Data tools its sources confirm. */
  tools: string[];
}

/** Checked input: names and domains already in the territory are never suggested. */
export interface SuggestAccountsInput {
  seed: SuggestSeed;
  exclude: string[];
  /** Default "Southeast US". */
  region: string;
  /** Default 6, at most 8. */
  count: number;
}

/** One unresearched company: a hypothesis to check, never a fact. */
export interface AccountSuggestion {
  name: string;
  /** Bare domain that answered over HTTPS. */
  domain: string;
  /** "City, ST", when the model gave one. */
  hq?: string;
  /** One short sentence phrased as a hypothesis; no digits. */
  why: string;
  motion_guess: SuggestMotion;
  /** Headcount from the page's company data, when the web search found it. */
  employees?: number;
  /** The page the web search found the company on. */
  source?: { url: string; title: string };
  /** Data tools the page's company data lists (third-party, not checked). */
  listedTools?: string[];
}

export interface SuggestAccountsResult {
  suggestions: AccountSuggestion[];
  model: string;
  latencyMs: number;
  /** Found on the web (Exa) and then picked, rather than named by the model alone. */
  grounded?: boolean;
  /** For a web search: companies found, how many sit in the region, how many were kept. */
  funnel?: { found: number; inRegion: number; kept: number };
}

export interface AltPromptInput {
  brief: BriefData;
  idea: string;
  prompt_type: AltPromptType;
  lovable_prompt?: string;
}

export interface LandingPageInput {
  prompt: string;
}

export interface ImageInput {
  idea: string;
  type: ImageType;
}

// ─── ask-bill (bricker-os terminal on Bill's dynamic résumé) ───

export interface AskBillMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskBillInput {
  question: string;
  history?: AskBillMessage[];
}

export interface AskBillResult {
  answer: string;
  model: string;
  latencyMs: number;
}

// ─── Whiteboard: partnership riff ───

export type RiffFit = "strong" | "possible" | "not_a_fit";
export type RiffBasis = "known" | "inferred";
export type RiffPricing = "platform_plus_per_customer" | "platform_plus_per_seat" | "custom";
/** [low, high] */
export type RiffRange = [number, number];

export interface RiffAssumptions {
  /** The company's own customers who could get the analytics. */
  end_customers: RiffRange;
  /** Share of them who pay for the analytics tier, in percent. */
  premium_adoption_pct: RiffRange;
  /** What the company charges each customer for the tier, per month. */
  premium_price_per_customer_month: RiffRange;
  /** People per customer account who'd use it. */
  seats_per_customer: RiffRange;
  /** Placeholders, not the seller's price list: the page lets you edit them. */
  omni_platform_fee_year: RiffRange;
  omni_per_customer_year: RiffRange;
  omni_per_seat_year: RiffRange;
}

/** A one-screen brief on how a company could put the seller's analytics inside its own product. */
export interface PartnerRiff {
  company: string;
  /** One sentence: the partnership idea. */
  headline: string;
  confidence: "high" | "medium" | "low";
  /** "sources": cited web pages; "model-knowledge": none found, unverified; "illustrative": a made-up example. */
  grounding: "sources" | "model-knowledge" | "illustrative";
  embedded_fit: { verdict: RiffFit; why: string };
  situation: { claim: string; basis: RiffBasis; sources: number[] }[];
  embedded_opportunity: { surface: string; end_customer_sees: string; metrics: string[] }[];
  integration: {
    stack: { tool: string; status: "Confirmed" | "Inferred"; sources: number[] }[];
    incumbent: { name: string; status: "Confirmed" | "Inferred"; sources: number[] } | null;
    omni_fit: string;
  };
  gtm: { pricing_shape: RiffPricing; monetization: string[]; assumptions: RiffAssumptions; notes: Partial<Record<keyof RiffAssumptions, string>> };
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  internal_play: string | null;
  next_move: { who: string; first_question: string };
}

export interface RiffSource {
  id: number;
  title: string;
  url: string;
  /** "company" (its company profile), "site" (its own pages), "jobs" (its own job posts), "web". */
  kind: "company" | "site" | "jobs" | "web";
  snippet: string;
}

export interface PartnerRiffResult {
  riff: PartnerRiff;
  sources: RiffSource[];
  model: string;
  latencyMs: number;
  /** Served from a saved riff of the same company (14 days). */
  cached?: boolean;
  savedAt?: string;
  reportId?: string;
}
