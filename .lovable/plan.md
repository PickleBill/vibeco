

## Plan: Tagline Update, Homepage Simplification, Timeline Slider, Google/Apple Auth

### 1. New Tagline & Hero Copy

Update `Hero.tsx`:
- Tagline: `good vibes, instantly.`
- Headline: `Bring your idea to life.`
- Keep existing subheadline and CTAs — they're strong
- Trust anchor stays

### 2. Homepage Simplification — Remove Repetition

Current page has 12 sections and several say the same thing differently. The main overlaps:
- **Thesis** and **Hero** both pitch speed + AI (merge Thesis into Hero)
- **Services** and **Model** both explain "how it works" (keep Model, cut Services)
- **Builds** and **ProjectShowcase** both show projects (cut Builds, keep ProjectShowcase — it has real links)
- **Differentiator** and **Credibility** both say "why us" (merge into one section)
- **Fit** can stay — it's differentiated content

**New streamlined order (8 sections instead of 12):**
```text
Hero (with Thesis speed line folded in)
 ↓
EverydayFounders (inclusivity — "you don't need to be technical")
 ↓
SpeedTimeline (NEW — interactive historical slider)
 ↓
Model (how we work — 3 steps)
 ↓
ProjectShowcase (real shipped products)
 ↓
Fit (good fit / not fit)
 ↓
ContactForm
 ↓
FinalCta
```

Removed: `Thesis.tsx`, `Services.tsx`, `Builds.tsx`, `Differentiator.tsx`, `Credibility.tsx` (their best copy folded into remaining sections or cut)

### 3. Interactive Speed Timeline — New Component

Create `src/components/SpeedTimeline.tsx`:
- A horizontal slider (draggable or auto-animating) showing eras of product development
- Each era: icon + year range + what it took + time-to-launch + cost
- **Eras:**
  1. **1970s–80s**: Mainframes & manufacturing — "Millions of dollars, years of development, entire buildings"
  2. **1990s–2000s**: Dev shops & on-premise software — "Six-figure budgets, 6–12 month timelines, teams of 20+"
  3. **2010s**: Cloud & startups — "$50K+ seed rounds, 3–6 months, lean teams"
  4. **2020–2024**: No-code & early AI — "DIY tools, weeks to months, still limited"
  5. **2025+**: AI-native (VibeCo) — "Hours. One conversation. Live today."
- Visual: use Framer Motion + the Radix Slider component as the scrubber
- Above the slider: an animated inverse curve (SVG path) showing "time to launch" dropping exponentially as the user drags right
- The curve draws/animates as the slider moves — satisfying visual of speed increasing
- Below slider: era cards that highlight as slider passes through them
- Section headline: `The world changed. Building didn't keep up. Until now.`
- Mobile: vertical timeline with scroll-triggered animations instead of slider

### 4. Google & Apple Authentication

- Use Lovable Cloud's managed OAuth for both Google and Apple (no API keys needed)
- Run the Configure Social Auth tool to generate the `src/integrations/lovable/` module
- Create `src/pages/Auth.tsx` with sign-in/sign-up form offering:
  - Google Sign-In button
  - Apple Sign-In button
  - Email/password as fallback
- Add `/auth` route to `App.tsx`
- Add "Sign In" link to `Navbar.tsx`
- No profiles table needed for now — just authentication for future session saving
- Configure auto-confirm for email signups? No — keep email verification unless requested

### 5. Section Copy Touch-ups

**EverydayFounders.tsx**: Keep as-is — copy is good

**Model.tsx**: Fold in the best "why us" lines from Differentiator/Credibility:
- Add a subtle tagline under the section: "Skin in the game. Builder, not vendor."

**Fit.tsx**: Keep — unique content, no repetition

**FinalCta.tsx**: Update to match new tagline energy: "Good vibes, instantly. Let's bring yours to life."

**Footer.tsx**: Update tagline to "Good vibes, instantly."

### Files Modified/Created

| File | Change |
|---|---|
| `src/components/Hero.tsx` | New tagline + headline, fold in Thesis speed line |
| `src/components/SpeedTimeline.tsx` | **NEW** — interactive historical timeline slider |
| `src/components/Model.tsx` | Add best lines from Differentiator/Credibility |
| `src/components/FinalCta.tsx` | Match new tagline |
| `src/components/Footer.tsx` | Update tagline |
| `src/components/Navbar.tsx` | Add "Sign In" link |
| `src/pages/Index.tsx` | Remove 5 sections, add SpeedTimeline, reorder |
| `src/pages/Auth.tsx` | **NEW** — Google/Apple/email auth page |
| `src/App.tsx` | Add `/auth` route |

**Sections removed from Index:** Thesis, Services, Builds, Differentiator, Credibility (files kept but no longer imported)

### Technical Notes
- SpeedTimeline uses Radix Slider for the scrubber + Framer Motion for curve animation and era card transitions
- SVG path for the inverse curve uses `motion.path` with `pathLength` animation tied to slider value
- Google/Apple auth via Lovable Cloud managed OAuth — zero config needed
- No new database tables required
- No new dependencies needed

