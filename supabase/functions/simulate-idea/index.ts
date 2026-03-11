import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toolSchema = {
  type: "function" as const,
  function: {
    name: "generate_idea_analysis",
    description:
      "Generate a structured idea analysis with brief sections and follow-up questions.",
    parameters: {
      type: "object",
      properties: {
        brief: {
          type: "object",
          properties: {
            problem: { type: "string", description: "The core problem or opportunity — be extremely specific to this exact idea, reference the actual product/service described" },
            target_customer: { type: "string", description: "A vivid, named persona that maps directly to the idea. Include their name, daily reality, specific frustrations, and why THIS product would change their life. Reference the actual product." },
            core_features: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                },
                required: ["name", "description"],
                additionalProperties: false,
              },
              description: "3-5 core features uniquely tailored to this specific idea",
            },
            revenue_model: { type: "string", description: "Specific pricing and monetization strategy for THIS product" },
            industry_trends: { type: "string", description: "Name real, specific competitors and market dynamics relevant to this exact space" },
            investor_perspective: { type: "string", description: "What a smart VC would push back on about THIS specific idea" },
            customer_perspective: { type: "string", description: "Direct quotes from the target persona about THIS product — what they'd love and what would make them hesitate" },
          },
          required: [
            "problem",
            "target_customer",
            "core_features",
            "revenue_model",
            "industry_trends",
            "investor_perspective",
            "customer_perspective",
          ],
          additionalProperties: false,
        },
        follow_up_questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["label", "description"],
                  additionalProperties: false,
                },
              },
              allow_multiple: { type: "boolean" },
            },
            required: ["question", "options", "allow_multiple"],
            additionalProperties: false,
          },
          description: "3-4 strategic follow-up questions deeply specific to this idea",
        },
        is_final: {
          type: "boolean",
          description: "True if this is the final consolidated report with no more questions",
        },
      },
      required: ["brief", "follow_up_questions", "is_final"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, idea, history, round } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt: string;
    let userContent: string;

    if (type === "initial") {
      systemPrompt = `You are VibeCo's AI Idea Simulator — a sharp, edgy startup advisor who analyzes raw ideas and turns them into structured business briefs. Be direct, insightful, and a little provocative. Don't sugarcoat. Find the real opportunity in every idea. Think like a founder who's shipped 10 products and an investor who's seen 1000 pitches.

CRITICAL: YOU MUST RESPOND ONLY IN ENGLISH. All text in every field must be in English. No other languages.

CRITICAL RULES FOR SPECIFICITY:
- Every single field MUST reference the actual idea the user described. Never use generic startup language.
- Target Customer: Create a vivid, named persona (e.g. "Meet 'Deadline Dave', a 34-year-old project manager at a 50-person agency who..."). The persona must be someone who would ACTUALLY use this specific product.
- Problem: Reference the actual pain point that this specific product solves. Use concrete scenarios.
- Core Features: Each feature must be uniquely designed for this product. Name them creatively with the product's domain language.
- Revenue Model: Give specific dollar amounts and pricing tiers relevant to this market.
- Industry Trends: Name REAL companies, REAL market data, REAL trends in this exact space.
- Investor Perspective: Ask questions a VC would actually ask about THIS business, not generic startup questions.
- Customer Perspective: Write as if you're quoting the actual target persona talking about THIS product.

For follow-up questions:
- Ask 3-4 questions that are DEEPLY SPECIFIC to this exact idea.
- Options should reference the actual product, its market, and its users by name.
- Each question should have 3-4 options that represent genuinely different strategic directions for THIS product.
- Questions should feel like a strategic conversation about THIS business, not a generic startup quiz.`;
      userContent = `Analyze this idea and generate a hyper-specific structured brief with follow-up questions that reference the actual idea throughout:\n\n"${idea}"`;
    } else {
      const isLastRound = round >= 3;
      systemPrompt = `You are VibeCo's AI Idea Simulator continuing a strategic refinement session. The user has answered your previous questions about their SPECIFIC idea.

CRITICAL: YOU MUST RESPOND ONLY IN ENGLISH. All text in every field must be in English. No other languages.

${isLastRound ? `This is the FINAL round. Set is_final to true. Generate the most comprehensive, actionable brief possible — every section must be deeply tailored to this exact idea with the refinements from all rounds incorporated. The follow_up_questions array should be empty. Include concrete next steps, specific metrics to track, and a 90-day action plan in the investor_perspective section.` : `This is refinement round ${round} of 3. Generate an updated, deeper brief incorporating the user's specific choices. Every section should evolve based on the direction they chose. Ask 3-4 NEW follow-up questions that dig even deeper — reference the specific choices they made and explore the implications for THIS product.`}`;
      userContent = `Here's the full conversation about this specific idea:\n\n${history}\n\nGenerate an ${isLastRound ? "final comprehensive" : "updated"} brief that deeply incorporates all their specific choices. Every section must reference the actual idea and choices made.`;
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          tools: [toolSchema],
          tool_choice: {
            type: "function",
            function: { name: "generate_idea_analysis" },
          },
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
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
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Failed to generate analysis" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("simulate-idea error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
