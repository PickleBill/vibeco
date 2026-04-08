

## Plan: Variant B, Slower Animations, and Variant Switcher

### What's Happening

Three things in one pass:

1. **Create HeroVariantB** — the cursor-reactive glow + magnetic CTA direction from the original overdrive proposal
2. **Slow down animations** across all three variants (~1.5–2x current durations)
3. **Add a small variant switcher** visible only in preview/dev — a subtle floating pill at bottom-right with A/B/C buttons, so you can flip between variants without editing URLs

### About the "Files" Section

The "Files" tab in Lovable's UI is for **generated documents** — PDFs, CSVs, images, etc. created by scripts. It's not where code or markdown lives. Your skill files (`SKILL_OVERDRIVE.md`, etc.) live in the **codebase** (Code tab, file tree). That's the right place for them — I read them automatically from there. The Files section would be for things like exported reports or generated assets.

### Changes

**`src/components/HeroVariantB.tsx`** (Create)
- Mouse-tracking radial glow that follows cursor position across the hero section
- Magnetic CTA buttons that subtly pull toward the cursor when nearby (spring physics, ~6px max displacement)
- Headline uses a staggered character reveal with a subtle scale pulse
- Same copy, layout, mobile stats strip as A and C
- `prefers-reduced-motion`: static render, no tracking

**`src/components/Hero.tsx`** (Modify)
- Add variant `"b"` to the variant array: `["a", "b", "c"]`
- Import and render `HeroVariantB`

**`src/components/HeroVariantA.tsx`** (Modify — timing only)
- Word spring: stiffness 120→90, damping 14→12 (slower, more visible overshoot)
- Character stagger delay: 20ms→35ms
- FadeIn delays: push each ~200ms later so the sequence breathes

**`src/components/HeroVariantC.tsx`** (Modify — timing only)
- Grid line duration: 0.6s→1.0s, stagger 0.15→0.25
- Headline blur transition: 0.6s→1.0s
- CTA spring: stiffness 400→280, damping 25→20
- Image fade: 0.8s→1.2s

**`src/components/VariantSwitcher.tsx`** (Create)
- Small floating pill, bottom-right corner, only renders when `location.hostname` includes `lovable.app` or `localhost` (dev/preview only)
- Three small buttons: A, B, C — click sets `?variant=x` and reloads
- Active variant highlighted with primary color
- Semi-transparent, doesn't interfere with content

**`src/pages/Index.tsx`** (Modify)
- Add `<VariantSwitcher />` component

### Files

| File | Action |
|---|---|
| `src/components/HeroVariantB.tsx` | Create |
| `src/components/VariantSwitcher.tsx` | Create |
| `src/components/Hero.tsx` | Modify — add variant B |
| `src/components/HeroVariantA.tsx` | Modify — slow timings |
| `src/components/HeroVariantC.tsx` | Modify — slow timings |
| `src/pages/Index.tsx` | Modify — add switcher |

No backend changes. No migrations.

