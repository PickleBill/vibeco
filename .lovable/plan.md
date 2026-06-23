# Org System Setup — premium reasoning, knowledge hub, connector substrate

Three outcomes, sequenced by leverage: (1) GPT-5.5 as a per-run *premium* option, gated to admin/premium roles and verified server-side; (2) the shared org-memory + connector tables the MCP server already expects but that don't exist yet; (3) a subtle in-app Org Knowledge Hub showing project pointers, org decisions, and connector sync status — the shared surface v2/VibeCo/other apps publish into.

## Coordination with VibeCo v2
v2 (separate Lovable project) is wiring *live* workspace connectors (Firecrawl/Perplexity/Anthropic web search) into its own Signal Mine. This plan deliberately does **not** duplicate that. Instead it builds the **shared substrate both sides write to**: `connector_registry` + `connector_sync_events` + `org_decisions`, all in the shared Supabase project (`ulgoahsxkrkzoquvntei`) the MCP server already points at. v2's adapters log their syncs here; this hub displays them. No new live adapters are wired in v1.

---

## Phase 1 — Premium reasoning toggle (per-run, role-gated)
Goal: default marquee reasoning to cheap Gemini; let admins/premium users flip a single run to GPT-5.5.

1. **Roles:** add `premium` to the `app_role` enum (keep `admin`, etc.). `has_role()` already exists.
2. **Model router:** add a `premium?: boolean` option to `selectModel()`. For `grade-prompt`, `prompt-engineering`, and `synthesis`, the default candidate becomes `google/gemini-2.5-pro` (cost); when `premium` is true, it returns `openai/gpt-5.5` first. (Today GPT-5.5 is hardcoded as default — this inverts it so premium is opt-in.)
3. **Server-side gate (critical):** `grade-prompt`, `refine-prompt`, and `synthesize` edge functions read the caller's JWT, look up `user_roles`, and only honor `premium: true` if the user has `admin` or `premium`. A spoofed flag from a non-privileged client is ignored and silently falls back to Gemini.
4. **UI:** a small "Premium reasoning (GPT-5.5)" switch on the report/prompt surface in `FinalReport.tsx`, rendered only when the signed-in user has the role (via a `useUserRole` hook). Passes `premium` into the grade/refine calls. Non-privileged users never see it.

## Phase 2 — Org-memory + connector substrate (DB, additive)
The MCP server's `save_decision`/`get_decisions`/`search_decisions` already target `org_decisions` + a `match_decisions` RPC that **do not exist**. Create them so both MCP and the UI work. Built generically (org-scoped, project-tagged) for reuse across all Courtana projects.

New tables (additive, with GRANTs + RLS):
- `org_decisions` — `session_id`, `project`, `category`, `title`, `content`, `embedding vector(1536)`, timestamps. RPC `match_decisions(query_embedding, match_count, filter_project, filter_category)` mirroring the existing `match_signal_raw` pattern.
- `connector_registry` — `key` (e.g. `firecrawl`, `perplexity_sonar`, `anthropic_web_search`, `reddit`, `hackernews`), `display_name`, `project`, `status` (`active`/`dormant`/`error`), `auth_kind` (`workspace`/`secret`/`keyless`), `config` jsonb, timestamps. This is the canonical "what connectors exist + their state" list both v1 and v2 read.
- `connector_sync_events` — `connector_key`, `project`, `status`, `items_collected`, `message`, `created_at`. The append-only sync log the dashboard renders.

RLS: authenticated users can read all three (org-internal); writes to `org_decisions` require auth; `connector_registry`/`connector_sync_events` writes are `service_role` only (edge functions/MCP). `anon` gets no access. Seed `connector_registry` with the known connectors and their current state.

## Phase 3 — Org Knowledge Hub UI (subtle, in-app)
A new route `/hub` (subtle nav entry, not in the portfolio area), viewable by authenticated users.
- **Projects tab:** reads `project_registry`, renders each project as a *pointer card* (name, brand/family tag, status, canonical-doc pointer, link) — explicitly not a duplicated copy of project content. Reinforces "one source of truth, pointers everywhere."
- **Decisions tab:** lists recent `org_decisions` (filter by project/category), with a "Record decision" form that writes a new decision. Shows whether it was embedded.
- Empty/skeleton/error states throughout; house style (dark + emerald, one violet accent, Inter/Source Code Pro, `rounded-sm` mono buttons).

## Phase 4 — Connector registry + sync-status dashboard
A **Connectors tab** in `/hub`:
- Reads `connector_registry` → status chips (active=emerald, dormant=muted, error=red), auth kind, owning project.
- Reads `connector_sync_events` → recent sync timeline per connector (last run, items collected, message).
- Lightweight "onboarding" affordance: a guided card per dormant connector explaining what's needed to activate it (auth source, where the key lives, link). Since real key/connector setup is a Lovable workspace-platform action, this surface *documents + tracks* rather than stores keys.
- Wire v1's existing `signal-collect` to append a `connector_sync_events` row (service role) after each run, so the dashboard shows real data immediately and proves the contract v2 will follow.

## Phase 5 — MCP server + canonical docs alignment (mostly outside this repo)
- Confirm the MCP server's memory tools work against the now-real `org_decisions` (no code change needed; tables now exist). Optionally add `mcp_improvement_log` if we want `get_mcp_insights`/`analyze_mcp_usage` live (deferred unless wanted).
- Draft the canonical "connector contract" doc (table shapes + how any app logs a sync) so v2 and future apps publish consistently. Lands in the MCP/AI-Opportunity-Engine repo, not here — I'll provide the content/SQL.

---

## Technical notes / pitfalls
- **Embeddings:** `org_decisions.embedding` is `vector(1536)` to match the MCP server's `text-embedding-3-small`. The in-app "Record decision" path can save without an embedding (filter-only) since the frontend won't call OpenAI; semantic search stays an MCP/edge concern. Note the dimension mismatch risk if anyone later swaps embedding models.
- **Premium spoofing:** the per-run toggle MUST be enforced server-side via JWT→`user_roles`, never trusted from the client. This is the main security gate.
- **Cost:** premium is opt-in per run, so no runaway default spend; a daily cap can be added later if usage grows (deferred per "gate behind a paywall later").
- **Shared DB blast radius:** these tables live in the shared project; keep them additive and org-generic so v2 reuses them verbatim. No destructive changes.
- **No deploy/publish/secret changes** without explicit approval; all migrations additive.

## Files touched (this project)
- DB migration: `org_decisions` (+`match_decisions`), `connector_registry`, `connector_sync_events`, `app_role` enum add, seeds.
- `supabase/functions/_shared/model-router.ts` — premium-aware selection.
- `supabase/functions/grade-prompt`, `refine-prompt`, `synthesize` — JWT role check + premium gate.
- `supabase/functions/signal-collect/index.ts` — append sync event.
- `src/hooks/useUserRole.ts` (new), `src/components/simulator/FinalReport.tsx` — premium toggle.
- `src/pages/Hub.tsx` (new) + `components/hub/*` (ProjectsTab, DecisionsTab, ConnectorsTab), `src/App.tsx` route, subtle nav link.
