

## Shape + Polish + Bolder: Simulator Flow Redesign

### The Core Problem You Named

The simulator is a one-shot funnel: idea → analysis → email → Lovable prompt → dead end. The Deep Dive tools (Perspectives, Expand, Distill) are powerful but orphaned — there's no "what now?" after you use them. No iteration loop. No reason to come back tomorrow. No ecosystem routing based on what the AI learned about your idea.

---

### What Exists Today (Current Flow)

```text
Input Idea → 1-3 Analysis Rounds → Final Report
                                      ├── Email Unlock
                                      ├── Deep Dive (Perspectives / Expand / Distill)
                                      ├── Lovable Prompt (copy to clipboard)
                                      ├── PDF Download
                                      └── Share Link
                                      └── "Simulate Another Idea" (dead end restart)
```

Everything terminates at "copy this prompt." No next step. No branching. No return hooks.

---

### Proposed Flow: The Iteration Engine

```text
Input Idea → Analysis Rounds → Final Report
                                  ├── Email Unlock
                                  ├── Deep Dive Tools (existing)
                                  │     ├── Perspectives → Challenge Q's → Answer them → Re-analyze
                                  │     ├── Expand → Pick a variation → Fork as new simulation
                                  │     └── Distill → Core thesis → Scope-locked rebuild
                                  │
                                  ├── ACTION HUB (new) ─────────────────────────────
                                  │     ├── "Build in Lovable" (existing prompt, enhanced)
                                  │     ├── "Generate Claude/ChatGPT Prompt" (new)
                                  │     ├── "Get Impeccable Design Brief" (new)
                                  │     ├── "Find a Domain Expert" (new — partner routing)
                                  │     ├── "Create a Landing Page Test" (new — validation)
                                  │     └── "Iterate on This" (re-enter simulator with context)
                                  │
                                  └── MY SIMULATIONS (enhanced dashboard)
                                        ├── Idea lineage tree (parent → variations)
                                        ├── Side-by-side comparison
                                        └── "Continue where you left off" deep links
```

---

### Deliverables (5 Workstreams)

#### 1. Action Hub — Replace the Dead End
**The biggest impact item.** After the Lovable prompt, add a proper "What's Next?" panel with contextual actions based on what the AI knows about the idea.

- **"Build in Lovable"** — existing prompt copy, but framed as Step 1 with a progress indicator
- **"Generate a ChatGPT/Claude Prompt"** — new edge function that translates the brief into a conversational AI prompt for deeper research, market sizing, or technical architecture exploration. Different output format than the Lovable build prompt.
- **"Get Impeccable Design Brief"** — generates a `SKILL_SHAPE.md`-style design brief the user can paste into Lovable to get a polished, non-generic UI. Leverages the `.impeccable.md` context.
- **"Test with a Landing Page"** — generates a landing-page-specific Lovable prompt (stripped down, conversion-focused) so users can validate demand before building the full product.
- **"Iterate on This"** — re-enters the simulator with the current brief as context, so the AI builds on prior analysis instead of starting from scratch. The key loop-back mechanism.

Each action is contextually surfaced based on the idea's `builder_intent` and `scale_assessment`:
- Venture-scale → show "Find a Domain Expert" prominently
- Experiment → show "Test with a Landing Page" prominently
- Fun/Community → show "Build in Lovable" as the primary, minimize the rest

**New files:** `src/components/simulator/ActionHub.tsx`, `supabase/functions/generate-alt-prompt/index.ts`

#### 2. Iteration Loop — Make Deep Dive Actions Actually Do Something
Currently, Expand generates 3 variations but "Explore this variation" just navigates to `/simulate` with prefilled text — losing all context. Distill generates a thesis but it just... sits there. Fix this:

- **Expand → Fork**: When you click "Explore this variation," create a new `idea_reports` row with `parent_idea_id` set, carry over highlights/anti-highlights, and pre-populate the simulator with the expanded brief (not just the idea text). Show a "Forked from: [original idea]" badge.
- **Distill → Rebuild**: After distilling, offer "Rebuild with this scope" which re-runs the simulator using the distilled thesis + one feature + one customer as the input, producing a tighter, more focused analysis.
- **Perspectives → Respond**: The challenge questions from each persona currently have no interaction. Add answer fields so users can respond, then offer "Re-analyze with your answers" which feeds the responses back into the next simulation round.

**Modified files:** `ExpandContractPanel.tsx`, `PerspectivesPanel.tsx`, `SimulatorShell.tsx`

#### 3. Dashboard Upgrade — Make "My Simulations" a Real Workspace
Currently it's a flat list of cards. Transform it into something that makes users want to come back:

