import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const analysisToolSchema = {
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
            app_type: {
              type: "string",
              description: "The recommended app type for this product. One of: 'landing-page' (marketing site to capture leads), 'web-app' (users log in and use features), 'marketplace' (connects buyers and sellers), 'mobile-first' (designed primarily for phone use), 'e-commerce' (products for sale), 'saas-dashboard' (subscription tool with dashboard). Choose based on what makes sense for the user's idea.",
            },
          },
          required: [
            "problem",
            "target_customer",
            "core_features",
            "revenue_model",
            "industry_trends",
            "investor_perspective",
            "customer_perspective",
            "app_type",
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
          description: `ONLY for the final round (is_final=true). Generate a structured, actionable prompt that someone can paste directly into Lovable AI to build a complete app. This is NOT a creative brief — it is an engineering spec. Follow this EXACT structure:

## [Product Name] — Lovable Build Prompt

### CONTEXT
2-3 sentences: what this product is, who it's for, what problem it solves.

### APP TYPE & STRUCTURE
- State the app type: landing page, dashboard, marketplace, SaaS tool, mobile-first web app, or e-commerce store
- List every page/route (e.g. / homepage, /pricing, /dashboard)
- For the main page, list all sections in exact top-to-bottom order (e.g. Navbar → Hero → Features → HowItWorks → Pricing → Testimonials → CTA → Footer)

### DESIGN SYSTEM
- Color palette: primary, secondary, accent, background, and text colors as hex values
- Typography: heading font and body font suggestions
- Style mood: 1 sentence (e.g. "dark mode with glassmorphism accents" or "clean white, rounded corners, playful")
- Buttons: border-radius style, font weight, padding
- Section spacing: consistent vertical padding between sections (e.g. py-24)

### HERO SECTION
- Headline: exact copy in quotes
- Subheadline: exact copy in quotes
- Primary CTA button: exact label → exact action (e.g. "Get Started" → scrolls to #pricing)
- Secondary action if applicable
- Mobile: what changes below 768px (stacked layout, smaller text, etc.)

### [EACH ADDITIONAL SECTION]
For every section of the app, specify:
- Section name and id (e.g. Features id="features")
- Layout: grid columns, card structure, etc.
- Content: exact headings, descriptions, data for each item
- Interactive elements: what every button, link, and clickable thing does on click
- Mobile: how it adapts (columns stack, elements hide, etc.)

### FORMS & INTERACTIVE ELEMENTS
For every form:
- List all fields with input type and placeholder text
- Submit button label → what happens on submit
- Success state: what the user sees after submission (NOT just a toast — show an inline confirmation message, redirect, or state change)
- Error state: what happens on invalid input

### FOOTER
- Navigation links that match the section IDs defined above
- Social media links if relevant
- Legal links and copyright text

### METADATA & SEO
- Page title: exact text (NOT "Vite + React" or "Lovable Generated Project")
- Meta description: exact text
- OG image: use a gradient or solid color placeholder with the product name — NEVER use default Lovable or GPT-Engineer placeholder images

### POST-BUILD VERIFICATION
End with this exact checklist:
- [ ] Every button and CTA has a real click handler — no buttons that do nothing
- [ ] Every navigation link scrolls to or routes to a real destination
- [ ] All forms show a visible success state after submission
- [ ] Mobile layout works — no content hidden on mobile without an alternative
- [ ] Page title and meta description are set to the actual product name
- [ ] No "Lovable", "GPT-Engineer", or placeholder branding anywhere in the UI or metadata
- [ ] All section IDs in the page match the href values in the navbar and footer links

IMPORTANT RULES:
- Be specific with ALL copy — never use placeholder text like "Lorem ipsum" or "[Your tagline here]"
- Name every component conceptually (e.g. "PricingCard component with three tiers")
- Specify exact section order on the page — Lovable needs to know the layout sequence
- Every interactive element must have a defined action — what happens when you click it
- Include mobile behavior for every visual section

Total length: 800-1500 words. Prioritize specificity over comprehensiveness.`,
        },
      },
      required: ["brief", "follow_up_questions", "is_final"],
      additionalProperties: false,
    },
  },
};

const deepDiveToolSchema = {
  type: "function" as const,
  function: {
    name: "generate_deep_dive",
    description: "Generate a detailed deep-dive analysis for a specific section of an idea report.",
    parameters: {
      type: "object",
      properties: {
        deep_dive: {
          type: "string",
          description: "Markdown-formatted deep-dive analysis with 4-6 bullet points, each 1-2 sentences. Include specific competitor names, market data estimates, risk factors, and actionable recommendations.",
        },
      },
      required: ["deep_dive"],
      additionalProperties: false,
    },
  },
};

