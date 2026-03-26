import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const promptToolSchema = {
  type: "function" as const,
  function: {
    name: "generate_refined_prompt",
    description: "Generate a refined Lovable prompt incorporating Thunderdome feedback.",
    parameters: {
      type: "object",
      properties: {
        lovable_prompt: {
          type: "string",
          description: "The complete refined Lovable prompt. Follow the exact same structured format as the original (CONTEXT, APP TYPE, DESIGN SYSTEM, HERO, SECTIONS, FORMS, FOOTER, METADATA, POST-BUILD VERIFICATION). 800-1500 words.",
        },
        version_label: {
          type: "string",
          description: "A short label describing what changed in this version.",
        },
        changes_from_original: {
          type: "array",
          items: { type: "string" },
          description: "3-5 bullet points describing what changed from the previous version and why.",
        },
      },
      required: ["lovable_prompt", "version_label", "changes_from_original"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      brief, idea, original_prompt, perspectives, distillation,
      annotations, highlights, antiHighlights, refinement_context,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const briefContext = typeof brief === "object"
      ? Object.entries(brief)
          .filter(([k]) => k !== "scale_assessment")
          .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
          .join("\n")
      : String(brief);

    let context = `Original idea: "${idea}"\n\nBrief:\n${briefContext}\n\n`;

    if (original_prompt) {
      context += `Previous Lovable prompt (to improve upon):\n${original_prompt}\n\n`;
    }

    if (perspectives && perspectives.length > 0) {
      context += `Persona perspectives the user reviewed:\n`;
      perspectives.forEach((p: any) => {
        context += `- ${p.persona}: ${p.headline || p.perspective?.slice(0, 200)}\n`;
      });
      context += `\n`;
    }

    if (distillation) {
      context += `Distillation results:\n`;
      context += `- Core thesis: ${distillation.thesis_statement}\n`;
      context += `- One feature: ${distillation.one_feature}\n`;
      context += `- One customer: ${distillation.one_customer}\n`;
      context += `- MVP scope: ${distillation.mvp_scope}\n`;
      context += `- Cut from V1: ${distillation.what_to_cut?.join(", ")}\n\n`;
    }

    if (annotations && annotations.length > 0) {
      context += `User annotations on the brief:\n`;
      annotations.forEach((a: any) => {
        context += `- [${a.type}] on "${a.section}": ${a.content}\n`;
      });
      context += `\n`;
    }

    if (highlights?.length > 0) {
      context += `Sections that RESONATE (prioritize): ${highlights.join(", ")}\n`;
    }
    if (antiHighlights?.length > 0) {
      context += `Sections to DEPRIORITIZE: ${antiHighlights.join(", ")}\n`;
    }

    if (refinement_context) {
      context += `\nAdditional refinement context: ${refinement_context}\n`;
    }

    const systemPrompt = `You are a Lovable prompt engineer. Your job is to generate a REFINED version of a Lovable build prompt that incorporates feedback from multiple AI perspectives, user annotations, and distillation.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

RULES:
1. Follow the exact structured format: CONTEXT → APP TYPE → DESIGN SYSTEM → HERO → SECTIONS → FORMS → FOOTER → METADATA → POST-BUILD VERIFICATION
2. Every button has a click action. Every section has mobile behavior. All copy is real.
3. If distillation data exists, this is a SIMPLIFIED version — fewer sections, tighter scope, focused on the one core feature.
4. If perspective data exists, incorporate the strongest feedback — especially from The Skeptic (risks to address) and The Customer (what they'd actually pay for).
5. If annotations exist, treat them as direct overrides — the user knows their product better than the AI.
6. Sections the user highlighted get 2x detail. Sections they flagged get minimal treatment or are removed.
7. 800-1500 words. Specific and actionable.`;

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
            { role: "user", content: context },
          ],
          tools: [promptToolSchema],
          tool_choice: {
            type: "function",
            function: { name: "generate_refined_prompt" },
          },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("refine-prompt error:", response.status, text);
      return new Response(JSON.stringify({ error: response.status === 429 ? "Rate limited. Try again in a moment." : response.status === 402 ? "Credits exhausted." : "AI service error" }), {
        status: response.status === 429 ? 429 : response.status === 402 ? 402 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Failed to generate refined prompt" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refine-prompt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