- **Idea lineage tree**: Show parent → child relationships visually (not just "↳ Variation of another idea" text). Collapsible tree or horizontal flow.
- **Side-by-side compare**: Select 2 ideas and see their briefs, scores, and theses compared in a table. Helps users evaluate which direction to pursue.
- **Quick actions on cards**: "Continue Deep Dive", "Generate New Prompt", "Fork This" — without having to re-enter the full simulator.
- **Progress indicators**: Visual progress bar showing how much of the deep dive has been completed (0/5 perspectives, expand done/not done, distill done/not done).

**Modified files:** `MySimulations.tsx`

#### 4. UX Polish Pass (Polish + Bolder Skills)
Apply across the entire simulator flow:

**Polish targets:**
- IdeaInput: the `text-gradient-accent` class is still used (banned pattern). Placeholder text is too long and wraps awkwardly on mobile.
- FinalReport: the email unlock form looks like an afterthought — integrate it into the flow more naturally. "Simulation Complete / Your Breakout Idea" header wastes vertical space.
- Progress stepper (rounds 1-2-3): too small, unclear what each step means until you're in it. Add contextual labels that update based on actual content.
- ThunderdomePanel: the tab descriptions ("5 AI personas weigh in") are hidden on mobile (`hidden sm:inline`). On mobile, the tabs are just icons with no context.

**Bolder targets:**
- IdeaInput page feels generic — same card-on-dark-background pattern as every AI tool. Break the mold: make the textarea feel like a stage, not a form field. Full-width, no container border, just a blinking cursor on a vast dark canvas.
- FinalReport sections are a monotone vertical scroll of identical cards. Break the grid: give the most important sections (problem, core features) dramatically different visual treatment than supporting sections.
- Deep Dive panel is visually identical to the rest of the report — it should feel like entering a different mode. Distinct background treatment, maybe a full-bleed section break.

**Modified files:** `IdeaInput.tsx`, `FinalReport.tsx`, `SimulatorShell.tsx`, `ThunderdomePanel.tsx`, `ExpandContractPanel.tsx`, `PerspectivesPanel.tsx`

#### 5. Ecosystem Routing — The "What If It's Not a Lovable Build?" Path
For ideas that the AI identifies as outside Lovable's sweet spot (healthcare compliance, heavy backend, enterprise security), generate alternative action paths:

- New edge function that takes the brief + scale assessment and generates a **platform-appropriate prompt** — could be a Claude prompt for architecture planning, a ChatGPT prompt for market research, or a technical requirements doc.
- **Partner directory concept**: A simple, hard-coded-for-now panel that surfaces relevant expertise areas based on the brief's industry/category. "Your idea involves healthcare data → you may need a HIPAA compliance consultant." Not a full marketplace — just smart routing suggestions.

**New files:** `supabase/functions/generate-alt-prompt/index.ts`, `src/components/simulator/NextStepsRouter.tsx`

---

### Execution Order

| Sprint | What | Why First |
|---|---|---|
| **A** | Action Hub + UX polish on IdeaInput and FinalReport | Biggest UX gap — users hit a wall after email unlock |
| **B** | Iteration loop fixes (Expand fork, Distill rebuild, Perspective responses) | Makes existing features actually useful |
| **C** | Dashboard upgrade (lineage, compare, quick actions) | Gives users a reason to come back |
| **D** | Ecosystem routing + alt prompt generation | Expands value beyond Lovable-only builds |
| **E** | Full Bolder pass on visual differentiation | Polish after function is solid |

### Database Changes

- Add `forked_context` (jsonb, nullable) to `idea_reports` — carries highlights, anti-highlights, and parent brief context when forking
- Add `perspective_responses` (jsonb, nullable) to `idea_perspectives` — stores user answers to challenge questions
- Add `alt_prompts` (jsonb, nullable) to `idea_reports` — stores generated Claude/ChatGPT/design prompts

### Files Summary

| File | Action |
|---|---|
| `src/components/simulator/ActionHub.tsx` | Create — post-report action panel |
| `src/components/simulator/NextStepsRouter.tsx` | Create — ecosystem routing component |
| `src/components/simulator/IdeaInput.tsx` | Modify — bolder redesign, fix banned patterns |
| `src/components/simulator/FinalReport.tsx` | Modify — integrate Action Hub, polish email flow |
| `src/components/simulator/SimulatorShell.tsx` | Modify — support iteration loop, context carry-over |
| `src/components/simulator/ExpandContractPanel.tsx` | Modify — real forking with context |
| `src/components/simulator/PerspectivesPanel.tsx` | Modify — answer fields for challenge questions |
| `src/components/simulator/ThunderdomePanel.tsx` | Modify — visual differentiation |
| `src/pages/MySimulations.tsx` | Modify — lineage tree, compare, quick actions |
| `supabase/functions/generate-alt-prompt/index.ts` | Create — ChatGPT/Claude/design prompt generation |
| Migration | Add columns to `idea_reports` and `idea_perspectives` |

