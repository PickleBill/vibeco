

# State of VibeCo — Honest Eval & Sprint 4 Plan

## TL;DR

**The skeleton is right. Three things make it feel broken:** (1) the deployed `synthesize` agent is still calling a disallowed model, (2) the brief phase shows three "do something" surfaces stacked on top of each other with no clear primary action, (3) the Lovable Prompt — the actual product — is buried at the bottom of the final report behind ~1,500px of scroll.

We don't need new features. We need to **redeploy edge functions, fix the synthesis model, and re-rank the page so the prompt is the hero.**

---

## Current State Snapshot

### Functionality — what actually works

| Capability | Status | Notes |
|---|---|---|
| 3-round simulator (idea → brief → final) | ✅ Working | Stable since Sprint 1 |
| Lovable Prompt generation | ⚠️ Partial | Generated end-of-round-3, but no "Generate now" button works *until* the email gate is passed in some flows |
| Copy prompt + highlights | ✅ Working | Logic confirmed in `FinalReport.tsx:366` |
| Stress-test inline (brief phase) | ✅ Working | Sprint 1 added `showStressTest` toggle |
| Auto-Analyze (orchestrate + synthesis) | 🔴 **Broken in prod** | Logs show `invalid model: anthropic/claude-sonnet-4-20250514`. Code is fixed; **deployment is stale.** |
| Per-section "Go deeper" | ✅ Working | Renders inline via `simulate-idea` deep_dive mode |
| Sharpen prompt now | ✅ Working | But discoverable only when ≥1 highlight is set |
| Email gate | ⚠️ Confusing | Now only gates PDF/Share, but UI copy still implies it gates the prompt |
| Resume from `/report/:id` and dashboard | ✅ Working | DB persistence solid |
| Inbox / auto-evaluate flywheel | ⏸ Hidden | Route commented out, not wired |
| Portfolio Command Center | ✅ Working but unconnected | Not yet round-tripping with Simulator |

### Operational — what's actually deployed

- **9 edge functions deployed**, but **at least one (`synthesize`) is running stale code** — the `model-router.ts` fix from last session never propagated, OR `synthesize.ts` is bundling a snapshot that hardcoded the model. Logs from 1776976380 prove this.
- `_shared/` modules require a redeploy of every function that imports them. Likely the orchestrator/synthesize functions weren't redeployed.
- Supabase types are still stale — `agent_events`, `auto_score`, `auto_verdict` columns require `as unknown as` casts. Tolerable but tech debt.
- `agent_events` realtime stream exists in DB but is never subscribed to from the client — progress bar in `SynthesisPanel` is fake (just shows 0/7).

### Design — Impeccable audit (against `.impeccable.md` + SKILL files)

**Anti-pattern verdict: 2 / 4 — Some AI tells, but not slop.**

| Violation | Location | Severity |
|---|---|---|
| Card-grid monoculture in `IdeaBrief.tsx` (7 identical cards) | `IdeaBrief.tsx:301-394` | P1 |
| Hardcoded `yellow-500` color (not a token) | `FinalReport.tsx:719-728`, `IdeaBrief.tsx:238-260` | P2 |
| Hardcoded `emerald/blue/amber/pink-400` accent palette | `ExpandContractPanel.tsx:42-46`, `:279-294` | P2 |
| Decorative gradients without justification | `ThunderdomePanel.tsx:42-47, 60-62` | P2 |
| Hierarchy collapse on final report — Lovable Prompt is below 7 sections + scale + builder badge + supporting sections | `FinalReport.tsx:763-957` | **P0** |
| Tab toggle in Thunderdome (4 tabs of equal weight) hides the primary action (Auto-Analyze) | `ThunderdomePanel.tsx:75-100` | P1 |
| 3 progressive email banners (`IdeaBrief` round-1, round-2, `FinalReport` top) — feels naggy | Multiple | P1 |

**Layout hierarchy (Section 3 of Impeccable): "no monoculture"** is violated in `IdeaBrief` and final report — every section gets the same card treatment. Hero/supporting split exists in `FinalReport.tsx:762-880` but only between Problem+Features and the rest. The prompt itself is buried.

**Score: 11/20 (Acceptable)** — Accessibility 3, Performance 3, Theming 2 (hardcoded colors), Responsive 3, Anti-Pattern 2. Improvement target: 16+ after Sprint 4.

---

## What's Actually Broken vs What Just Feels Broken

| Issue | Type | Fix complexity |
|---|---|---|
| Auto-Analyze 400/500 errors in prod | **Real bug** — stale deploy | Trivial (redeploy + verify) |
| Synthesis confidence ring renders fake progress | **Real bug** — never subscribed to realtime | Small (`agent_events` channel) |
| Lovable Prompt buried under 7 sections | **UX failure** | Medium (re-rank `FinalReport`) |
| 4 equal-weight tabs in Thunderdome | **UX failure** | Small (promote Auto-Analyze, demote others) |
| 3 email banners | **UX failure** | Small (consolidate to 1) |
| Hardcoded colors (`yellow-500`, `emerald-400`) | **Theming debt** | Small (semantic tokens already exist) |
| Card monoculture in IdeaBrief | **Design debt** | Medium (alternate layouts for hero sections) |

