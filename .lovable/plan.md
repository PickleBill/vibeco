# VibeCo + Courtana — orchestration, knowledge, and the P2 build

## The big picture (how the pieces talk)

```text
            ┌──────────────── CANONICAL TRUTH ────────────────┐
            │  Courtana MCP server (courtana-mcp-server/)      │
            │  • knowledge tools (reads each repo's *.md)      │
            │  • org memory + project_registry (Supabase)      │
            └───────▲───────────────────────────▲─────────────┘
        reads/writes│                            │reads/writes
     ┌──────────────┴───────┐          ┌─────────┴────────────┐
     │ CLAUDE (orchestrator)│  specs   │  LOVABLE (builder)    │
     │ forges spec + grades │ ───MCP──▶ │  React/TS + Supabase  │
     │ reads diffs back     │ ◀──block─ │  returns Changed/...  │
     └──────────────────────┘          └──────────────────────┘
         each Lovable project's Knowledge field = thin POINTER
         to canonical truth + the handshake contract (no copies)
```

Your decisions, locked in:
- **Knowledge home:** Courtana MCP server (already built) as machine truth; per-project Knowledge = thin pointer, not a duplicate.
- **Integration depth:** Claude drives via MCP, *gated* — hard stops on deploy/publish/secrets/destructive. Lovable pushes back through the return block (two-way, Claude isn't assumed right).
- **Marquee model:** route synthesis + grader + refine to Claude (pairs with a spend cap).
- **Naming:** decide "grade-and-refine" rename after P2 ships.

---

## Phase A — Knowledge architecture (no-drift, before more building)
Goal: one source of truth, 65+ projects point at it instead of copying.
1. **Standardize the per-project Knowledge field** to a short, fixed template: (a) the Claude collaboration handshake (already pasted here — keep it), (b) a pointer line naming the canonical files in the MCP registry, (c) the project's Supabase ref + a one-line "what this project is." Same skeleton in every project; only the identity lines differ.
2. **Register VibeCo v1 and v2 in `project_registry`** with a shared `family: "vibeco"` tag so the MCP server can answer "show me both VibeCo projects" — this is how you "connect two" without merging codebases.
3. **Author the canonical docs once** (in the AI-Opportunity-Engine repo the MCP server reads): the handshake contract, the design system, the model-routing policy. Lovable Knowledge fields reference these by name; they never re-state them.
4. **Pitfall guardrail:** the Lovable Knowledge field is per-project and not shared — never treat it as the source of truth. If it and the canonical doc disagree, the contract already says "surface the conflict, don't guess."

## Phase B — Tighten the Claude↔Lovable loop (this project, low risk)
1. Confirm the handshake (Part A) is installed (done) and that every change here ends with the **Changed / Verification / Didn't apply / Open questions** block — this is the back-channel that lets Lovable disagree with Claude.
2. Keep the **hard gates** explicit in the contract: nothing deploys/publishes, no secret rotation, no destructive migration without your explicit yes. MCP-driven ≠ ungated.
3. Defer the **full graded auto-loop** until the grader (Phase C) is proven trustworthy on real runs.

## Phase C — P2 build: grader + grade→refine loop (the ready-to-paste work)
This is Prompts 3 & 4 in the packet, plus the model-routing addendum.
1. **New edge function `grade-prompt`** (route to Claude). Input: generated `lovable_prompt`. Output JSON: 6 dimension scores (context_goals, specificity, design_tokens, mobile_first, state_error_handling, avoiding_defaults), `overall`, `anti_patterns_found[]`, `top_fixes[]`. Detect the 5 named anti-patterns.
2. **Inline score badge** above the "YOUR LOVABLE PROMPT" / Copy block in `FinalReport.tsx` — "Prompt strength: X/10" (emerald ≥8 / amber 5–7 / red <5) with failing anti-patterns as one-line fixes. Grades automatically on report render.
3. **"Improve this prompt" loop:** button next to the badge → call existing `refine-prompt` (`generateRefinedPrompt`), feeding the grader's anti-patterns + top_fixes + the user's Vibe Stack highlights into `refinement_context` → auto re-grade → show new score + "What changed". **Version, never overwrite** (`version_label`, prior viewable).
4. **Tighten the generator** in `_shared/agents/simulate.ts`: ensure the final-round `lovable_prompt` schema carries the full structured template + 8 engineering rules; add `app_type` to the brief to drive structure. Optional "split into 3 sequenced prompts" toggle (offer, don't force).
5. **Model routing** in `_shared/model-router.ts`: point `synthesis`, the new `grade-prompt` task type, and `prompt-engineering` (refine) to Claude Sonnet as primary; keep `analysis-initial`/`perspective` on Gemini for cost. Print the resulting map.

## Phase D — Pre-public guardrails + the funnel bridge (highest-leverage)
1. **Daily LLM spend cap** + **anonymous rate-limit** (per session/IP) before the project is public — a runaway loop on Claude is the main new cost risk. Surface 429/402 cleanly in the UI.
2. **Label every ungrounded number "illustrative"** until web-grounding (Phase F) ships.
3. **Funnel bridge:** wire the grader's *weakest dimension* into the discovery-audit CTA ("scored low on operations — that's exactly what we pressure-test") writing to the existing `discovery_leads` table (confirm v1 and v2 share one table — don't fork a third).
4. **Resolve `landing_page_html`:** today it's scaffold-only (column + RPC exist, nothing generates HTML). Either wire a generator or drop the column — don't leave it half-done.

## Phase E — Connectors
1. **For the Lovable agent (build-time):** connectors like Notion/Linear feed *me* context while building — they do not become features end users call. Since you barely use Notion, skip it; the MCP server already covers knowledge. Add a connector only when a specific external source needs to inform builds.
2. **For the app (runtime):** if VibeCo should *call* an external tool at runtime, that's a Supabase edge function (MCP proxy or API), a separate, scoped build — not the same as agent connectors. Flag which you mean before we build either.

## Phase F — Parked (BACKLOG, sequence after P2 + funnel)
- **P4 web-grounding** (competitor/market checks with citations) — the one net-new build; unlocks dropping "illustrative" labels.
- **P3 DB-history priors** ("ideas like yours scored like this") — lowest friction, own DB.
- **P3b corpus mining** — needs embeddings + a privacy filter (exclude financial/health/legal); server-side only.

---

## Pitfalls I'm explicitly calling out
- **Knowledge drift across 65+ projects** is the #1 risk. Mitigate by making per-project Knowledge a *generated pointer*, never a hand-edited copy of the canon.
- **"Connecting" two Lovable projects** has no native mechanism — the MCP `project_registry` + shared org memory is the only real connective tissue. Don't expect the Knowledge fields to sync.
- **MCP-driven loop drift:** additive-only + hard gates + the mandatory return block. Claude proposes; Lovable can push back; you hold the deploy gate.
- **Claude cost:** routing marquee reasoning to Claude without the Phase D spend cap is the fastest way to a surprise bill on a public anon tool. Cap first.
- **Schema bloat on `grade-prompt`:** keep the output schema lean (short keys, no long enums) so it stays robust; Claude tolerates more than Gemini but don't push it.
- **RLS already locked** to `user_id = auth.uid()`; pre-existing anon reports with `user_id IS NULL` are now unreadable — expected, just don't be surprised.

## Suggested order
A (knowledge skeleton) → B (loop hygiene) → C (P2 grader+loop+Claude routing) → D (guardrails + funnel) → E (only if a connector need is real) → F (parked).

## What I can build from inside this project vs. what's outside it
- **Inside (I build):** Phase C, D, the per-project Knowledge pointer template (Phase A.1), and runtime connector edge functions (Phase E.2).
- **Outside this project (you/Claude via the MCP repo):** the canonical docs (Phase A.3), `project_registry` cross-project tagging (Phase A.2), and build-time agent connectors (Phase E.1). I can draft the content/SQL for those, but they land in the MCP server repo, not here.
