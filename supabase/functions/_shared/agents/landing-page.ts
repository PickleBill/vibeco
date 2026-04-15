import { callLLM } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import type { LandingPageInput, LandingPageResult } from "../types.ts";

// ─── Core Logic ───

export async function generateLandingPage(input: LandingPageInput): Promise<LandingPageResult> {
  const model = selectModel("html-generation");

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

  const response = await callLLM({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Create a landing page for this product:\n\n${input.prompt}` },
    ],
  });

  let html = response.content || "";

  // Strip markdown code fences if the model wrapped it
  html = html.replace(/^```html?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  if (!html.includes("<!DOCTYPE") && !html.includes("<html")) {
    throw new Error("AI did not return valid HTML");
  }

  return { html };
}
