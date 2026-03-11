

## Plan: Brand Voice Rework + Visual/UX Overhaul + Simulator Polish

### Brand Voice Direction

The current copy is great but leans heavily into VC/Silicon Valley jargon. The goal: **keep the edgy, punchy energy** but sprinkle in tech/AI/founder terms as aspirational seasoning rather than gatekeeping language. Make anyone reading it feel like "wait, I could do this" — not "this isn't for me."

**Tone formula**: Approachable confidence + sporadic tech/AI terms that feel empowering, not exclusionary. Think "your neighbor who happens to know AI" energy.

### Copy Changes by Component

**Hero.tsx** — Keep the punchy structure, soften the insider language:
- Tagline stays: `try things. break things. ship things.`
- Headline stays: `Your wildest idea. Live in minutes.`
- Subheadline rewrite: "You describe it, we build it — powered by AI, driven by obsession. No dev team needed. No six-figure budget. Just your idea and our hands on the keyboard."
- Trust anchor: `Creator-led • AI-powered • Live in hours, not months`

**Thesis.tsx** — Keep the punch, add accessibility:
- Headline: `The speed will blow your mind.` (keep)
- Body: "What used to take a team of developers and months of runway? We do it in hours with AI. You talk, we build, you show it to real people. It's not magic — it's just what happens when great tools meet real conviction."

**Services.tsx** — Outcome-focused, sprinkle tech terms:
- Header: `What happens when you show up` (keep)
- Card rewrites: Remove "full-stack development, database architecture, A/B testing setup" detail lines. Replace with outcome language: "Everything from the idea to the live product — design, tech, the whole stack — handled." and "SEO, analytics, email capture — all the growth stuff, baked in from day one."
- Titles: "Rapid Product Build" → "We Build It. Fast.", "MVP Strategy" → "From Idea to Game Plan", "Launch Infrastructure" → "Ready to Launch, Day One", "Growth Experimentation" → "Learn, Tweak, Grow"

**Model.tsx** — Plain language with visual step icons on expand:
- Step 1: "We Listen" / "We figure out if your idea has legs — not through decks or pitch meetings, but a real conversation about your problem and who needs it solved."
- Step 2: "We Build" / "Using AI-powered tools, we go from conversation to a live, working product in hours. Not a mockup — something real you can share with actual customers."
- Step 3: "We Grow Together" / "For the right projects, we put skin in the game. Revenue share, equity, or a flat fee — whatever structure makes us both invested in winning."
- On expand: show icon compositions (chat bubble → code → rocket) using styled motion divs

**EverydayFounders.tsx** — Move up in page order, inclusive tone:
- Headline: "You don't have to be a tech person. You just need a real idea."
- Subtitle: "Some of the best software comes from people who've never written a line of code. AI changed the game — and we're here to help you play it."
- Persona titles: keep as-is (Real Estate Agent, Service Pro, etc.) — they're already good
- Persona descriptions: minor tweaks to remove "SaaS" → "software product"

**Fit.tsx** — Soften without losing edge:
- "Great for you if..." / "Probably not the right fit if..."
- Rewrite items: "Deep industry expertise" → "You know your customers and their problems better than anyone", "B2B SaaS, vertical AI, workflow tools" → "Tools that solve real problems for real businesses", "Vague consumer ideas with no wedge" → "Ideas without a clear customer or problem to solve"

**Credibility.tsx** — Builder energy, less jargon:
- Headline: `Builder, not vendor.` (keep — it's perfect)
- Rewrite traits: "unit economics" → "what makes money", "distribution edge" → "how to get it in front of people", keep "Biased toward shipping" and "Visually opinionated"

**ContactForm.tsx** — Simplify structure labels:
- "Revenue Share" desc: "We build it, you sell it. We earn as you earn. Zero upfront."
- "Advisory Equity" desc: "We invest our time for a small piece of the upside. Best for early-stage ideas with real potential."
- "Paid Build" desc: "Flat fee, fast timeline. You own 100%. Simple."

**FinalCta.tsx** — Keep edgy, add warmth:
- Headline: "Ready to make it real?"
- Subtext: "Your idea could be live before dinner. Not a wireframe — a real product your first customers can use tonight."

**Footer.tsx** — Update tagline:
- "Turning ideas into products — powered by AI, driven by people."

**Index.tsx** — Section reorder + meta updates:
- New order: Hero → Thesis → EverydayFounders → Services → Model → Builds → ProjectShowcase → Differentiator → Credibility → ContactForm → FinalCta
- Update meta description and JSON-LD to match new inclusive messaging

### Visual/UX Enhancements (Keep Existing)

These were already approved and will be preserved:
- **Model.tsx**: Add icon compositions (chat → code → rocket) on expand using Framer Motion
- **Builds.tsx**: Enhance hover with animated result cards (large KPI stat + icon) instead of text-only
- **Differentiator.tsx**: Micro-animations on hover (lightning pulses, brain glows, etc.)

### Simulator Polish

**FinalReport.tsx** — Visual teaser before email gate:
- Show a blurred preview strip before email: concept image (blurred), 2-3 brief section titles with truncated content fading to transparent, viability score circles
- Makes the email gate feel more valuable

**IdeaBrief.tsx** — Deterministic scores:
- Seed `FeatureStrengthBar` values from feature name hash instead of `Math.random()`

### Files Modified

| File | Change |
|---|---|
| `src/components/Hero.tsx` | Subheadline + trust anchor copy |
| `src/components/Thesis.tsx` | Body copy |
| `src/components/Services.tsx` | Titles + descriptions + detail copy |
| `src/components/Model.tsx` | Step copy + visual icons on expand |
| `src/components/EverydayFounders.tsx` | Headline + subtitle + persona desc tweaks |
| `src/components/Fit.tsx` | Plain language rewrite |
| `src/components/Credibility.tsx` | Trait rewrites |
| `src/components/ContactForm.tsx` | Structure label descriptions |
| `src/components/FinalCta.tsx` | Headline + subtext |
| `src/components/Footer.tsx` | Tagline |
| `src/components/Builds.tsx` | Visual hover enhancement |
| `src/components/Differentiator.tsx` | Hover micro-animations |
| `src/components/simulator/FinalReport.tsx` | Visual teaser before email gate |
| `src/components/simulator/IdeaBrief.tsx` | Deterministic score bars |
| `src/pages/Index.tsx` | Section reorder + meta updates |

