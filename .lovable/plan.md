

# Sprint 8 — Close the Loop. Make Every Surface Interactive.

You're right on every count. The seams I see, ranked by how much they hurt the loop:

1. **Iterate dead-ends.** `handleIterate` preserves rounds + highlights in memory, but the user lands on a blank `IdeaInput` and the brief they were just editing is gone. There's no path *back into* the same brief to keep refining the live thing.
2. **Dashboard quick actions are hover-only** (`opacity-0 group-hover:opacity-100`). On your 402px touch viewport they're invisible. Cards also lack the *idea title* you mentioned because we use `getProductName(report)` which collapses to "first 50 chars of idea text" — no real title.
3. **Final page lacks contrast + navigation.** It's one long scroll: brief → stress-test → prompt → deep-dive insights → actions. No way to jump, no sense of place.
4. **No "Save Progress" snapshot.** Highlights, deep-dives, perspective calls, expand/distill outputs all live in *separate* tables or in-memory state. There's no single "this is where I am" bundle the user can name, stash, and roll forward.
5. **Components aren't curatable.** Deep-dive content, expansion variations, persona insights — the user can read them but can't *grab one*, reorder, delete, or drag into the prompt.

## The fix: a Vibe Stack

One mental model that ties everything together. Every action that produces value (highlight, deep-dive paragraph, expansion variation, persona insight, distillation) becomes an **insight chit** that lands in a single, visible **Vibe Stack** sidebar. The user curates the stack. The stack feeds the prompt. The prompt evolves visibly. That's the loop.

```text
   ┌─────────────────────────────┐    ┌─────────────────────┐
   │      WORKING SURFACE         │    │     VIBE STACK      │
   │  brief · perspectives ·      │ →  │  ✦ highlights       │
   │  deep-dives · expansions     │    │  ▣ deep-dives       │
   │  ↑ every result has a "+ "   │    │  ✚ expansions       │
   │    to add to stack           │    │  drag · pin · cut   │
   └─────────────────────────────┘    └─────────────────────┘
                                                 │
                                                 ▼
                                       ┌─────────────────────┐
                                       │  YOUR LOVABLE PROMPT │
                                       │  rebuilt from stack  │
                                       │  diff · keep · revert│
                                       └─────────────────────┘
```

---

## Phase 8.1 — Close the iterate loop (the highest-impact fix)

**Current**: `Iterate` dumps you on a blank input. **After**: `Iterate` keeps you on the FinalReport with a "Round 4 — refine in place" mode, where:
- The brief becomes editable in line (textareas appear next to each section, pre-filled with the current brief text).
- The Vibe Stack shows everything carried in (highlights + deep-dives + accepted insights).
- A new "Re-simulate with these changes" CTA runs `simulate-idea` with the edited brief as new history → produces a new round on top of the existing one.
- "Start fresh instead" stays as the escape hatch.

This is what *progressive and accretive* means. You build *on* the brief, not next to it.

## Phase 8.2 — Save Progress / Vibe Stack

Add a `idea_stack_items` table:
```text
idea_stack_items (
  id, report_id, kind, source, content, label, position,
  pinned, deleted_at, created_at
)
```
- `kind` ∈ `highlight` | `deep_dive` | `expansion` | `persona` | `distill` | `note`
- `source` = the section / persona / variation it came from
- `position` for drag-reorder, `pinned` for "always include in prompt", `deleted_at` for soft-delete

**A right-side `<VibeStack>` panel** (collapsible drawer on mobile, fixed sidebar on desktop) shows:
- Each chit with kind icon, one-line label, source pill, and per-chit actions: pin · drag-handle · remove · "use in prompt"
- A header counter: "12 in stack · 4 pinned · ↻ Sharpen prompt"
- "Save snapshot" → writes a named version to `prompt_versions` (table already exists) and toasts the version name

**Every result-producing surface gets a `+` action**:
- `IdeaBrief` highlight buttons stay, but a new `+ stack` icon writes a chit
- Deep-dive panels — already have "Add to highlights" + "Use in prompt"; add "Pin to stack"
- `ExpandContractPanel` variation cards — add "+ stack" per variation
- `PerspectivesPanel` persona output — add "+ stack" per challenge question

When you click `Sharpen prompt`, we call `refine-prompt` with the **stack as context** instead of just `highlights[]`. Pinned chits are mandatory; unpinned are suggested.

## Phase 8.3 — FinalReport sub-navigation + contrast pass

Add a sticky sub-nav under the existing progress dots:
```text
[ Brief ] · [ Stress-test ] · [ Insights (12) ] · [ Prompt ] · [ Actions ]
```
- Smooth-scrolls to anchored sections
- Shows live counts (insights = stack size, etc.)
- Active section highlights as you scroll (intersection observer)

