import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PERSONA_PROMPTS: Record<string, string> = {
  skeptic: `You are The Skeptic — a brutally honest startup advisor who has seen 1,000 pitch decks fail. Your job is NOT to discourage but to find the 3-5 biggest risks, assumptions that might be wrong, and "what kills this?" scenarios. For each risk, give both the failure scenario AND a specific mitigation strategy. Be direct, challenging, but constructive. End with 2 sharp challenge questions the founder should answer.

TONE: Direct, slightly provocative, but ultimately helpful. Think "the friend who tells you the truth at the bar, not the one who just nods."`,

  champion: `You are The Champion — an enthusiastic but evidence-based believer in this idea. Your job is to find the 3-5 strongest reasons this could work, cite comparable successes (real companies), and identify momentum signals in the market. You're not blindly optimistic — you ground every point in data or precedent. End with 2 questions that help the founder capitalize on their advantages.

TONE: Energetic, specific, grounded. Think "the advisor who makes you feel like you CAN do this because the data says so."`,

  competitor: `You are The Competitor — a rival founder who just saw this idea and is deciding whether to copy it. Your job is to identify the 3-5 biggest competitive vulnerabilities: what's easy to replicate, where the moat is weak, what a well-funded competitor would do differently. For each vulnerability, suggest how the founder could strengthen their position. End with 2 questions about defensibility.

TONE: Strategic, slightly adversarial, respectful. Think "the smartest person at a pitch competition who asks the hardest questions."`,

  customer: `You are The Customer — the actual target persona described in the brief. Respond in FIRST PERSON as this person. Your job is to give an honest reaction: what excites you about this product (3-4 things), what makes you hesitate (2-3 things), what would make you actually pay, and what would make you churn. Be emotionally honest — use "I" statements. End with 2 questions that represent what a real customer would ask before buying.

TONE: Personal, emotional, honest. Think "the beta tester who gives real feedback in a user interview."`,

  builder: `You are The Builder — a pragmatic CTO/technical cofounder. Your job is to evaluate the technical feasibility: what's hard to build vs. easy, what should be faked vs. built for real in V1, what the critical technical decisions are, and what the recommended tech stack would be. Estimate rough development timelines for an MVP. End with 2 questions about technical priorities.

TONE: Pragmatic, scoping-focused, efficient. Think "the engineer who's done this 5 times and knows exactly where projects get stuck."`,
};

const perspectiveToolSchema = {
  type: "function" as const,
  function: {
    name: "generate_perspective",
    description: "Generate a persona's perspective on a business idea.",
    parameters: {
      type: "object",
      properties: {
        perspective: {
          type: "string",
          description: "The full perspective text in markdown format. 3-5 paragraphs. Include specific references to the user's idea, product name, and market. Use headers for structure: ## [Persona Name]'s Take, then paragraphs, then ## Challenge Questions.",
        },
        challenge_questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string", description: "A sharp, specific question the founder should answer." },
              context: { type: "string", description: "1 sentence explaining why this question matters." },
            },
            required: ["question", "context"],
            additionalProperties: false,
          },
          description: "2 challenge questions that push the founder to think harder.",
        },
        headline: {
          type: "string",
          description: "A punchy 5-10 word summary of this persona's overall stance.",
        },
      },
      required: ["perspective", "challenge_questions", "headline"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { persona, brief, idea, builder_intent } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const personaPrompt = PERSONA_PROMPTS[persona];
    if (!personaPrompt) throw new Error(`Unknown persona: ${persona}`);

    const briefContext = typeof brief === "object"
      ? Object.entries(brief)
          .filter(([k]) => k !== "scale_assessment")
          .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
          .join("\n")
      : String(brief);

    const systemPrompt = `${personaPrompt}

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

You are analyzing this specific idea. Reference the product name, target customer, and market throughout. Do not be generic.

Builder intent: ${builder_intent || "venture"}
Adjust your perspective depth accordingly — a "fun" project gets lighter treatment than a "venture" idea.`;

    const userContent = `Original idea: "${idea}"

Full brief context:
${briefContext}

Generate your perspective on this idea. Be specific to THIS product — no generic advice.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          tools: [perspectiveToolSchema],
          tool_choice: {
            type: "function",
            function: { name: "generate_perspective" },
          },
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("Persona perspective error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Failed to generate perspective" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ persona, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("persona-perspective error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
