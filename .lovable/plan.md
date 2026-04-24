# Sprint 7 — Stop Adding. Start Connecting.

## The honest read

You're right. We've been stacking features on a foundation that hasn't been proven trustworthy. Symptoms:

- **Three different "make me a prompt" buttons** (Generate prompt, Sharpen prompt, Build in Lovable in ActionHub) with overlapping behavior.
- **"Iterate on This" lives in two places** (FinalReport footer + ActionHub) and neither one shows you what's preserved.
- **Five "alt-prompt" actions** at the bottom (Build/Research/Design/Landing/Iterate) that quietly fail with a toast and zero recovery — no retry, no error detail, no fallback.
- **Highlights are silent.** You click "This resonates" and nothing visibly changes until much later when a sharpen button appears in a banner.
- **Deep-dive output goes nowhere.** You can expand the "4 value propositions" section, read good content, and have no way to push it back into the prompt or save the insight.

The product has *all the pieces* of a great experience. It just doesn't connect them into a loop the user can feel.

## The fix: one loop, three guarantees

Stop building outward. Spend this sprint on **the loop**: every action must (1) **acknowledge** it happened, (2) **show what changed**, (3) **let you act on it again or undo it.**

```text
   ┌──────────────────────────────────────────────────────┐
   │   IDEA  →  BRIEF  →  HIGHLIGHT  →  PROMPT  →  SHIP   │
   │            ▲                          │              │
   │            └──── ITERATE ─────────────┘              │
   └──────────────────────────────────────────────────────┘
```

Everything else (deep dive, expand, distill, personas) feeds **into** that loop, not parallel to it.

---

## What we'll do

### 1. Collapse the prompt actions into one block (FinalReport)

**Remove:** the standalone "Generate Lovable prompt" button, the "Sharpen prompt now" banner button, the duplicate "Iterate" in ActionHub.

**Keep one prompt block** with three states and three actions, always visible:


| State         | What you see                                  | Actions                                                                                                                      |
| ------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| No prompt yet | "Generate your build prompt" empty state      | `Generate` (primary)                                                                                                         |
| Prompt exists | The prompt + a live "highlights summary" line | `Copy` (primary) · `Open in Lovable` (secondary) · `Sharpen with my highlights` (tertiary, only when highlights/flags exist) |
| Sharpening    | Inline diff view (old → new prompt)           | `Keep new` · `Revert`                                                                                                        |


This kills three competing CTAs and makes "what does this button do" obvious.

### 2. Make highlights *visibly* affect the prompt

When you click "This resonates" on a section:

- The section card pulses + gets a permanent left rule and sparkle
- A **persistent toast stack** at the top right says: *"3 highlights, 1 flag — Sharpen prompt to apply →"* with a one-click sharpen button
- The prompt block header shows a count badge: `Your Lovable Prompt · 3 highlights pending`

You always know your input is being captured *and* what it'll do.

### 3. Wire deep-dive insights back into the loop

Today: you expand a section, read insight, close it, lose it.

After: every deep-dive panel gets a footer:

- `★ Add to highlights` — appends this section's deep-dive content as context for the next sharpen
- `→ Use this in the prompt` — runs `refine-prompt` with this specific insight as the focus and updates the prompt inline (with the same diff/keep/revert UX as #1)

The "4 value propositions" use case you described becomes: read them, click `Use this in the prompt` on the one you like, see the prompt update with that value prop emphasized, ship.

### 4. Harden the alt-prompt actions (the ones that "don't work")

The five action-hub buttons need:

- **Real error surfacing** — replace `toast.error("Failed. Try again.")` with the actual gateway error (rate limit, JSON parse, timeout) and a `Retry` button inline in the disclosure panel
- **Persistent results** — once generated, alt prompts stay open across navigation and re-renders (currently they evaporate if the component unmounts)
- **Loading shimmer** in the disclosure panel itself, not just the icon, so the user knows where the result will appear
- **Fallback model** if the primary model returns malformed JSON (Gemini 2.5-flash → fall back to gemini-3-flash-preview)

### 5. Fix "Iterate" so it actually feels like iteration

Today's `handleIterate` already preserves state (Sprint 5 fixed the wipe), but the UX is silent — you land back on input with no visual signal that anything carried over.

Change:

- Replace the input screen on iterate with a **"Continue refining"** view: shows a stack of "what's preserved" pills (`✦ 3 highlights` · `Round 2 brief` · `Linked to report #abc`) above the textarea, pre-populated with the current idea
- The textarea label changes to *"What would you change or push further?"*
- A `Start fresh instead` link in the corner gives an escape hatch

You can *see* the iteration is real.

### 6. One-time cleanup

- Remove the `FeatureStrengthBar` deterministic-hash percentages from the PDF too (still leaking fake data into the export)
- Move the floating "Download PDF" button into the unified action row — three floating UI elements is too many
- Kill the "Run impeccable polish on..." style decorative gradients in `IdeaBrief` hero — replaced by the same left-rule treatment used elsewhere (consistency)
- You can remove the image bc that's useless, along with the random emojis taking up valuable screen real estate.  The idea type little mini modal might be useful (and I like the design) but what's its function?
- If the answer to "what is its function" is nothing...or minimal...than we should rethink having the element...or move it downwards/de-emphaisize...this is for all things!

---

## Out of scope (by design)

- New agents, new models, new edge functions
- The Portfolio import flow (still tabled per Sprint 6.3 decision)
- The Thunderdome layout — Sprint 6.3 polish stands until the loop above is solid
- A/B variants, marketing site, auth flow — the simulator is the product right now

---

## How we'll know it worked

Three usability checkpoints (no analytics needed — you'll feel them):

1. From a fresh idea to a copied prompt **with at least one highlight reflected**, in under 90 seconds, with zero "wait did that work?" moments.
2. Every button either does something visible within 300ms (loading state) or shows a real error with a retry inline.
3. Clicking "Iterate" feels like *continuing*, not *restarting*.

## Sequencing


| Phase | Scope                                                          | Why first                          |
| ----- | -------------------------------------------------------------- | ---------------------------------- |
| 7.1   | Collapse prompt actions + diff view (FinalReport prompt block) | Removes the most confusing UI      |
| 7.2   | Persistent highlight toast stack + section pulse               | Makes input feel acknowledged      |
| 7.3   | Deep-dive → prompt wiring (`Use this in the prompt`)           | Closes the loop the user described |
| 7.4   | ActionHub error/retry hardening + result persistence           | Fixes "the buttons don't work"     |
| 7.5   | "Continue refining" iterate screen + cleanup                   | Polishes the seam                  |


All five fit in one sprint. Stop after 7.3 for a checkpoint if you want to test the loop before the polish.

### One question before I start

**Diff view for sharpened prompts:** prefer (a) side-by-side old vs new with `Keep / Revert`, or (b) inline strikethrough/insertion (like git diff) with one `Keep` / `Revert` button below? Option (a) is clearer on desktop, (b) is cleaner on mobile (your current viewport is 402px).  Option B I think.  Could you do an in between where default is strikethru but there's and action buttons to compare side by side in some way?