Contrast fixes (the things that quietly read "draft"):
- Boost section heading weight from `font-bold` → `font-black` and color from `text-foreground` → real `--ink` token (≥ 93% lightness)
- Replace the gradient hero header with a left-rule `4px primary` accent + uppercase label (matches the rest of the report)
- Increase Deep-dive expanded-panel border from `border-primary/30` to `border-primary/60` so the loop-footer ("Add to highlights / Use in prompt") reads as intentional, not decorative
- Body text bumps from `text-foreground/80` → `text-foreground/90` everywhere it currently fades out

## Phase 8.4 — Dashboard fixes (My Simulations)

- **Always-visible quick actions** on touch viewports: detect `(hover: none)` via media query and remove the `opacity-0 group-hover` gate.
- **Idea title**: add `title` (text) column to `idea_reports`; auto-derive on first save (`brief.problem` → first ~6 words, title-case). Render in the card header *above* the truncated idea body.
- **Confirm + polish the three quick actions** (Copy Prompt, Fork, Deep Dive) — verified working in code; add toast confirmations and a 200ms scale-tap microinteraction.
- Add a fourth: **Continue** (resumes at the right phase based on `status`).

## Phase 8.5 — Make it interactable

A small set of micro-rules applied everywhere:
- Every list item (features, perspectives, expansions, deep-dive bullets) gets a hover state with `+ stack`, `↑ pin`, `✕ cut`.
- Drag-handles on the Vibe Stack and the Core Features list (already drag-sortable — extend the pattern).
- `Cmd+K` palette: "Add note to stack", "Sharpen prompt", "Jump to Prompt", "Snapshot this version".
- Keyboard `j`/`k` to navigate stack items, `enter` to use in prompt.

## Phase 8.6 — Cleanup of past learnings (don't lose them)

- Remove the deterministic `computeScores` hash percentages from PDF too (still leaks fake "Market 73 · Product 81" into the export).
- Remove the unused `Builds` import path leftover from earlier sprints if any (audit).
- The "Run stress-test" inline panel inside `phase==="brief"` and the same `ThunderdomePanel` rendered post-final are duplicate mounting paths — collapse to one source of state so highlights made in one are visible in the other.
- Audit `framer-motion` blocks for the standardized `cubic-bezier(0.22, 1, 0.36, 1)` ease (Sprint 6.3 covered the big ones; verify `IdeaBrief` and `FinalReport` are aligned).

---

## Sequencing

| Phase | Scope | Why this order |
|---|---|---|
| 8.1 | Iterate-in-place (Round 4 mode) | Fixes the most painful break first |
| 8.2 | `idea_stack_items` + Vibe Stack drawer + `+ stack` everywhere | The unifying primitive — everything else hangs off it |
| 8.3 | FinalReport sub-nav + contrast pass | Now that there's a stack, navigation has meaning |
| 8.4 | Dashboard titles + always-on quick actions | Self-contained, can ship in parallel |
| 8.5 | Interaction micro-rules (drag/hover/cmd-k) | Polish that compounds |
| 8.6 | Cleanup loose ends | Final 5% |

Ship 8.1 + 8.2 + 8.4 first — that's the new loop in one push. 8.3, 8.5, 8.6 are the next sprint.

---

## /distill /expand /refine — your next-action menu

Pick one to send the project further; each is a follow-on sprint, not part of 8.

| Move | What it would do | Why it'd matter |
|---|---|---|
| **/distill** | Force every report to produce *one sentence* the user can ship as a tagline (already partly built in distill agent — surface it as the report's masthead). | Your "ruthless clarity" memory says taglines beat features. Make the simulator close on one. |
| **/expand** | Auto-fork: when a Vibe Stack snapshot is saved, run `expand-idea` in the background and seed 3 child ideas in the dashboard tree without the user asking. | Turns saving into seeding. Dashboard becomes a garden, not a graveyard. |
| **/refine** | Add `prompt_versions` time-travel UI: show a vertical timeline of every Sharpen, with "Restore" per version. | You already store them — you just don't show them. |
| **/polish** | Apply Impeccable v2.1.1 to every secondary surface (Auth, Inbox, Portfolio, Report). Audit for nested cards, pure black/white, missing fluid type. | Brand consistency drop. The simulator looks great; the surrounding pages drift. |
| **/overdrive** | Build the **agent-mediated import** chat command (`import @project:NAME`) we tabled in Sprint 6 — using my cross-project tools to populate `manifest_cache` directly. One-shot, no UI debt. | Unlocks the Portfolio play without waiting for a public API. |

My recommendation: ship 8.1 + 8.2 + 8.4 (the loop), then `/distill` next. The tagline-as-masthead would be the moment the simulator stops feeling like an analysis tool and starts feeling like a *founder's instrument*.

### One question before I start

**The Vibe Stack panel** — prefer (a) right-side fixed sidebar that pushes content (desktop) + bottom sheet (mobile), or (b) a floating bubble in the corner that expands into a panel on click (less intrusive but less visible)?

