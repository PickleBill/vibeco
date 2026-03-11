

## Plan: Edgy Hero Rewrite + Animated "Vibes" Visual + Site-Wide DNA Refresh

### 1. Hero Copy Overhaul — Edgier, Aspirational, Raw

**Remove**: "AI-native product studio" tagline and "Turn conviction into software" headline.

**New copy:**
- **Tagline**: `try things. break things. ship things.`
- **Headline**: `Your wildest idea. Live in minutes.`
- **Subheadline**: "We don't do decks, timelines, or hand-wringing. You describe it, we build it — often before you finish your coffee. The only bottleneck is how fast you can think."
- **Trust anchor**: `Founder-operated • Minutes to live product • Hands-on iteration partner`
- **CTAs**: Keep "Pitch Your Idea" + "See Selected Builds"

### 2. Replace Dashboard Mockup with Animated "Vibes" Visual

Replace the static `HeroMockup` component with a new animated composition using Framer Motion:

**Concept**: Two abstract silhouette/avatar circles (founder + builder) on either side, connected by a dynamic center zone where "thought bubbles" / floating elements orbit and mingle:

- **Floating idea fragments**: Small glassmorphic cards that float, drift, and gently rotate — each containing a keyword or icon: `"$MRR"`, `"users"`, `"API"`, `"launch"`, `"customers"`, `"revenue"`, a lightning bolt icon, a rocket icon, a chart icon
- **Connection lines**: Subtle animated SVG paths connecting the two avatars through the idea cloud, pulsing with the primary glow color
- **Typing indicator**: A small animated element near one avatar showing rapid-fire "building" activity (blinking cursor, code brackets appearing)
- **Central glow orb**: A breathing radial gradient in the center representing the "magic" — the convergence of ideas into product
- **Staggered entrance**: Elements fade/float in sequentially for a cinematic reveal

All built with Framer Motion `animate`, `variants`, and CSS — no external assets needed. Pure div/SVG composition.

### 3. Embed the Edgy DNA Across the Site

Update copy tone across all sections to match the raw, high-energy, no-BS vibe:

**Thesis.tsx:**
- Headline: "The speed will blow your mind."
- Body: "Months of dev cycles? Gone. Six-figure budgets? Irrelevant. You talk, we build, you iterate. The loop is so tight it feels like magic — but it's just what happens when you stop overthinking and start shipping."

**Services.tsx:**
- Section header: "What happens when you show up"
- Card copy updates to be punchier: "You describe it. We build it. Same conversation." / "Not a prototype. A live, deployed product with real users hitting it."

**EverydayFounders.tsx:**
- Headline: "You don't need to code. You need to care."
- Subtext: "The best products come from people who are obsessed with a problem — not people who know React. Bring the obsession. We'll handle the rest in hours, not months."

**FinalCta.tsx:**
- Headline: "Stop planning. Start shipping."
- Subtext: "Your idea could be live before dinner. Not a wireframe. Not a mockup. A real product your customers can use tonight."

**Differentiator copy** tweaked to be sharper and less corporate.

### 4. Files Modified

| File | Change |
|---|---|
| `src/components/Hero.tsx` | Full rewrite — new copy + new animated "vibes" visual replacing HeroMockup |
| `src/components/Thesis.tsx` | Copy rewrite |
| `src/components/Services.tsx` | Header + card copy updates |
| `src/components/EverydayFounders.tsx` | Headline + subtext rewrite |
| `src/components/FinalCta.tsx` | Copy rewrite |
| `src/components/Differentiator.tsx` | Copy sharpening |

### Technical Notes
- The animated visual is entirely Framer Motion + CSS (no images, no canvas, no external libs)
- Floating elements use `motion.div` with `animate` props for position, rotation, opacity cycling
- SVG connection paths use `motion.path` with `pathLength` animation
- Performance: All animations use `transform` and `opacity` only (GPU-composited, no layout thrash)
- Mobile: The vibes visual will be simplified/hidden on mobile (same pattern as current `hidden lg:block`)

