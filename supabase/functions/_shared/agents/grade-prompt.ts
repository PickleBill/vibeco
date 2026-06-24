import { callLLMWithTool } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import type { AnalysisMode } from "../types.ts";

// ─── Types ───

export interface GradePromptInput {
  lovable_prompt: string;
  mode?: AnalysisMode;
  premium?: boolean; // role-verified upstream; routes to GPT-5.5 when true
}

export interface GradeDimensionScores {
  context_goals: number;
  specificity: number;
  design_tokens: number;
  mobile_first: number;
  state_error_handling: number;
  avoiding_defaults: number;
}

export interface GradeAntiPattern {
  name: string;
  where: string;
  fix: string;
}

export interface GradePromptResult {
  scores: GradeDimensionScores;
  overall: number;
  anti_patterns_found: GradeAntiPattern[];
  top_fixes: string[];
}

// ─── Tool Schema (kept lean: short keys, no long enums) ───

export const gradePromptToolSchema = {
  type: "function" as const,
  function: {
    name: "grade_lovable_prompt",
    description:
      "Grade a generated Lovable build prompt against a 6-dimension rubric and detect known anti-patterns.",
    parameters: {
      type: "object",
      properties: {
        scores: {
          type: "object",
          properties: {
            context_goals: { type: "number", description: "0-10: states product context + goals clearly." },
            specificity: { type: "number", description: "0-10: concrete sections, copy, and actions vs vague vibes." },
            design_tokens: { type: "number", description: "0-10: explicit hex colors, fonts, button style, spacing." },
            mobile_first: { type: "number", description: "0-10: mobile behavior specified per section." },
            state_error_handling: { type: "number", description: "0-10: forms specify inline success + error states." },
            avoiding_defaults: { type: "number", description: "0-10: avoids platform-default branding / placeholder slop." },
          },
          required: [
            "context_goals",
            "specificity",
            "design_tokens",
            "mobile_first",
            "state_error_handling",
            "avoiding_defaults",
          ],
          additionalProperties: false,
        },
        overall: { type: "number", description: "0-10 overall prompt strength. Be honest, not generous." },
        anti_patterns_found: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Short anti-pattern name." },
              where: { type: "string", description: "Where in the prompt it occurs (section / quote)." },
              fix: { type: "string", description: "One-line concrete fix." },
            },
            required: ["name", "where", "fix"],
            additionalProperties: false,
          },
          description: "Anti-patterns actually present in this prompt. Empty array if none.",
        },
        top_fixes: {
          type: "array",
          items: { type: "string" },
          description: "1-4 highest-leverage one-line fixes, ordered by impact.",
        },
      },
      required: ["scores", "overall", "anti_patterns_found", "top_fixes"],
      additionalProperties: false,
    },
  },
};

// ─── Core Logic ───

// Default chain is cheap Gemini first. The primary model from selectModel()
// is Gemini for normal runs and GPT-5.5 when the caller is premium-verified.
const GRADE_FALLBACK_MODELS = [
  "google/gemini-2.5-pro",
  "openai/gpt-5",
  "google/gemini-3-flash-preview",
];

const SYSTEM_PROMPT = `You are a senior Lovable prompt reviewer. You grade the prompt a tool GENERATED, before a user pastes it — so a stronger prompt ships.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

Grade against these 6 dimensions (0-10 each):
1. Context & goals — does it state product context and goals up front?
2. Specificity — concrete sections, real copy, explicit click actions (not vague vibes)?
3. Design tokens — explicit hex colors, fonts, button style, spacing?
4. Mobile-first — is mobile behavior specified per section?
5. State/error handling — do forms specify inline success states AND error states?
6. Avoiding Lovable defaults — does it avoid platform-default branding and placeholder slop?

Detect these anti-patterns ONLY when actually present:
(1) "Add component X" without "render it on page Y".
(2) Section ID drift — a nav/footer href that doesn't match a section id.
(3) Platform-branding leakage — lovable.dev / gpt-engineer / storage.googleapis.com OG images, or a "Vite + React" title.
(4) "Build it" without mobile behavior specified.
(5) Missing post-success states on forms (toast only, no inline confirmation).

Be honest and specific. Quote the offending text in "where". Never invent problems that aren't in the prompt. The overall score should reflect the dimensions, not be inflated.`;

export async function gradePrompt(input: GradePromptInput): Promise<GradePromptResult> {
  const prompt = (input.lovable_prompt || "").trim();
  if (!prompt) {
    throw new Error("lovable_prompt is required and must be non-empty");
  }

  const primaryModel = selectModel("grade-prompt", { mode: input.mode, premium: input.premium });
  const modelChain = [primaryModel, ...GRADE_FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  const userContent = `Grade this generated Lovable build prompt:\n\n---\n${prompt}\n---`;

  let lastError: unknown;
  for (const model of modelChain) {
    try {
      const startedAt = Date.now();
      const result = await callLLMWithTool<GradePromptResult>({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [gradePromptToolSchema],
        toolChoice: { type: "function", function: { name: "grade_lovable_prompt" } },
      });
      console.log(`[grade-prompt] ✓ ${model} in ${Date.now() - startedAt}ms`);
      return result;
    } catch (e) {
      lastError = e;
      console.error(`[grade-prompt] ✗ ${model}: ${(e as Error).message}`);
      // continue to next model in the chain
    }
  }
  throw lastError ?? new Error("All grade-prompt models failed");
}
