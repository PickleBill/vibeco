## Goal

1. **Stop losing analysis on refresh** — persist every generated output and rehydrate from the DB.
2. **Make the path obvious** — a 5-stage linear spine with a stepper, Auto-Analyze as the clear primary, and a clickable example idea.
3. **Lock down privacy** — each visitor gets a private session; one visitor cannot read another's report; share links still work.

---

## A. Persistence (lower-risk choice: additive columns, NOT a new table)

Most outputs already have DB homes on `idea_reports` and are being written:
- `lovable_prompt`, `alt_prompts` (research_prompt + design_brief + landing prompt — written by ActionHub), `expanded_ideas`, `thesis_statement` (distill), `highlights`, images.
- Per-persona single-lens outputs persist to `idea_perspectives`.

Genuinely missing homes — add **two additive nullable columns** to `idea_reports` (lowest risk: the load path already does `select("*")`, no joins, no new RLS surface):
- `auto_analysis jsonb` — the full Auto-Analyze (`/orchestrate`) result: **synthesis + the 5 persona outputs + expansion + distillation + agent timing/meta**, as one bundle.
- `landing_page_html text` — the generated landing page (today it only lives in the email-gated `simulator_captures`).

**Write-on-generate:** `SynthesisPanel` writes `auto_analysis` to the report immediately after `/orchestrate` returns; the landing-page generator writes `landing_page_html`. ActionHub/expand/distill already persist.

**Hydrate-on-load:** `SimulatorShell`'s resume path and `Report.tsx` read these columns and rehydrate the Verdict, expand, distill, alt-prompts, and landing page so a returning visitor sees everything.

## B. Flow — 5-stage linear spine

New `SimulatorStepper` component rendered at the top of `SimulatorShell`:

```text
1 Describe → 2 Analyze → 3 Verdict → 4 Build prompt → 5 Next actions
```

- Current stage highlighted in **emerald**; completed stages filled, upcoming muted.
- Stage derived from existing `phase` (`input`→1, `analyzing`/`brief`→2) plus scroll position within `final` (Verdict→3, prompt→4, ActionHub→5).
- **Mobile (<768px):** collapses to a compact progress-dots row, no labels, no overflow.

**Reduce the "wall of equal options":** On the analyze step, **Auto-Analyze is the single prominent emerald primary CTA**. Everything else (explore one lens at a time — Perspectives / Expand / Distill) is grouped under a secondary, collapsed "Advanced" disclosure. (ThunderdomePanel is already demoted; this finishes the visual hierarchy.)

## C. First-run / empty state

In `IdeaInput`, when empty, show **one clickable example-idea chip** using a generic example (not Bill's projects), e.g. *"A monthly subscription box for houseplants with app-based care reminders."* Clicking it prefills the idea and runs the full flow end-to-end.

## D. Privacy / RLS — anonymous sessions (approved)

- **Enable anonymous auth.** On app bootstrap, if there is no session, call `signInAnonymously()` so every visitor has a private uid that survives refresh. All report/perspective writes set `user_id = auth.uid()`.
- **Tighten `idea_reports` RLS:** replace the world-readable `SELECT (true)` with `SELECT USING (user_id = auth.uid())`; `INSERT`/`UPDATE` scoped to `user_id = auth.uid()`. Same owner-scoping for `idea_perspectives` and the new columns (they live on the owned report).
- **Keep share links working:** add a `SECURITY DEFINER` function `get_shared_report(report_id uuid)` returning only non-PII display fields (idea, brief, prompt, images, `auto_analysis`, `landing_page_html`). The public `Report.tsx` calls this RPC instead of `select("*")`, so holders of a link still view a report, but the base table is no longer bulk-readable.
- **Result:** a second anonymous session (different uid, no link) cannot read or enumerate another session's reports.

## E. Report design cleanup (`Report.tsx`)

Refresh the public read-only report to the design system (matte dark, emerald accents, fluid `clamp()` type, no nested cards): add a Verdict summary block (consensus / tensions / confidence / ranked recs from `auto_analysis`), surface the landing page and alt-prompts, and tighten spacing/hierarchy. Read-only, no PII.

---

## Files

- **Migration** (new): add `auto_analysis jsonb`, `landing_page_html text` to `idea_reports`; rewrite RLS for `idea_reports` + `idea_perspectives` to owner-scoping; create `get_shared_report` RPC with `GRANT EXECUTE` to `anon, authenticated`.
- **Auth config:** enable anonymous sign-ins.
- `src/App.tsx` (or a small `useEnsureSession` hook) — bootstrap anonymous session.
- `src/components/simulator/SimulatorStepper.tsx` (new) — desktop stepper / mobile dots.
- `src/components/simulator/SimulatorShell.tsx` — mount stepper, set `user_id` on insert, hydrate new columns on resume.
- `src/components/simulator/SynthesisPanel.tsx` — persist `auto_analysis` after orchestrate; hydrate from it.
- `src/components/simulator/IdeaInput.tsx` — example-idea chip.
- `src/components/simulator/ActionHub.tsx` — persist `landing_page_html` when generated.
- `src/pages/Report.tsx` — call `get_shared_report` RPC; design refresh + Verdict block.

## Notes / trade-offs

- Existing anonymous reports (with `user_id IS NULL`) become unreadable under the new owner-scoped policy — acceptable, they were already ephemeral. Anonymous→Google account linking is out of scope (noted, not built).
- Anonymous sessions count toward auth users but are the standard, robust way to enforce per-visitor RLS without forcing login.

## Post-build verification

- [ ] Refresh the report restores synthesis, expand, distill, alt-prompts, landing page from DB.
- [ ] Stepper shows 5 stages; Auto-Analyze is visually primary; others under "Advanced".
- [ ] Example-idea chip runs the full flow end-to-end.
- [ ] A second anonymous session cannot read the first session's report (via UI + direct table query).
- [ ] Share link still opens a clean read-only report.
- [ ] Mobile stepper renders as dots with no overflow.
