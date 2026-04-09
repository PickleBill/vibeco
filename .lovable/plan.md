# VibeCo Plan

## Full-Site Audit Report — Score: 11/20 (Acceptable)

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | No skip-to-content link, slider lacks aria-label, buttons-as-links |
| 2 | Performance | 3/4 | Three hero variants always imported, Google Fonts render-blocking |
| 3 | Theming | 3/4 | Hard-coded colors in Model (blue-400, emerald-400, amber-400) and SpeedTimeline (green HSL) |
| 4 | Responsive | 2/4 | SpeedTimeline 5-col grid broken on tablet, hero image hidden on mobile leaving blank space |
| 5 | Anti-Patterns | 1/4 | AI slop gallery: gradient text, hero metrics strip, card grids everywhere, 7× duplicate CTA, identical hover patterns |
| **Total** | | **11/20** | **Acceptable** |

### Anti-Patterns Verdict: FAIL

The site reads as AI-generated. Specific tells:
- **P0** ~~Gradient text (`text-gradient-accent`)~~ — FIXED: replaced with `text-primary` in hero
- **P0** Hero metrics strip duplicated in hero AND StatsBar — redundant
- **P1** Card grid monoculture — 6 sections use identical card-grid layouts
- **P1** Every section follows identical structure: label → heading → description → card grid with hover glow
- **P1** CTA appeared 7+ times (reduced to "Test Your Idea" in sprint 1)
- **P1** Glow effects on everything
- **P2** Identical hover patterns across all cards
- **P2** Font monotony — only Inter + Source Code Pro

### P0-P3 Findings

**P0 — Blocking**
1. ~~Gradient text on hero tagline~~ → FIXED
2. Hero stats strip duplicates StatsBar → still on mobile hero variants

**P1 — Major**
3. Hard-coded Tailwind colors: `text-blue-400`, `text-emerald-400`, `text-amber-400` in Model.tsx
4. Hard-coded `hsl(142 70% 45%)` green in SpeedTimeline
5. SpeedTimeline: 5-column era cards grid breaks on tablet
6. Card grid monoculture — need layout variety
7. CTA repetition — "Test Your Idea" still appears 6+ times
8. Section structure monotony

**P2 — Minor**
9. No skip-to-content link
10. SpeedTimeline range input missing `aria-label`
11. Hero image hidden on mobile — large empty space
12. Footer nav stacks poorly on mobile
13. Inline HSL values repeated instead of CSS custom properties
14. `bg-surface` utility hard-codes HSL

**P3 — Polish**
15. Google Fonts via CSS `@import` (render-blocking)
16. VariantSwitcher buttons lack aria-labels
17. Sparkles icon used as generic decoration across 5+ locations

---

## Copy Overhaul (Sprint 1) — COMPLETE

All copy across 16 components rewritten. Key changes:

| Component | Before | After |
|---|---|---|
| Hero headline | "Your wildest idea. Live in minutes." | "One conversation. One live product." |
| Hero sub | "You describe it, we build it..." | "Tell us what you need. We ship a working product — not a pitch deck." |
| Hero CTA | "✦ Simulate Your Idea" | "Test Your Idea" |
| EverydayFounders | "Not just for tech founders" | "Built for domain experts" |
| Differentiator h2 | "Why we're different." | "Not your typical dev shop." |
| SpeedTimeline h2 | "The world changed..." | "50 years of cost collapse." |
| Model h2 | "Built for alignment." | "Three steps. One outcome." |
| FinalCta | "Let's bring yours to life." | "Ship it tonight." |
| Footer tagline | "Good vibes, instantly. Bringing ideas to life." | "Ideas to products. Fast." |
| SEO title | "Good Vibes, Instantly..." | "One Conversation. One Live Product." |

---

## Recommended Next Actions (Priority Order)

1. **[P0] `Bolder`** — Break card-grid monoculture. Redesign 2-3 sections with editorial/asymmetric layouts.
2. **[P1] `Audit` fix** — Replace hard-coded colors in Model.tsx and SpeedTimeline with design tokens.
3. **[P1] `Shape`** — Design brief for SpeedTimeline responsive fix.
4. **[P1] `Polish`** — Add skip-to-content, aria-labels, focus indicators.
5. **[P2] `Overdrive`** — Reduce CTA repetition, vary hover patterns.
6. **[P2] `Polish`** — Fix hero mobile blank space, footer mobile layout.

---

## Previous: Impeccable Design Infrastructure — COMPLETE

Created `.impeccable.md` (Design Context), `SKILL_IMPECCABLE.md` (orchestrator), and 4 new skills (Shape, Audit, Polish, Bolder). All 9 skills now read from `.impeccable.md` for brand consistency.
