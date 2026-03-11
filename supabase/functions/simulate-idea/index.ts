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
            problem: { type: "string", description: "The core problem or opportunity" },
            target_customer: { type: "string", description: "Who this is for" },
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
              description: "3-5 core features",
            },
            revenue_model: { type: "string", description: "How this makes money" },
            industry_trends: { type: "string", description: "Relevant market trends and competitors" },
            investor_perspective: { type: "string", description: "What investors would ask/think" },
            customer_perspective: { type: "string", description: "What target customers would say" },
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
          description: "3-4 strategic follow-up questions",
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
      systemPrompt = `You are VibeCo's AI Idea Simulator — a sharp, edgy startup advisor who analyzes raw ideas and turns them into structured business briefs. Be direct, insightful, and a little provocative. Don't sugarcoat. Find the real opportunity in every idea. Think like a founder who's shipped 10 products and an investor who's seen 1000 pitches. Use punchy language.

When generating the brief:
- Problem: Cut to the real pain point. Be specific.
- Target Customer: Name a real persona, not a demographic blob.
- Core Features: 3-5 features that matter on day one. No bloat.
- Revenue Model: Be specific about pricing and monetization.
- Industry Trends: Name real competitors and market dynamics.
- Investor Perspective: What a smart VC would push back on.
- Customer Perspective: What early users would love and hate.

For follow-up questions: Ask 3-4 strategic questions that would meaningfully shape the product direction. Make options specific and thought-provoking, not generic. Each question should have 3-4 options.`;
      userContent = `Analyze this idea and generate a structured brief with follow-up questions:\n\n"${idea}"`;
    } else {
      const isLastRound = round >= 3;
      systemPrompt = `You are VibeCo's AI Idea Simulator continuing a strategic refinement session. The user has answered your previous questions. Use their answers to dramatically deepen and sharpen the analysis. Be increasingly specific and strategic with each round.

${isLastRound ? "This is the FINAL round. Set is_final to true. Generate the most comprehensive, actionable brief possible. The follow_up_questions array should be empty. Make every section rich and specific — this is the user's takeaway document. Add concrete next steps in the investor_perspective section." : `This is refinement round ${round} of 3. Generate an updated, deeper brief incorporating the user's choices. Ask 3-4 NEW follow-up questions that dig even deeper based on their direction. Questions should be more specific and strategic than the previous round.`}`;
      userContent = `Here's the conversation so far:\n\n${history}\n\nGenerate an ${isLastRound ? "final comprehensive" : "updated"} brief based on everything discussed.`;
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
