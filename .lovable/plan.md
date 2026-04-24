

# Sprint 9 — `/distill` + `/shorten`: Cut, Tighten, Trust the Loop

## The honest read

You're right. The loop works now, but the **surface area is bloated**: too many sections, too many chips, too many footers, too many buttons that mean almost the same thing. Three concrete examples I found in the code:

1. **The concept image in `IdeaBrief`** — a 192-256px hero image that adds zero decision-value. Just visual filler.
2. **`HighlightChips` is rendered twice per section** in `IdeaBrief` (header chip) AND in `FinalReport` (`renderHighlightToggles` + `AddToStackButton` footer). Same job, two places.
3. **`SimulatorShell` mounts `ThunderdomePanel` twice** — once inline during the `brief` phase ("Run stress-test" inline) and again at the bottom of `FinalReport`. Two state trees, two sources of truth, same component.

Plus accumulated debt I can see: emoji intent labels in `MySimulations` (we already cleaned them in `FinalReport`, never finished the dashboard), `SortableFeature` has no keyboard escape if someone accidentally grabs it, the Vibe Stack has no "what is this?" explainer for first-timers.

This sprint: **remove three things for every one we add**.

---

## Where Sprint 8 actually landed (audit)

| Phase | Status | Notes |
|---|---|---|
| 8.1 Iterate-in-place | ✅ Built | `editMode` toggles inline `<Textarea>` per section, `handleReSimulateWithEdits` runs a new round. **Untested edge case**: re-simulate while pendingPrompt diff is open — might lose the diff silently. |
| 8.2 Vibe Stack | ✅ Built | DB table, hook with localStorage fallback, drawer, `+ stack` on most sections, `refine-prompt` accepts `stack_items`. **Gap**: no first-run explainer; chits don't show *which round* they came from. |
| 8.3 Sub-nav + contrast | ✅ Built | Sticky pill nav (Prompt/Brief/Stress-test/Actions), `IntersectionObserver` tracks active. **Gap**: nav only on FinalReport, not the brief phase; on 402px the 4 pills barely fit. |
| 8.4 Dashboard polish | ✅ Built | Title column, always-visible quick actions on touch, `Continue` button, tap microinteractions. **Gap**: emoji intent labels still leaking, "selection checkbox" still hover-gated (`opacity-0 group-hover:opacity-100`). |
| 8.5 Cmd+K + drag/hover micro-rules | ⚠️ Partial | Drag works on features + stack, hover `+ stack` on feature rows, but **no Cmd+K palette**, no `j`/`k` nav. |
| 8.6 Cleanup | ⚠️ Partial | PDF fake scores fixed, ThunderdomePanel duplication NOT collapsed, motion-ease audit not run. |

**Verdict: B+, not A+.** The loop is functional but rough. Three things stand between us and shipping: the duplications, the unguided UX, and untested edges.

---

## Sprint 9 plan

### Phase 9.A — `/shorten` (the cuts)

Things that go away. No replacement, no debate.

**FinalReport**
- **Remove the concept image hero** in `IdeaBrief` entirely (lines 268-289). It's filler. Logo image stays in dashboard cards only.
- **Collapse the duplicate Thunderdome mount** — remove the inline `showStressTest` panel from `SimulatorShell` brief phase. There's already a Stress-test section in FinalReport with proper sub-nav anchor. One source of truth.
- **Kill the second email banner** at top of FinalReport (lines 786-820). The PDF/Share buttons should just *prompt for email on click* if not unlocked. One less always-on banner.
- **Remove `computeScores` entirely** — including the export. It's dead deterministic-hash data, no longer rendered (we removed it from PDF cover but the function and the import survive).
- **Strip the `intentLabels` emoji map in `IdeaBrief`** (🧪👥🎯☀️🚀🎮) and the matching map in `MySimulations` — quiet typography only, like FinalReport already does.
- **Remove the redundant `HighlightChips` from `IdeaBrief` Tier 3 supporting sections** — the header chip + the per-section pulse is enough; the compact chip on every supporting row is noise on mobile.

**IdeaInput**
- **Hide the `Import Project` toggle entirely** until the manifest API ships (memory says this was tabled). The "Beta" badge is honest but adds a decision the user shouldn't have to make. Move it behind a `?import=1` URL param for testing.

**Dashboard**
- **Remove the side-by-side compare panel checkbox flow** OR commit to it visibly (right now the checkbox is `opacity-0 group-hover:opacity-100` on touch — invisible). My vote: remove until Sprint 10. It's a feature for power users we don't have yet.

### Phase 9.B — `/distill` (the tightening)

Things that stay but get sharper.

**One-button sharpen rule**
There are now 3 places to "sharpen":
- `runRefine` in FinalReport (`handleSharpenPrompt`)
- VibeStack drawer's `onSharpen` handler in SimulatorShell
- Deep-dive footer's `Use in prompt`

Collapse to **one entry point**: the Vibe Stack drawer is the canonical sharpen surface. Deep-dive's `Use in prompt` *adds the insight as a pinned chit + opens the drawer with the chit highlighted* — instead of running its own refine call. The drawer's "Sharpen prompt" button is the one true CTA. (Keeps the diff/keep/revert flow we built; just centralizes the trigger.)

**Vibe Stack first-run guidance**
Empty state inside the drawer currently shows nothing useful. Add:
- A 3-line "How this works" hint: *Tap `+ stack` on anything that resonates → pin the must-haves → tap Sharpen.*
- Per-chit, show a tiny round badge (`R1` / `R2` / `R3`) so the user knows *when* in their journey they captured it.

