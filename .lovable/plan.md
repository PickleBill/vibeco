## Plan: Dual Hero Variants with A/B Testing Infrastructure

### Architecture

A lightweight, no-dependency A/B testing system using URL params + localStorage:

- `/?variant=a` forces Direction A, `/?variant=c` forces Direction C
- Without a param, the system randomly assigns a variant and persists it in localStorage
- A small hook (`useVariant`) handles assignment and persistence
- Both variants share the same copy/CTAs — only the animation treatment differs

This gives you manual control now (share different links, compare side by side) and a clean interface to wire up analytics later (PostHog, Amplitude, etc.) when you're ready.

### Direction A: Scroll-Driven Parallax + Staggered Type Reveal

- **Headline**: Each word springs in individually with staggered `framer-motion` spring animations (mass/tension/damping, not cubic-bezier)
- **Mind-map image**: Parallax drift using `useScroll` + `useTransform` — image moves at 0.7x scroll speed, creating depth
- **Tagline**: Characters fade in left-to-right with 20ms stagger
- **Reduced motion**: Falls back to simple opacity fade (current behavior)

### Direction C: Cinematic Entry Sequence

- **Grid lines**: Animate from center outward (scaleX from 0 to 1) in sequence
- **Headline**: Blur-to-sharp reveal — starts at `blur(8px) opacity(0)`, resolves to sharp over 600ms with spring easing
- **CTA buttons**: Scale-spring in from 0.8 with overshoot (spring config: stiffness 400, damping 25)
- **Mind-map image**: Fades in last with a radial wipe (mask animation)
- **Reduced motion**: Instant render, no animation

### Files

| File | Action |
|---|---|
| `src/hooks/useVariant.ts` | Create — A/B variant assignment hook (URL param override + localStorage persistence) |
| `src/components/HeroVariantA.tsx` | Create — scroll parallax + staggered type |
| `src/components/HeroVariantC.tsx` | Create — cinematic entry sequence |
| `src/components/Hero.tsx` | Modify — delegate to variant A or C based on `useVariant('hero', ['a', 'c'])` |

### How You'll Use It

- Visit `/` — randomly assigned, sticky across sessions
- Visit `/?variant=a` — forces parallax hero
- Visit `/?variant=c` — forces cinematic hero
- Compare by opening two incognito windows with different params
- Later: wire `useVariant` to emit events to any analytics tool

### No backend changes needed. No migrations. Pure frontend.