---

## Sprint 4 Plan — "Make the Prompt the Hero"

Goal: anyone landing on the final report sees the Lovable Prompt within one viewport. Auto-Analyze works in production. Visual hierarchy reflects actual importance.

### 4a — Stop the bleeding (this session)

1. **Redeploy all edge functions** so the model-router fix actually takes effect. Verify with a curl test against `synthesize` and `orchestrate`.
2. **Add timing log + retry** in `synthesize.ts` so a model failure auto-falls-back to `google/gemini-2.5-pro` instead of returning null.
3. **Wire `agent_events` realtime** in `SynthesisPanel` — subscribe on mount, show actual per-agent completion (Skeptic ✓, Champion ⏳…). Replaces the fake progress.

### 4b — Re-rank the final report (this session)

4. **Promote the Lovable Prompt to position 2** in `FinalReport.tsx`, right after the title block:
   - Position 1: idea + scores + scale assessment (~300px)
   - Position 2: **Lovable Prompt** — fully expanded, with a sticky "Copy + highlights" button (~400px)
   - Position 3: Hero sections (Problem + Core Features) with deep-dive
   - Position 4: Supporting sections
   - Position 5: Stress-test (`ThunderdomePanel`)
   - Position 6: ActionHub
5. **Promote Auto-Analyze in the Thunderdome tabs** — make it a full-width primary CTA at top instead of one of four equal tabs. The other three (Perspectives / Expand / Distill) become a secondary "or explore one lens" row underneath.
6. **Consolidate email banners** — one banner only, on the final report top, with copy "Save your report (PDF + share link). Your prompt is below either way."

### 4c — Theming pass (this session)

7. **Replace hardcoded colors** with semantic tokens:
   - `yellow-500` → `warning` (already defined)
   - `emerald-400`, `blue-400`, `amber-400`, `pink-400` in ExpandContractPanel → introduce `accent-1`, `accent-2`, `accent-3`, `accent-4` or use `chart-*` tokens already in `index.css`
8. **Break the IdeaBrief card monoculture** — Problem + Core Features get a typographic hero treatment (no card border, larger type), the other 5 stay as cards. Mirrors the FinalReport pattern.

### 4d — Defer to Sprint 5 (Flywheel)

These are scoped out of Sprint 4 to keep it shippable in one session:
- `/inbox` route + `auto-evaluate` cron
- Portfolio ↔ Simulator round-trip ("rebuild this project")
- Per-persona "Apply critique" buttons (still in plan, but not blocking core UX)
- Confidence-gated destructive prompt overwrites
- Cost surfacing in SynthesisPanel

---

## On the Claude Code Branch

The shared infrastructure (`_shared/agents/*`, `cors.ts`, `llm-client.ts`, `model-router.ts`) is in `main` and working — just deploy-stale. Don't merge new code from `claude/ai-agent-architecture-Xc8pG` until Sprint 5. Every unmerged change widens the drift.

## On Impeccable Style

After Sprint 4 ships, run `Run impeccable audit /simulate` to score the new state. Target: 16/20 (Good). The biggest wins will come from breaking the IdeaBrief monoculture and replacing hardcoded color literals.

## Files Sprint 4 Will Touch

| File | Change |
|---|---|
| `supabase/functions/_shared/agents/synthesize.ts` | Add try/fallback to gemini-2.5-pro on model error |
| `supabase/functions/orchestrate/index.ts` | Force redeploy via no-op edit + model fallback |
| `src/components/simulator/SynthesisPanel.tsx` | Wire `agent_events` realtime channel, replace fake progress |
| `src/components/simulator/FinalReport.tsx` | Re-rank: prompt to position 2, consolidate email banners |
| `src/components/simulator/ThunderdomePanel.tsx` | Auto-Analyze becomes primary CTA, others become secondary tabs |
| `src/components/simulator/IdeaBrief.tsx` | Hero typographic treatment for Problem + Core Features; replace `yellow-500` with `warning` |
| `src/components/simulator/ExpandContractPanel.tsx` | Replace hardcoded `*-400` colors with semantic accent tokens |
| `src/index.css` / `tailwind.config.ts` | Add `accent-1`..`accent-4` tokens if not present |

### Open Questions Before Sprint 4

1. **Final report ordering:** prompt at position 2 (right after title) or position 1 (before idea/scores)? Position 2 keeps context but position 1 is most aggressive.
2. **Thunderdome layout:** keep Perspectives/Expand/Distill as visible tabs under Auto-Analyze, or hide behind an "Explore one lens at a time" disclosure?
3. **Email banner:** keep on final report only, or also on round-2 brief? My instinct says final report only — stop nagging mid-flow.