**Brief sub-nav (parity with FinalReport)**
Add the same sticky pill nav to the brief phase: `Analysis · Stress-test · Questions`. Right now the brief is just a long scroll with no orientation.

**Highlight chip language**
Today: "This resonates" / "Not quite". Both are 2 words but read flat. Tighten:
- "✦ Keep" / "✕ Cut" — verbs, not adjectives. Matches the Vibe Stack's `pin` / `cut` vocabulary so the loop feels coherent.

### Phase 9.C — `/refine` UX (drag, accidents, lost users)

**Drag-and-drop accidents**
- `SortableFeature` has `activationConstraint: { distance: 5 }` (good), but no escape. Add: `Escape` key cancels active drag (dnd-kit supports this with a custom keyboard sensor). Currently if you grab a feature on mobile and panic-scroll, you can't bail.
- The Vibe Stack drawer drag has no visual placeholder gap — items snap awkwardly. Add a `DragOverlay` so the dragged chit floats and the destination shows a visible drop slot.

**Accidental clicks**
- Highlight chips and `+ stack` buttons have **no undo**. Today, click "Cut" on a section and it's silently flagged. Fix: every toggle action shows a `sonner` toast with "✓ Added to stack — Undo" for 4 seconds. Reuses what we already have.
- The "Start over" / "Start fresh instead" CTA wipes all rounds + highlights with no confirmation (already wired in `handleStartFresh`). Add the same `AlertDialog` we use for `setShowRestartConfirm` — currently that confirm dialog exists but isn't gating "Start fresh" from `IdeaInput`.

**Lost-user moments**
- After "Refine in place" → edit a textarea → click outside → no visual save indicator. Add a quiet "● Edited" dot next to each section header that's been touched.
- After a user pastes a prompt into Lovable, the FinalReport sits there with no "what now?" cue. Add a single quiet line in the action row: *"Built it? Paste the URL to import as a child idea →"* (links back to dashboard with `?import=1`). Closes the loop visually even if the import isn't auto.

### Phase 9.D — Test the loop end-to-end (the A+ gate)

Before we declare this sprint done, the three checkpoints from Sprint 7 still apply:
1. Fresh idea → Vibe Stack curated → sharpened prompt → copied to clipboard, **under 90 seconds, with no "wait did that work?" moments**.
2. Every button does something visible within 300ms or shows a real error with retry.
3. Iterate-in-place → re-simulate → new round arrives → previous edits visible in history collapsible.

I'll walk all three on the 402px viewport using the browser tools after the build, fix anything that's not crisp, and report back with what was checked.

---

## Sequencing

| Phase | What | Why first |
|---|---|---|
| 9.A | The cuts (image, dup mounts, dead code, emoji, redundant chips, import toggle, hover-only checkbox) | Removing complexity unblocks every other change. ~5 files touched, no risk. |
| 9.B | One-sharpen rule + Vibe Stack guidance + brief sub-nav + chip language | The polish that makes the cuts feel intentional, not like things just disappeared. |
| 9.C | Drag escape + undo toasts + edited indicator + "what now" cue | Forgiveness layer. Catches accidental clicks and orients lost users. |
| 9.D | Live walkthrough on 402px viewport + fix list | The A+ gate. No declaring done without this. |

All four fit in one sprint. Stop after 9.A + 9.B for a checkpoint if you want to feel the cuts before the polish.

---

## What's *not* in this sprint (parking lot)

- **`/critique`** — ready to run as a follow-up sprint. Best timing: *after* 9.D so we critique the tightened version, not the bloated one. Will produce a Nielsen-heuristic scored design report (per `SKILL_CRITIQUE.md`) with P0–P3 issues.
- **`/audit`** — the technical health audit (per `SKILL_AUDIT.md`): a11y, performance, theming, responsive, anti-patterns. Best timing: same sprint as `/critique`, parallel pass. They're complementary — critique is design, audit is implementation.
- **Cmd+K palette + j/k nav** — punted from 8.5, still valuable but only after the loop is *visibly* tight. Adding shortcuts to a noisy UI just hides the noise.
- **Auto-fork on snapshot** (the `/expand` move) — still a great next-sprint idea after the loop is A+.
- **Tagline-as-masthead** (the original `/distill` next-action) — folds naturally into Sprint 10 once the report is shorter.

---

## My recommendation on order of follow-on skills

1. **This sprint (9): /shorten + /distill the UX itself** ← we are here
2. **Sprint 10: /critique + /audit in parallel** (no new features, all measurement + fix list)
3. **Sprint 11: tagline-as-masthead + Cmd+K** (the delight layer, on a known-clean foundation)
4. **Sprint 12: /overdrive — agent-mediated portfolio import** (the unlock that's been waiting)

This sequence stops the "build outward" pattern. Each sprint either *removes* surface area or *measures* what we have. We don't add a new feature again until Sprint 11, and even then it's on a foundation we've audited.

### One question before I start

**The concept image** — confirming we kill it everywhere (brief, FinalReport, dashboard cards), or do you want to keep the dashboard logo image as a small avatar (it's currently 44px and reads more as identification than decoration)? My read: kill brief image, **keep dashboard logo** as a 44px identifier. If you disagree, say "kill all" or "keep all" and I'll align.

