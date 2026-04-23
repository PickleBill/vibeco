

# VibeCo: Production-Ready Reset

You're right — we have a lot of cool features sitting next to each other but the core promise ("paste an idea → get something you can actually build") is broken. Let's fix the engine first, then prune.

## What's Actually Broken (verified in code)

1. **Build is red.** Two TypeScript errors block deploy:
   - `orchestrate/index.ts:47` — inserts into `agent_events` table that exists in a migration but isn't in the generated `types.ts` yet (Supabase types are stale).
   - `Inbox.tsx:71` — selects `auto_score`/`auto_verdict`/`auto_source` columns that exist in a migration but aren't in `types.ts`.
   - **Fix:** force a Supabase types regeneration by touching the migrations or running them, then cast the two queries through `as unknown as` to unblock immediately.

2. **The Lovable Prompt copy with highlights doesn't actually copy in some browsers.** `copyToClipboard` has the fallback, but the button only calls `handleCopyPromptWithHighlights` when `lovablePrompt` exists. If `simulate-idea` finishes without returning `lovable_prompt` (possible when round 3 hits an error path), the copy block never renders. **Fix:** always show the prompt area; if the prompt is missing, show a "Generate Prompt" button that calls `refine-prompt` directly.

3. **Deep Dive (Thunderdome) is gated behind email unlock and only appears at the very bottom of the final report.** Users never find it. The Perspectives/Expand/Distill panels work but produce output that doesn't feed back anywhere — there's no "apply this" loop. **Fix:** surface Deep Dive in the brief phase too, and make every Perspective/Expansion/Distillation result have a single primary action ("Apply to brief" / "Replace prompt").

4. **"This resonates" / "Not quite" buttons do nothing visible.** They mutate `highlights`/`antiHighlights` state, which only takes effect when a *new* round runs or the prompt is copied. Users click them and see no feedback. **Fix:** show a tiny inline "Will sharpen the prompt" pill the moment a highlight is toggled, and add a "Sharpen prompt now" button that re-calls `refine-prompt` without forcing a full new round.

5. **Landing page generation is orphaned.** `generate-landing-page` exists, no UI calls it. Either wire it into ActionHub as one option or delete the function. Recommended: delete for now.

6. **Two simultaneous "deep dive" surfaces** (per-section ChevronDown deep dives in `FinalReport`, plus the bottom Thunderdome) create the confusion you're describing. Both are useful but unlabeled. **Fix:** rename clearly — per-section becomes "Go deeper on this section", bottom panel becomes "Stress-test the whole idea".

7. **Claude Code branch (`claude/ai-agent-architecture-Xc8pG`) is partially merged.** The `_shared/agents/*`, `orchestrate`, `synthesize`, `auto-evaluate` files exist but no UI uses `orchestrate` and the Inbox query is broken. The work is sitting dormant. **Fix:** either wire `orchestrate` into a single "Auto-Analyze" button at the top of the brief phase (1 call replaces 7) or hide `/inbox` from nav until it's connected to real data.

## The Plan: Three Sequential Sprints

### Sprint 1 — Unblock & Stabilize (this session)

Goal: green build, every existing button does something visible.

- Fix the two TS errors with `as unknown as` casts and a comment explaining the types-regen gap
- Make the Lovable Prompt always visible on the final report (no email gate on the prompt itself; keep email gate on PDF/share only)
- Add the inline "Sharpen prompt now" action on highlight toggles, calling `refine-prompt`
- Rename the two deep-dive surfaces so they're distinguishable
- Add a single "Run full Deep Dive" CTA in the brief phase that opens Thunderdome inline (don't wait for final report)
- Hide `/inbox` from nav until Sprint 3 wires it up

### Sprint 2 — Make the Loop Real (next session)

Goal: every panel feeds back into the brief or prompt.

- Wire `orchestrate` to a single "Auto-Analyze" button at the top of the brief — fires all 5 personas + expand + distill + synthesize in one call, shows progress via Realtime `agent_events`
- Build a `SynthesisPanel` showing consensus, tensions, confidence score, and **a single "Apply to brief" button** that calls `refine-prompt` with the synthesis as input
- Each persona perspective gets an "Apply this critique" button → re-runs `simulate-idea` with that perspective injected
- Each expansion gets a "Fork into new simulation" button (already exists in ActionHub, surface earlier)
- Distill output replaces the prompt directly with a confirmation

### Sprint 3 — Connect the Flywheel (later)

Goal: VibeCo becomes the hub for your 65 projects.

- Wire `/inbox` to `auto-evaluate` so external sources (Idea Lab, MCP) can pipe ideas in
- Portfolio → Simulator round-trip: register Courtana Pulse, run Auto-Analyze, push the refined prompt back as a "next iteration spec" attached to the project_registry row
- Re-evaluate Impeccable Style: audit the simulator screens against the 9 SKILL files (probably means: less card-grid, more typographic moments in `IdeaBrief` and `PerspectivesPanel`)

## What to Cut

These features are dormant or confusing. Recommend deleting in Sprint 1 to reduce surface area:

- **`generate-landing-page` edge function + any UI references** — orphaned, not part of the core loop
- **The "history" tab in `SimulatorShell`** when there's only 1 prior round — show inline instead
- **The brief-phase "Analysis" vs "Questions" tab toggle** — collapse into one scrollable view; the toggle hides what the user just generated

## On the Claude Code Branch

The shared infrastructure (`_shared/agents/*`, `cors.ts`, `llm-client.ts`, `model-router.ts`, `error-handler.ts`) is solid and already in place. Keep it. The `orchestrate` and `synthesize` agents are also good — they just need a UI. **Don't merge anything new from that branch until Sprint 2** when we actually wire `orchestrate` to a button. The risk of further drift between branch and main grows with every unmerged change.

## On Impeccable Style

The 9 SKILL files in your root are the right framework but the simulator screens haven't been audited against them. After Sprint 1 stabilizes the flow, run `Run impeccable audit /simulate` to catalog the violations (probable hits: card monoculture in `IdeaBrief`, decorative gradients without justification in `ThunderdomePanel`, button variant proliferation). For other projects, the consolidated `/mnt/documents/impeccable-style-v2.1-complete.md` file is the right artifact — paste its core principles into each project's Knowledge settings.

## Files Changed in Sprint 1

| File | Change |
|---|---|
| `src/pages/Inbox.tsx` | Cast query result; hide route from nav |
| `src/components/Navbar.tsx` | Remove Inbox link until Sprint 3 |
| `supabase/functions/orchestrate/index.ts` | Cast `agent_events` insert |
| `src/components/simulator/FinalReport.tsx` | Always render Lovable Prompt; rename per-section deep dive; add "Sharpen prompt now" |
| `src/components/simulator/SimulatorShell.tsx` | Add "Run Deep Dive" CTA in brief phase; collapse Questions/Analysis tabs |
| `src/components/simulator/ThunderdomePanel.tsx` | Header rename + clearer subtext |
| `supabase/functions/generate-landing-page/` | Delete |
| `supabase/functions/_shared/agents/landing-page.ts` | Delete |

### Open Questions Before Sprint 1

1. **Email gate scope:** keep email required for PDF/share but free the Lovable Prompt itself? Or remove the email gate entirely since most users bounce at it?
2. **Deep Dive timing:** offer it during the brief phase (after round 1) or only after round 3 is complete?
3. **Auto-Analyze default mode:** should clicking "Auto-Analyze" use Quick mode (~30s) or Deep mode (~90s)?