function buildAnalysisPrompts(type: string, idea: string, history?: string, round?: number) {
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
10. App Type: Recommend the most appropriate app format (landing page, web app, marketplace, mobile-first, e-commerce, or SaaS dashboard) based on the idea.

IMPORTANT: Set is_final to false. This is the first round — you MUST generate follow-up questions. Do NOT include lovable_prompt.

For follow-up questions:
- Generate exactly 2 strategic follow-up questions (not 3 or 4 — only 2).
- Each question must reference the user's specific idea by name or concept.
- Options must represent genuinely different strategic directions for THIS product.
- Never ask generic startup questions. Every question should feel tailored to this exact business.`;
    userContent = `Here is the user's idea. Read it carefully and generate an analysis that is 100% specific to what they described:\n\n"${idea}"`;
  } else {
    const isLastRound = round! >= 3;
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

ALSO generate the lovable_prompt field. This is the most important output of the entire simulation. Follow these rules precisely:

LOVABLE PROMPT ENGINEERING RULES:
1. STRUCTURE OVER VIBES: Lovable needs engineering specs, not creative briefs. BAD: "A beautiful hero with warm colors." GOOD: "Hero section: h1 'Ship Faster with AI' centered, subheading 'From idea to production in days' in muted text below, CTA button 'Start Building' that scrolls to #pricing."
2. EVERY BUTTON MUST DO SOMETHING: For each button, specify the exact action. "Get Started" → scrolls to #contact-form. "Learn More" → scrolls to #features. "Submit" → shows inline success message replacing the form. Never leave a button without a handler.
3. MOBILE IS MANDATORY: For every section, state what changes below 768px. 3-column grids become single column. Large hero images hide or shrink. Text sizes reduce by one step.
4. SECTION ORDER IS EXPLICIT: List sections in exact top-to-bottom page order. Lovable guesses wrong without this.
5. ALL COPY IS REAL: Every headline, paragraph, button label, testimonial, and meta tag must use real copy derived from the user's actual product. Zero placeholders.
6. FORMS NEED SUCCESS STATES: Every form must specify what the user sees AFTER submitting. Not just a toast notification — an inline confirmation message, a redirect, or a visual state change.
7. MATCH NAV TO SECTIONS: Every navbar/footer link must use an href="#id" that matches an actual id="" on a section in the page. This prevents broken navigation.
8. END WITH A SELF-CHECK: Include a verification checklist at the bottom telling Lovable to confirm buttons work, links resolve, mobile renders, and no default branding remains.

Use the app_type from the brief to determine the prompt structure:
- If landing-page: Single-page marketing site with Hero, Features, Social Proof, Pricing, CTA, Footer
- If web-app: Include auth/login page, dashboard layout, sidebar nav, and at least one functional page
- If marketplace: Include listing grid, search/filter, detail page, and contact/booking flow
- If e-commerce: Include product grid, product detail, cart, and checkout flow
- If saas-dashboard: Include login, dashboard with metric cards, sidebar with nav items, and one settings page
- If mobile-first: Design everything for vertical scroll, touch targets 44px minimum, bottom nav bar

The prompt must follow the structured template format defined in the tool schema. Prioritize the sections the user highlighted as resonating — give those 2x the detail and list them earlier in the prompt.

Target: 800-1500 words total. Specific and actionable beats comprehensive and vague.` : `This is round ${round} of 3. Set is_final to false. Do NOT include lovable_prompt. Ask exactly 3 NEW follow-up questions that dig deeper based on their specific choices. Reference what they chose and explore implications.`}`;
    userContent = `Full conversation history:\n\n${history}\n\nGenerate a${isLastRound ? " final comprehensive" : "n updated"} brief. Every section must reference the original idea and incorporate their choices.`;
  }

  return { systemPrompt, userContent };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // ─── Deep Dive Handler ───
    if (type === "deep_dive") {
      const { section, section_label, brief, idea } = body;

      const systemPrompt = `You are a strategic analyst providing a deep-dive on a specific aspect of a startup idea. Be specific, data-driven, and actionable.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

You are analyzing the "${section_label}" section. Provide:
- 4-6 bullet points of detailed analysis
- Each bullet should be 1-2 sentences
- Include specific competitor names, market size estimates, risk factors, or implementation recommendations as relevant
- Reference the user's specific idea and product throughout
- Use markdown formatting (bold for emphasis, bullet points)
- Be more detailed and specific than the original brief — this is a DEEP DIVE`;

      const briefContext = typeof brief === "object"
        ? Object.entries(brief).map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join("\n")
        : String(brief);

      const userContent = `Original idea: "${idea}"

Current brief context:
${briefContext}

Provide a deep-dive analysis specifically on: ${section_label}`;

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
            tools: [deepDiveToolSchema],
            tool_choice: {
              type: "function",
              function: { name: "generate_deep_dive" },
            },
          }),
        }
      );

      if (!response.ok) {
        const status = response.status;
        const text = await response.text();
        console.error("AI gateway error (deep_dive):", status, text);
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        console.error("No tool call in deep_dive response:", JSON.stringify(data));
        return new Response(JSON.stringify({ error: "Failed to generate deep dive" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Standard Analysis Handler ───
    const { idea, history, round } = body;
    const { systemPrompt, userContent } = buildAnalysisPrompts(type, idea, history, round);

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
          tools: [analysisToolSchema],
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
      delete result.lovable_prompt;
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
