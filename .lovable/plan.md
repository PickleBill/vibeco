# Sprint 5: Fix the Trust Killers, Then Distill the Home

You're right on all three counts. Two are real bugs that make the product feel broken, one is a cleanup pass. Functional wins go first because broken core flows make every aesthetic improvement feel like lipstick.

---

## Honest Diagnosis

### 1. "7 agents in parallel doesn't work" — it's a timeout misconfiguration, not architecture

**Verdict: plausible AND advisable. Bug is fixable in 2 lines.**

Looking at edge function logs from this session:

```
[synthesize] ✓ openai/gpt-5 in 69436ms     ← actually succeeded
synthesis failed: synthesize timed out after 45000ms   ← but we threw the result away
```

The 7 fan-out agents finish in ~10–25s (logs confirm). The **synthesis** step (which reads all 7 outputs) takes 45–70s on GPT-5 because it has the largest context. The orchestrator gives synthesis only `30000 * 1.5 = 45000ms` — exactly the threshold it's slowest at.

**Architecturally, parallel-7 is the right call:**
- Sequential = ~80s. Parallel = ~25s. That's the whole product promise ("hours not months" mapped to "30s not 5min").
- The pattern (fan-out + synthesize) is industry-standard for multi-agent reasoning (used by AutoGen, CrewAI, LangGraph).
- It's actually *cheap* in dollars — Gemini Flash on the 5 personas ≈ $0.01.

**What's wrong is the timeout shape.** Two fixes:
1. Bump synthesis timeout to 90s (it needs 70s on GPT-5).
2. In `synthesize.ts`, try `gemini-2.5-pro` first (~25s) and fall back to GPT-5 only on failure. Reverses the current order.

### 2. "Iterate on This doesn't save anything" — confirmed catastrophic bug

In `ActionHub.tsx:156`: `action: onIterate`.
In `FinalReport.tsx:978`: `onIterate={onRestart}`.
In `SimulatorShell.tsx:665-669`: `handleRestart` calls `clearDraft()` + resets all state to empty.

**Clicking "Iterate on This" literally wipes the entire session including the report ID.** The label promises iteration; the code performs deletion. This is the single worst trust-breaker in the app.

The correct behavior is: pre-fill IdeaInput with the refined idea + brief context, keep the prior report linked as `forked_from`, and start a new round at the input phase with all prior context preserved.

### 3. Homepage cleanup — confirmed visible problems

At your current 402px viewport:
- **Duplicate CTAs within ~600px** — Hero has "Test Your Idea / Talk to Us / See our builds". Then `EverydayFounders` (next section) has "Test Your Idea Free / Pitch It Directly". Same two buttons, ~one scroll apart. This is the "duplicate modals below the hero" you're seeing.
- **Hero copy is too long** — eyebrow + 2-line headline + 2-line subhead + 2 CTAs + scroll hint + 3-stat strip = 7 elements stacked. Mobile scrolls forever before reaching content.
- **Section count: 13 sections** on the home page. Memory file `mem://style/layout-hierarchy` flags this as "card-grid monoculture" risk.
- **Text cutoff** likely from `clamp()` overflow in HeroVariantA's `text-4xl` headline at 320–402px width without proper `break-words`.

You're correct — needs `/distill` + `/polish` + `/optimize`. But not all in one sprint.

---

## Priority Call: Functional Before Aesthetic

**Reasoning:** the homepage problems hurt *acquisition*. The Iterate bug hurts *retention*. The Auto-Analyze bug hurts *the actual product*. A polished home page that funnels users into a broken product is worse than a rough home page that funnels into a working one. Visitors forgive ugly. They don't forgive "I clicked the button and lost my work."

Order: 5a (broken bugs) → 5b (homepage distill) → 5c+ (iterative).

---

## Sprint 5a — Stop the bleeding (this session)

| Fix | File | Change |
|---|---|---|
| Iterate preserves session | `SimulatorShell.tsx`, `ActionHub.tsx`, `FinalReport.tsx` | New `handleIterate()` — pre-fills idea from latest brief's distillation, sets phase to `input`, keeps `currentRound` and `report_id`, persists prior round as `forked_from`. Toast: "Starting new iteration with prior context." |
| Synthesis no longer thrown away | `orchestrate/index.ts` | Synthesis timeout 45s → 90s |
| Synthesis is faster by default | `_shared/agents/synthesize.ts` | Reorder fallback chain: `gemini-2.5-pro` first (~25s), `openai/gpt-5` second (only on failure) |
| Surface partial results | `SynthesisPanel.tsx` | If `synthesis === null` but agents finished, show "Synthesis unavailable but here are the raw perspectives" instead of looping spinner |

Acceptance: clicking Iterate keeps your prior report visible in `/my-simulations`, prefills next round. Auto-Analyze finishes in <60s with synthesis attached >90% of the time.

---

## Sprint 5b — Homepage distill (this session)

Goal: cut the home page from 13 sections to 7. One CTA per viewport. No duplicate buttons within 1000px of scroll.

