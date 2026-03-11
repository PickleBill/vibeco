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
            problem: { type: "string", description: "The core problem or opportunity — reference the EXACT product/service the user described. Use specific terminology from their idea." },
            target_customer: { type: "string", description: "A vivid named persona who would use THIS EXACT product. Include their name (e.g. 'Meet Sarah Chen, a...'), job title, age, daily frustrations, and why THIS specific product changes their workflow. Must directly reference the user's idea." },
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
              description: "3-5 features uniquely designed for THIS product. Name each feature with domain-specific language from the user's idea.",
            },
            revenue_model: { type: "string", description: "Specific pricing tiers with dollar amounts for THIS product's market. Reference the actual product." },
            industry_trends: { type: "string", description: "Name 2-3 REAL competing companies in this exact space, with real market data and trends. Reference the user's specific product category." },
            investor_perspective: { type: "string", description: "What a smart VC would specifically push back on about THIS idea. Include concrete concerns and questions referencing the actual product." },
            customer_perspective: { type: "string", description: "Direct quotes from the named target persona about THIS EXACT product — what excites them and what makes them hesitate. Use first person." },
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
          description: "3-4 strategic follow-up questions that reference the user's exact idea, product name, and target market",
        },
        is_final: {
          type: "boolean",
          description: "True if this is the final consolidated report with no more questions",
        },
        lovable_prompt: {
          type: "string",
          description: "ONLY for the final round (is_final=true). A comprehensive, ready-to-paste prompt for Lovable AI that would one-shot create a beautiful landing page for this product. Include: product name/concept, hero section copy, feature descriptions, target audience messaging, pricing section, testimonial style, visual direction (color palette, typography mood, layout style), and CTA copy. Write it as a direct instruction to an AI app builder. 800-1500 words.",
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
      systemPrompt = `You are VibeCo's AI Idea Simulator — a sharp, experienced startup advisor. Be direct and insightful.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH. Every single field must be in English. No Chinese, no other languages. English only.

CRITICAL SPECIFICITY RULES — READ THE USER'S IDEA CAREFULLY:
1. Read the user's idea word by word. Extract the specific product, service, industry, and use case they described.
2. EVERY field in your response must directly reference their specific idea. If they said "dog walking app", every field talks about dog walking. If they said "AI recipe generator", every field talks about recipes and cooking.
3. Target Customer: Create a named persona (e.g. "Meet 'Marcus Rivera', a 29-year-old...") who would ACTUALLY use this specific product. Their frustrations must relate to the exact problem the user's idea solves.
4. Problem: Describe the pain point using the user's own terminology and product domain.
5. Core Features: Each feature must use domain language from the user's idea. If it's a pet app, features reference pets. If it's a finance tool, features reference finances.
6. Revenue Model: Give pricing that makes sense for THIS specific market with dollar amounts.
7. Industry Trends: Name 2-3 REAL companies competing in this exact space.
8. Investor Perspective: Ask questions a VC would ask about THIS specific business model.
9. Customer Perspective: Write first-person quotes from the named persona about THIS product.

IMPORTANT: Set is_final to false. This is the first round — you MUST generate follow-up questions. Do NOT include lovable_prompt.

For follow-up questions:
- Generate exactly 2 strategic follow-up questions (not 3 or 4 — only 2).
- Each question must reference the user's specific idea by name or concept.
- Options must represent genuinely different strategic directions for THIS product.
- Never ask generic startup questions. Every question should feel tailored to this exact business.`;
      userContent = `Here is the user's idea. Read it carefully and generate an analysis that is 100% specific to what they described:\n\n"${idea}"`;
    } else {
      const isLastRound = round >= 3;
      systemPrompt = `You are VibeCo's AI Idea Simulator continuing a refinement session.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH. Every single field must be in English. No Chinese, no other languages. English only.

CRITICAL: Re-read the original idea and all previous rounds. Your updated analysis must:
1. Directly reference the specific product/service from the original idea
2. Incorporate the user's specific choices from previous rounds — mention their exact selections by name
3. Evolve each section based on the direction they chose — the brief should be DRAMATICALLY different from Round 1
4. Keep the same named persona but deepen their story based on choices made
5. Every section must reflect the cumulative refinements from all previous rounds

${isLastRound ? `This is the FINAL round. Set is_final to true. Generate the most comprehensive brief possible with:
- A concrete 90-day action plan with specific milestones
- Specific metrics to track (CAC, LTV, churn targets)
- Named competitors and differentiation strategy
- Revenue projections based on the pricing model they refined
- The follow_up_questions array must be empty.
- Your final brief must synthesize ALL the user's choices across rounds into a cohesive, actionable plan.
- Even if the user skipped questions or provided minimal answers, still generate the most comprehensive brief possible based on what you have.

ALSO generate the lovable_prompt field: Write a comprehensive, ready-to-paste prompt (800-1500 words) that someone could paste into Lovable to one-shot create a beautiful landing page for this product. Include specific hero copy, feature descriptions with the user's refined details, target audience messaging, pricing section based on their chosen model, visual direction (suggest specific color palette, typography mood, layout style), and compelling CTA copy. Write it as a direct instruction to an AI app builder.` : `This is round ${round} of 3. Set is_final to false. Do NOT include lovable_prompt. Ask exactly 3 NEW follow-up questions that dig deeper based on their specific choices. Reference what they chose and explore implications.`}`;
      userContent = `Full conversation history:\n\n${history}\n\nGenerate a${isLastRound ? " final comprehensive" : "n updated"} brief. Every section must reference the original idea and incorporate their choices.`;
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
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
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

    // SERVER-SIDE ENFORCEMENT: Never allow is_final on early rounds
    if (type === "initial" || (round && round < 3)) {
      result.is_final = false;
      delete result.lovable_prompt; // Strip prompt from non-final rounds
      // Ensure follow-up questions exist for non-final rounds
      if (!result.follow_up_questions || result.follow_up_questions.length === 0) {
        result.follow_up_questions = [
          {
            question: "What's the most important aspect of this idea to explore next?",
            options: [
              { label: "Go-to-market strategy", description: "How to acquire your first 100 users" },
              { label: "Technical feasibility", description: "What it takes to build the MVP" },
              { label: "Competitive moat", description: "How to stay ahead of copycats" },
            ],
            allow_multiple: false,
          },
        ];
      }
    } else if (round && round >= 3) {
      result.is_final = true;
      result.follow_up_questions = [];
    }

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
