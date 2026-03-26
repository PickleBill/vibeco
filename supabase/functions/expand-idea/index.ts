import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const expandToolSchema = {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brief, idea } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const briefContext = typeof brief === "object"
      ? Object.entries(brief)
          .filter(([k]) => !["scale_assessment"].includes(k))
          .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
          .join("\n")
      : String(brief);

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

    const userContent = `Original idea: "${idea}"

Brief:
${briefContext}

Generate 3 orthogonal variations. Each should make the founder say "huh, I hadn't thought of that."`;

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
          tools: [expandToolSchema],
          tool_choice: {
            type: "function",
            function: { name: "generate_expansions" },
          },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("expand-idea error:", response.status, text);
      return new Response(JSON.stringify({ error: response.status === 429 ? "Rate limited. Try again in a moment." : response.status === 402 ? "Credits exhausted." : "AI service error" }), {
        status: response.status === 429 ? 429 : response.status === 402 ? 402 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Failed to generate expansions" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("expand-idea error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
