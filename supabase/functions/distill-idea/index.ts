import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const distillToolSchema = {
  type: "function" as const,
  function: {
    name: "generate_distillation",
    description: "Distill a business idea down to its essential core.",
    parameters: {
      type: "object",
      properties: {
        one_feature: {
          type: "string",
          description: "If you could only build ONE feature from this product, what is it? Name it specifically and explain why this single feature captures the core value.",
        },
        one_customer: {
          type: "string",
          description: "If you could only serve ONE type of person, who is it? Be specific — not 'small businesses' but 'freelance graphic designers who bill $5K-15K/month and lose 3+ hours/week on invoicing.'",
        },
        one_revenue: {
          type: "string",
          description: "If you could only charge for ONE thing, what is it? State the exact pricing: '$X/month for Y.' Explain why this is the one thing people would pay for.",
        },
        thesis_statement: {
          type: "string",
          description: "The Core Thesis Statement — one sentence that captures why anyone would care. Format: '[Target customer] will [action] because [product] [unique value that removes specific friction].'",
        },
        what_to_cut: {
          type: "array",
          items: { type: "string" },
          description: "3-5 specific things from the current brief that should be CUT from V1. Each item is a feature, market segment, or complexity that dilutes the core.",
        },
        mvp_scope: {
          type: "string",
          description: "What the distilled V1 looks like in 2-3 sentences. This should be buildable in 1-2 weeks by a solo developer using Lovable.",
        },
      },
      required: ["one_feature", "one_customer", "one_revenue", "thesis_statement", "what_to_cut", "mvp_scope"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brief, idea, highlights, antiHighlights } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const briefContext = typeof brief === "object"
      ? Object.entries(brief)
          .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
          .join("\n")
      : String(brief);

    let highlightContext = "";
    if (highlights?.length > 0) {
      highlightContext += `\nThe user highlighted these as RESONATING: ${highlights.join(", ")}`;
    }
    if (antiHighlights?.length > 0) {
      highlightContext += `\nThe user flagged these as NOT resonating: ${antiHighlights.join(", ")}`;
    }

    const systemPrompt = `You are a ruthless clarity engine. Your job is to take a business idea that has been analyzed and expanded, and DISTILL it to its absolute essence. Strip away everything that isn't the core.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

Rules:
1. The thesis statement must be ONE sentence. No ands, no commas that add clauses. One clear statement of value.
2. When choosing the one feature, one customer, one revenue stream — pick the ones with the highest signal (what the user highlighted as resonating, what the market data supports, what's simplest to build).
3. The what_to_cut list should be SPECIFIC — name actual features from the brief, not vague categories.
4. The MVP scope should be achievable with Lovable in 1-2 weeks. If it can't be, scope down further.
5. This is the "ruthless clarity" mode — it should feel like a senior advisor saying "stop overcomplicating this."`;

    const userContent = `Original idea: "${idea}"

Full brief:
${briefContext}
${highlightContext}

Distill this to its absolute core. What's the ONE thing that matters?`;

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
          tools: [distillToolSchema],
          tool_choice: {
            type: "function",
            function: { name: "generate_distillation" },
          },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("distill-idea error:", response.status, text);
      return new Response(JSON.stringify({ error: response.status === 429 ? "Rate limited. Try again in a moment." : response.status === 402 ? "Credits exhausted." : "AI service error" }), {
        status: response.status === 429 ? 429 : response.status === 402 ? 402 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Failed to generate distillation" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("distill-idea error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
