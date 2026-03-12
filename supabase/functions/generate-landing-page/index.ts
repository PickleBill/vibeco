import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an elite frontend developer who creates stunning, production-quality landing pages.

Generate a SINGLE self-contained HTML file with ALL CSS inlined in a <style> tag. No external dependencies, no CDN links, no JavaScript frameworks.

Requirements:
- Dark theme with a sophisticated color palette (dark backgrounds like #0a0a0f, #111118, with teal/cyan accents #00d4aa, #0ea5e9)
- Modern, clean typography using system fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)
- Fully responsive (mobile-first, looks great on all screen sizes)
- Sections to include:
  1. Navigation bar with logo text and CTA button
  2. Hero section with bold headline, subtitle, and primary CTA
  3. Features grid (3-4 features with emoji icons)
  4. Social proof / testimonials section (use placeholder quotes)
  5. Pricing section (2-3 tiers)
  6. Final CTA section
  7. Footer
- Use CSS Grid and Flexbox for layouts
- Add subtle hover effects on buttons and cards
- Use gradient accents sparingly for visual interest
- Ensure text is readable with proper contrast ratios
- Add smooth scroll behavior

Return ONLY the complete HTML document starting with <!DOCTYPE html>. No markdown, no explanation, no code fences.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Create a landing page for this product:\n\n${prompt}`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let html = data.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if the model wrapped it
    html = html.replace(/^```html?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    if (!html.includes("<!DOCTYPE") && !html.includes("<html")) {
      throw new Error("AI did not return valid HTML");
    }

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-landing-page error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
