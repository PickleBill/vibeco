import { callLLMWithTool } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import { lensAgentNote, lensOf } from "../lens.ts";
import { formatBriefContext } from "./persona.ts";
import type { ExpandInput, ExpandResult } from "../types.ts";
import { accountOutputTidy } from "./account.ts";

// ─── Tool Schema ───

export const expandToolSchema = {
  type: "function" as const,
  function: {
    name: "generate_expansions",
    description: "Generate 3 orthogonal variations of a business idea.",
    parameters: {
      type: "object",
      properties: {
        core_insight: {
          type: "string",
          description: "The fundamental insight or capability underneath the user's idea, stated in one sentence.",
        },
        expansions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short name for this variation (3-6 words)" },
              pitch: { type: "string", description: "2-sentence elevator pitch for this variation." },
              how_its_different: { type: "string", description: "1 sentence on what changed: different market, different business model, or different delivery mechanism." },
              potential: { type: "string", enum: ["bigger-market", "easier-to-build", "less-competition", "faster-revenue"], description: "The main advantage of this variation over the original." },
              idea_text: { type: "string", description: "A complete idea description (2-3 sentences) that could be pasted directly into VibeCo's simulator to start a new simulation for this variation." },
            },
            required: ["title", "pitch", "how_its_different", "potential", "idea_text"],
            additionalProperties: false,
          },
          description: "Exactly 3 orthogonal variations.",
        },
      },
      required: ["core_insight", "expansions"],
      additionalProperties: false,
    },
  },
};

// ─── Core Logic ───

// Account lens: three ways in for the seller, not three new businesses.
const ACCOUNT_RULES = `You are a strategist helping a seller see three different ways into this account. The brief below is a target-account brief.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

Rules:
1. core_insight: the one thing about this account that makes it worth pursuing, in one sentence, with [n] citations from the brief.
2. Then 3 plays that each change ONE thing:
   - Play 1: a different starting team or buyer (same product, different door in).
   - Play 2: a different motion (internal analytics for its own teams vs. analytics inside its product for its customers), or a different use case if the brief rules that out.
   - Play 3: a different size of first step (a narrow wedge, or a broader platform conversation).
3. Ground every play in the brief and its sources, with [n] citations. Never invent numbers, dates, customers, partners, prices or headcounts; if a play depends on something the brief doesn't show, say what to confirm.
4. title: 3-6 words. pitch: 2 sentences on what you'd bring to that team and why it lands here. how_its_different: 1 sentence on what changed versus the obvious approach. potential: bigger-market = a bigger deal, easier-to-build = an easier start, less-competition = less competition, faster-revenue = a faster close.
5. idea_text: one sentence naming the account and the play, so it could be researched on its own. No outreach emails or messages.`;

export async function generateExpansions(input: ExpandInput): Promise<ExpandResult> {
  const briefContext = formatBriefContext(input.brief as unknown as Record<string, unknown>);
  const model = selectModel("expansion", { mode: input.mode });
  const lens = lensOf(input.brief);

  if (lens === "account") {
    const result = await callLLMWithTool<ExpandResult>({
      model,
      messages: [
        { role: "system", content: ACCOUNT_RULES + lensAgentNote(lens, input.brief) },
        { role: "user", content: `Target account: "${input.idea}"\n\nBrief:\n${briefContext}\n\nGive three plays.` },
      ],
      tools: [expandToolSchema],
      toolChoice: { type: "function", function: { name: "generate_expansions" } },
    });
    return accountOutputTidy(input.brief)(result);
  }

  const systemPrompt = `You are a creative strategist who helps founders see adjacent opportunities. Given a business idea and its analysis, generate 3 GENUINELY DIFFERENT variations.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

Rules:
1. First, identify the CORE INSIGHT — the fundamental capability or value proposition underneath the specific product.
2. Then generate 3 variations that keep the core insight but change ONE major dimension each:
   - Variation 1: Different TARGET MARKET (same product, different customers)
   - Variation 2: Different BUSINESS MODEL (same customers, different monetization or delivery)
   - Variation 3: Different SCALE (either much bigger or much smaller than the original)
3. Each variation must be specific enough to simulate on its own. Include real company names, market sizes, and pricing where relevant.
4. The idea_text for each variation should be a complete, standalone idea description — as if someone was typing it fresh into the simulator.`;

  const userContent = `Original idea: "${input.idea}"

Brief:
${briefContext}

Generate 3 orthogonal variations. Each should make the founder say "huh, I hadn't thought of that."`;

  return callLLMWithTool<ExpandResult>({
    model,
    messages: [
      { role: "system", content: systemPrompt + lensAgentNote(lensOf(input.brief), input.brief) },
      { role: "user", content: userContent },
    ],
    tools: [expandToolSchema],
    toolChoice: { type: "function", function: { name: "generate_expansions" } },
  });
}