| Change | File |
|---|---|
| Remove "Test Your Idea / Talk to Us" CTA pair from `EverydayFounders` (kept only in Hero) | `EverydayFounders.tsx` |
| Cut Hero subhead from 2 lines to 1 line: "Tell us what you need. We ship — usually same day." | `HeroVariantA/B/C.tsx` |
| Remove the dancing arrow + "See our builds" link below hero CTAs (redundant with scroll) | `HeroVariantA/B/C.tsx` |
| Mobile: hide Hero parallax stats strip (3 stats already in `StatsBar` section right below) | `HeroVariantA.tsx` |
| Remove these sections from `Index.tsx`: `Differentiator` (overlaps `Model`), `Builds` (overlaps `ProjectShowcase`), `Credibility` (overlaps `Testimonials`), `Fit` (overlaps `EverydayFounders`) | `Index.tsx` |
| Add `break-words` + tighten `clamp()` floor to `2.25rem` on hero headline to fix 320–402px overflow | `HeroVariantA/B/C.tsx` |

Result: Hero → StatsBar → EverydayFounders → ProjectShowcase → SpeedTimeline → Model → Testimonials → ContactForm → FinalCta. Every section earns its place.

---

## Sprint 5c — Iterative improvement queue (next sessions, not now)

Documented now so we don't lose them. Each is its own 1-session scope.

**5c.1 — Polish pass on simulator (1 session)**
- Audit `IdeaBrief`, `FinalReport`, `ThunderdomePanel` against `SKILL_POLISH.md`
- Replace remaining hardcoded `*-400`/`*-500` color literals with semantic tokens
- Standardize button variants (currently 4 different rounded-full styles)
- Loading-state typography consistency

**5c.2 — Per-persona Apply Critique buttons (1 session)**
- Each persona perspective gets "Apply this critique" → re-runs `simulate-idea` with that perspective injected as anti-highlight
- Closes the feedback loop the Sprint 4 plan documented but didn't ship

**5c.3 — Realtime stream during 60s wait (1 session)**
- Show personas completing one-by-one in `SynthesisPanel` (Skeptic ✓ in 8s, Champion ✓ in 12s…) instead of "0/7" jumping to "7/7"
- Code already wires `agent_events`; needs UI animation polish

**5c.4 — Homepage section reordering A/B test (1 session)**
- Use existing `useVariant` framework
- Test: ProjectShowcase 2nd vs current order. Hypothesis: showing builds before talking about builds converts better

**5c.5 — Portfolio ↔ Simulator round-trip (Sprint 6 scope)**
- Register Courtana Pulse → "Re-evaluate this idea" → Auto-Analyze → push refined prompt back as next-iteration spec
- This is the "Flywheel" from prior plans

**5c.6 — Inbox + auto-evaluate (Sprint 6 scope)**
- Wire `/inbox` route + `auto-evaluate` cron from external sources
- Currently both exist in code, neither in nav

**5c.7 — Mobile-first audit (1 session)**
- 402px is the user's current viewport. Most simulator surfaces designed desktop-first
- Specifically: `ThunderdomePanel` 4-tab bar, `SynthesisPanel` two-column tensions/consensus, `IdeaBrief` 7-card grid

**5c.8 — Cost & latency surfacing (1 session)**
- Show "Auto-Analyze used $0.04 in 32s" after each run
- Builds trust; differentiates from "magic AI box" feel

---

## What I'm Explicitly NOT Doing in 5a/5b

- No new agents
- No new pages
- No new edge functions
- No design system changes (those land in 5c.1 polish pass)
- No /inbox or portfolio integration (5c.5 / 5c.6)
- No A/B framework changes (5c.4)
- No deletion of HeroVariantC (the variant switcher is still useful for testing)

---

## Files Sprint 5a + 5b Will Touch

| File | Sprint | Change |
|---|---|---|
| `src/components/simulator/SimulatorShell.tsx` | 5a | Add `handleIterate()`, plumb to FinalReport |
| `src/components/simulator/FinalReport.tsx` | 5a | Add `onIterate` prop separate from `onRestart` |
| `src/components/simulator/ActionHub.tsx` | 5a | Wire to new `onIterate` |
| `src/components/simulator/SynthesisPanel.tsx` | 5a | Empty-synthesis fallback UI |
| `supabase/functions/orchestrate/index.ts` | 5a | Synthesis timeout 45→90s |
| `supabase/functions/_shared/agents/synthesize.ts` | 5a | Fallback order: Gemini first |
| `src/pages/Index.tsx` | 5b | Remove 4 sections |
| `src/components/HeroVariantA.tsx` | 5b | Trim copy, fix clamp, hide mobile stats strip |
| `src/components/HeroVariantB.tsx` | 5b | Same trims |
| `src/components/HeroVariantC.tsx` | 5b | Same trims |
| `src/components/EverydayFounders.tsx` | 5b | Remove duplicate CTA pair |

Edge function redeploys: `orchestrate`, `synthesize`.

---

## Open Questions Before Starting

1. **Iterate behavior:** when "Iterate on This" is clicked, should it (a) pre-fill the input with the *original idea* + show distillation as context, or (b) pre-fill with the *distilled MVP scope* as the new starting idea? My instinct says (a) — keeps the user's words primary. But (b) is more "use what the AI learned."

2. **Section cuts:** I want to remove `Differentiator`, `Builds`, `Credibility`, `Fit` because each duplicates a nearby section's job. Any of these you want to keep? `Differentiator` is the most defensible (4 unique value props vs `Model`'s 3 partnership structures).

3. **Hero variant lock-in:** want to pick a winner from A/B/C and delete the other two as part of distill, or keep the variant switcher running? My read: pick A as default (cleanest typography), keep B/C for opt-in via URL params, delete neither — matches the existing A/B framework.
Sprint 5a + 5b complete — see chat for summary
