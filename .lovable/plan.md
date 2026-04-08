

## Implementation: Dual Hero Variants + A/B Testing Hook

Plan was approved. Four files to create/modify:

### 1. `src/hooks/useVariant.ts` (Create)
Lightweight hook: checks `?variant=` URL param first, then localStorage sticky assignment, then random. Persists choice. No external dependencies.

### 2. `src/components/HeroVariantA.tsx` (Create)
Scroll-driven parallax + staggered type reveal:
- Each word of "Your wildest idea." springs in with staggered delay (framer-motion spring: stiffness 120, damping 14)
- "Live in minutes." characters fade left-to-right with 20ms stagger
- Mind-map image uses `useScroll` + `useTransform` for 0.3x parallax offset
- Tagline and CTAs use existing FadeIn with slightly adjusted delays
- `prefers-reduced-motion`: skip word-by-word, use simple opacity fade
- Same copy, same layout, same mobile stats strip as current Hero

### 3. `src/components/HeroVariantC.tsx` (Create)
Cinematic orchestrated entry:
- Three grid lines animate `scaleX` from 0→1 in 200ms stagger sequence
- Headline starts at `filter: blur(8px)` + `opacity: 0`, resolves to sharp over 600ms
- "Live in minutes." gradient text fades in 200ms after headline
- CTA buttons spring-scale from 0.8 with overshoot (stiffness 400, damping 25)
- Mind-map fades in last with scale 0.95→1 over 800ms
- `prefers-reduced-motion`: instant render

### 4. `src/components/Hero.tsx` (Modify)
Replace current implementation with a thin wrapper:
```tsx
import { useVariant } from "@/hooks/useVariant";
import HeroVariantA from "./HeroVariantA";
import HeroVariantC from "./HeroVariantC";

const Hero = () => {
  const variant = useVariant("hero", ["a", "c"] as const);
  return variant === "a" ? <HeroVariantA /> : <HeroVariantC />;
};
```

### Testing
- `/?variant=a` — forces parallax hero
- `/?variant=c` — forces cinematic hero
- `/` — random assignment, sticky across sessions

No backend changes. No migrations.

