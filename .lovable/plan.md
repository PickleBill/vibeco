# Make Auto-Analyze the headline verdict (connect the existing engine)

This is an **additive wiring + placement** change. The `/orchestrate` engine, the synthesis agent, and almost all the UI already exist — the work is to (a) make the realtime progress actually fire, and (b) move the synthesis to the top of the report as the headline "Verdict." No engine rebuild.

## What already exists (confirmed by reading the code)

- `orchestrate/index.ts` runs 5 personas + Expand + Distill in parallel, emits `agent_events`, then calls `synthesize`, returning `{ perspectives, expansion, distillation, synthesis, timing, agents_completed, agents_total }`.
- `synthesize.ts` returns exactly: `consensus[]`, `tensions[]`, `confidence_score` (0–100), `ranked_recommendations[]`, plus `refined_brief_suggestions[]`, `prompt_modifications[]`, `executive_summary`.
- `SynthesisPanel.tsx` already: calls `orchestrate`, subscribes to `agent_events` realtime, shows a live "agents in parallel" progress grid with per-agent teasers, and renders Consensus / Tensions / Confidence / Ranked-recs.
- `ThunderdomePanel.tsx` already defaults to the Auto-Analyze (synthesis) tab with Perspectives / Expand / Distill collapsed below.

## The two real gaps

1. **`agent_events` does not exist in the live DB.** Verified: the table is absent and `supabase_realtime` has zero tables. A migration file exists in the repo but was never applied. So `orchestrate` writes events into a silent `try/catch` no-op and the realtime subscription never receives anything — the progress bar today only updates from the *final* response (the "dead wait" the request calls out).
2. **Synthesis is tab-gated and low on the page**, not the report's headline above the persona tabs.

## Confirmed decisions

- **Synthesis model:** keep `google/gemini-2.5-pro` (your choice). `model-router.ts` already maps `synthesis → gemini-2.5-pro`; no router change.

## Changes

### 1. Migration — create `agent_events` (enables real live progress)
Apply a migration that creates `public.agent_events` (matching the existing repo migration's shape: `report_id`, `agent`, `event_type`, `data jsonb`, `created_at`), with the required GRANTs and RLS, and adds it to the realtime publication:
- `GRANT SELECT` to `anon` + `authenticated` (the simulator runs for signed-out visitors, so anonymous clients must be able to read their own report's progress stream), `GRANT ALL` to `service_role` (orchestrate inserts via the service-role key).
- RLS enabled; `SELECT USING (true)` and `INSERT WITH CHECK (true)` (progress events are non-sensitive workflow signals keyed to an opaque report UUID).
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_events`.

Scope is `agent_events` only (the unused `org_decisions` table in the old migration file is out of scope). After this, the existing subscription in the panel lights up with real events — no code change needed for the stream itself.

### 2. Promote synthesis to a top-of-report "Verdict" block
- Render the synthesis as the **first block** of the report (after the title hero, above the brief/per-lens content) instead of inside the low `ThunderdomePanel` synthesis tab.
- Keep it **one click**: empty state shows a prominent "Run Auto-Analyze (Recommended)" CTA + Quick/Deep toggle → clicking it calls `/orchestrate` (single call). No forced auto-run on report load.
- While running: the existing live progress grid (driven by real `agent_events` now) showing the 7 lenses completing with teasers.
- When done: a **Verdict** block with four clearly labeled parts, mapped from the real `synthesize` output:
  - **Consensus** → `consensus[]`
  - **Key tensions** → `tensions[]` (topic + positions + resolution)
  - **Confidence** → `confidence_score` shown as the numeric value + qualitative label
  - **Ranked recommendations** → `ranked_recommendations[]`, **numbered 1..n**
- Retain the existing "Apply synthesis to prompt" action.

### 3. Reduce `ThunderdomePanel` to per-lens exploration (kept below, additive)
- Remove its now-duplicate synthesis tab; keep **Perspectives / Expand / Distill** exactly as-is as "explore one lens at a time," below the brief. These continue to call their individual functions on demand — unchanged behavior.

### 4. Mobile
- Verdict block stacks single-column below `768px`; confidence + progress states are one-hand readable; no horizontal overflow.

## Technical details

- **Refactor approach:** extract `SynthesisPanel`'s run/subscribe logic into a small hook (e.g. `useOrchestrate`) and a presentational `VerdictBlock`, then mount the block at the top of `FinalReport.tsx`. Reuse the existing rendering and the `SynthesisData`/`OrchestrateResult` types verbatim — no invented fields.
- **No engine/edge changes:** `orchestrate`, `synthesize.ts`, and `model-router.ts` are untouched.
- **Types:** `agent_events` will appear in the regenerated Supabase types after the migration; the realtime subscription uses the generic channel API and needs no manual type edits.

### Files touched
- `supabase/migrations/<new>.sql` (new — `agent_events` only)
- `src/components/simulator/FinalReport.tsx` (mount Verdict at top)
- `src/components/simulator/SynthesisPanel.tsx` (split into hook + presentational Verdict, relabel parts, number recs)
- `src/components/simulator/ThunderdomePanel.tsx` (drop synthesis tab; keep per-lens)

## Post-build verification
- Network: clicking Auto-Analyze fires a single `/orchestrate` call (not 5 persona calls).
- Progress animates from real `agent_events` INSERTs (confirm rows land + realtime delivers).
- Verdict shows Consensus / Key tensions / Confidence (with value) / numbered Ranked recs from real output.
- Perspectives / Expand / Distill panels still work below.
- Mobile: single column, no overflow.
