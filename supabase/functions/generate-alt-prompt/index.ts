import { corsHeaders } from "@supabase/supabase-js/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const LOVABLE_API_URL = "https://api.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { brief, idea, prompt_type, lovable_prompt } = await req.json();

    if (!brief || !idea || !prompt_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompts: Record<string, string> = {
      research: `You are a strategic research advisor. Given a product idea and its analysis brief, generate a comprehensive research prompt that a user can paste into ChatGPT or Claude to conduct deep market research, competitive analysis, and technical feasibility assessment.

The prompt should:
- Be self-contained (the AI receiving it needs full context)
- Include specific research questions based on the brief
- Ask for data sources and evidence
- Cover market sizing, competitor mapping, and customer validation strategies
- Be 400-600 words

Return JSON: { "platform": "ChatGPT / Claude", "prompt": "...", "description": "One-line description of what this prompt does" }`,

      design_brief: `You are an expert UI/UX design consultant using the "Impeccable Style" framework. Given a product idea and analysis brief, generate a comprehensive design brief that a user can paste into Lovable to get a production-quality, non-generic UI.

The brief should include:
- Design direction (mood, aesthetic, anti-references)
- Typography and color guidance
- Layout strategy (asymmetric, progressive disclosure)
- Key interaction patterns
- Component hierarchy and visual weight distribution
- Mobile-first responsive strategy
- 3 specific "don't do this" anti-patterns to avoid

Return JSON: { "platform": "Lovable (Design Brief)", "prompt": "...", "description": "One-line description" }`,

      landing_page: `You are a conversion-focused landing page strategist. Given a product idea and analysis brief, generate a Lovable build prompt specifically for a landing page that validates market demand.

The prompt should specify:
- A single clear CTA (waitlist signup, early access, or pre-order)
- Exactly 5-6 sections with specific copy direction
- Social proof elements (even placeholder structure)
- Mobile-first responsive behavior
- Analytics event tracking for key interactions
- A/B test suggestions for the headline

${lovable_prompt ? `Reference the existing build prompt for consistency: ${lovable_prompt.substring(0, 500)}` : ""}

Return JSON: { "platform": "Lovable (Landing Page)", "prompt": "...", "description": "One-line description" }`,
    };

    const systemPrompt = systemPrompts[prompt_type];
    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: `Unknown prompt_type: ${prompt_type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent = `
## Idea
${idea}

## Analysis Brief
- Problem: ${brief.problem}
- Target Customer: ${brief.target_customer}
- Core Features: ${JSON.stringify(brief.core_features)}
- Revenue Model: ${brief.revenue_model}
- Industry & Competitors: ${brief.industry_trends}
- Builder Intent: ${brief.builder_intent || "venture"}
- Scale Assessment: ${JSON.stringify(brief.scale_assessment || {})}
`;

    const response = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-alt-prompt error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
