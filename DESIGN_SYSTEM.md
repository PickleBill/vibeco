# VibeCo Design System

> Adapted from [Impeccable Style](https://impeccable.style) for Tailwind CSS + shadcn/ui.
> Reference this file when making UI changes: "follow the design system."

---

## 1. Anti-Patterns (Never Do)

### Typography
- **No overused fonts** — Inter is our display font (already chosen), but never default to Roboto, Arial, Open Sans, or system-ui for body text without justification.
- **No monospace-as-aesthetic** — Source Code Pro is for actual code/data, not to look "techy."
- **No giant rounded-corner icons above every heading** — they make sites look templated.

### Color & Contrast
- **No pure black or white** — never use `#000` or `#fff`. Always tint. Our `--background` and `--foreground` tokens are already tinted.
- **No gray text on colored backgrounds** — use a shade of the background color instead.
- **No gradient text for impact** — especially on metrics or headings. It's decorative, not meaningful.
- **No default dark-mode-with-glowing-accents** — we use a dark theme, but every glow must serve a purpose (active state, focus, CTA).

### Layout & Space
- **No cards-in-cards** — flatten the hierarchy. If content is inside a card, it doesn't need another card wrapper.
- **No identical card grids** — same-sized cards with icon + heading + text repeated endlessly. Vary sizes, spans, or content types.
- **No center-everything layouts** — left-aligned text with asymmetric compositions feels more designed.
- **No uniform spacing** — create rhythm through varied spacing (tight groupings, generous separations).
- **No hero metric layout template** — big number, small label, gradient accent repeated for every stat.

### Visual Details
- **No glassmorphism everywhere** — blur/glass effects only when purposeful (e.g., overlays on live content).
- **No rounded rectangles with generic drop shadows** — safe and forgettable.
- **No sparklines as decoration** — tiny charts must convey real data or don't include them.
- **No modals unless truly necessary** — prefer inline expansion, drawers, or navigation.

### Motion
- **Never animate layout properties** (width, height, padding, margin) — use `transform` and `opacity` only.
- **No bounce or elastic easing** — real objects decelerate smoothly. Use `ease-out` or exponential easing.

### Interaction
- **No making every button primary** — use ghost buttons, text links, secondary styles. Hierarchy matters.
- **No redundant copy** — don't repeat info users can already see. Every word earns its place.

### Responsive
- **Never hide critical functionality on mobile** — adapt the interface, don't amputate it.

---

## 2. Principles (Always Do)

### Typography
- Use a **modular type scale** with fluid sizing: `clamp(1rem, 0.5rem + 1vw, 1.25rem)`.
- Vary font weights and sizes to create **clear visual hierarchy**.
- Headings: `font-display` (Inter). Body/data: `font-mono` (Source Code Pro) only for actual code.

### Color
- **Tint neutrals** toward the brand hue — even subtle hints create subconscious cohesion (we do this via `--muted`, `--surface`).
- Use **semantic color tokens** from `index.css` — never write raw HSL/hex in components.
- All colors defined in HSL format in CSS variables.

### Layout
- Create **visual rhythm** through varied spacing — tight groupings for related items, generous separation between sections.
- Use **asymmetry and unexpected compositions** — break the grid intentionally for emphasis.
- Use `clamp()` for fluid spacing that breathes on larger screens.

### Motion
- Use motion to convey **state changes** — entrances, exits, feedback.
- Use **exponential easing** (`ease-out-quart`/`quint`/`expo`) for natural deceleration.
- For height animations, use `grid-template-rows` transitions instead of animating `height` directly.

### Interaction
- **Progressive disclosure** — start simple, reveal sophistication through interaction. Basic options first, advanced behind expandable sections.
- Design **empty states that teach** the interface, not just say "nothing here."
- Make every interactive surface feel **intentional and responsive**.

### Responsive
- Use `@container` queries for component-level responsiveness when possible.
- **Adapt** the interface for different contexts — don't just shrink it.

### UX Writing
- Make every word **earn its place**.
- Never repeat information users can already see.

---

## 3. VibeCo Token Reference

All colors are defined as CSS custom properties in `src/index.css` and mapped in `tailwind.config.ts`.

| Token | Usage |
|---|---|
| `bg-background` / `text-foreground` | Page-level background and text |
| `bg-primary` / `text-primary-foreground` | CTAs, active states |
| `bg-muted` / `text-muted-foreground` | Secondary surfaces, subdued text |
| `bg-accent` / `text-accent-foreground` | Highlights, badges |
| `bg-surface` / `bg-surface-elevated` | Card-like containers, layered surfaces |
| `border-border` / `border-divider` | Standard and subtle dividers |
| `bg-card` / `text-card-foreground` | Card component backgrounds |

### Usage Rules
```tsx
// ✅ Correct — semantic tokens
<div className="bg-surface text-foreground border-border">

// ❌ Wrong — raw colors
<div className="bg-zinc-900 text-white border-gray-700">
```

---

## 4. Component Patterns

### Cards
- One level only. Never nest `<Card>` inside `<Card>`.
- Vary card sizes in grids — use `col-span-2` or different heights to break monotony.

### Buttons
- One primary CTA per viewport. Secondary actions use `variant="ghost"` or `variant="outline"`.
- Use text links for tertiary actions.

### Empty States
- Show an illustration or icon + a helpful action. Never just "No data found."

### Loading States
- Use skeleton screens (`<Skeleton />`) over spinners where possible.
- For AI operations, show contextual progress messages, not generic "Loading..."

---

## 5. Applying This in Lovable

Reference this file in prompts:
- *"Follow the design system when building this component"*
- *"Audit this page against DESIGN_SYSTEM.md"*
- *"Polish this component following the anti-patterns list"*

For local development with Cursor/Claude Code, also run:
```bash
npx skills add pbakaus/impeccable
```
This installs the full slash command set (`.cursor/rules/`, `.claude/commands/`, etc.) for richer local AI assistance.
