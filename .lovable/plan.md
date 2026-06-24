# Wire it all together — unblock AI, fix security, finish the MCP plumbing

## First, the "explain like I'm five" you asked for

You have three different things doing three different jobs. They are not redundant:

- **MCP server = the live pipe.** It's how Claude *reads and writes the shared brain in real time* — query the project registry, save/search org decisions, invoke VibeCo agents. It moves data. It's already built (`courtana-mcp-server`) and now points at real tables (we created `org_decisions` etc. last round).
- **Skills = Claude's playbooks.** Reusable instructions telling Claude *how to do a task well* (e.g. "grade a Lovable prompt"). They don't move data; they shape behavior. A skill is worth building only when Claude repeats a non-obvious procedure.
- **Handshake = the contract.** A short doc both sides agree on (table shapes + rules) so nobody guesses. Mostly already covered by your `CLAUDE.md` project-knowledge.

**The honest take:** for "make the systems talk to each other," the **MCP pipe + one contract doc is enough**. You do *not* need custom skills or a separate handshake-agreement build for this — Claude already has `learn`/`go`/`skill-creator` and the Lovable connector. So per your instruction, this plan **does not build new skills or a handshake**. It hardens the pipe and writes one contract.

```text
        ┌─────────── shared Supabase (ulgoah...) ───────────┐
        │  org_decisions   connector_registry   sync_events  │
        └───────▲───────────────▲───────────────▲───────────┘
                │ MCP pipe       │ contract       │ contract
        Claude / v2.1 ───────────┘                │
        VibeCo v1 (this app) ─────────────────────┘
```

---

## Phase 0 — Unblock AI (the urgent one). -> fantastic, my responses are below, so I'm going to respond to Claude code and say that this is getting changed as we speak 

Root cause confirmed: a **workspace AI-gateway spend limit of $5.00/month with "block usage" on**, currently at **$5.53**. This blocks every AI edge function here (the preview 500) *and* Claude/v2's board fill (the 403 you screenshotted). It is **not** caused by GPT-5.5 specifically.

- Raise (or remove the block on) that monthly AI cap so AI calls flow again. This is a spend decision, so I'll confirm the number with you before changing it (see Decisions below).
- No code change. Once raised, the v1 preview and v2's fill both unblock — same cap.

## Phase 1 — Fix the security findings precisely (one migration)

- `connector_registry`: drop the "authenticated can read" policy; restrict SELECT to **admins** (`has_role(auth.uid(),'admin')`) + keep service_role. (This is the Critical finding — `config`/`auth_kind` shouldn't be world-readable.)
- `connector_sync_events`: same — SELECT restricted to **admins** + service_role.
- `signal_raw`: change SELECT from `public` to **authenticated** (raw scraped text/URLs shouldn't be anonymous-readable).
- **Hub impact:** the Connectors tab currently reads these as any authenticated user. After locking down, gate that tab to admins (via the existing `useUserRole` hook) so it doesn't silently break for non-admins. Projects + Decisions tabs stay as-is.
- Leave the two benign lints (SECURITY DEFINER `has_role`, `user_roles` anonymous-access) as accepted — they're correct by design. I'll mark them ignored with a reason so they stop nagging.

## Phase 2 — Finish the MCP plumbing so it actually "talks"

- **Missing table:** `get_mcp_insights` / `analyze_mcp_usage` query `mcp_improvement_log`, which doesn't exist — those tools fail silently today. Add it (additive, admin/service_role only) so the self-improvement loop works.
- **Semantic search key:** `.mcp.json` has a placeholder `OPENAI_API_KEY`. `search_decisions` (semantic) needs a real key to embed. I'll flag this — it's a key you paste locally into your Claude MCP config, not something stored in the app.
- **Smoke-test the pipe:** after Phase 0, verify `save_decision` → `get_decisions` → `search_decisions` round-trip against the real `org_decisions` table.

## Phase 3 — Lock the v1 ↔ v2.1 contract (the "sync")

- Write one **connector contract doc** (root markdown, so it's in Claude's context): the exact shapes of `connector_registry` + `connector_sync_events`, and the rule "every app logs a sync event after each run (service role)." v1's `signal-collect` already does this; v2.1 follows the same shape.
- This is the single source of truth both sides read — no copy-paste, no drift. This *replaces* the need for a bespoke handshake skill.

---

## Decisions I need from you

1. **AI cap (Phase 0):** raise the monthly AI-gateway limit to what — e.g. $25, $50, or remove the hard block and keep notify-only? (Affects this app *and* v2.). **YESSS**  please do this first because I was trying to read the documentation and I keep seeing this notification, but I don't know how to change it. Raise it to $25 for now, and then, if we hit that, then fine, we can come back to it. This is most important because I need to remove it, the blocker, ASAP 
2. **GPT-5.5 premium:** keep it admin/premium-gated as-is (recommended), or also add a small per-day premium spend ceiling so it can't surprise you?   sure. I don't even know how to check if GPT-5.5 premium is being paid for. Is that through lovable? If it's not a blocker, then I'll go with your recommended plan. What's a small per day? I'll go with your recommendation on this, but I think one seems much more important 

## Technical notes / files touched

- Phase 0: workspace credit limit update (no repo change).
- Phase 1: one additive RLS migration (`connector_registry`, `connector_sync_events`, `signal_raw`); `src/components/hub/ConnectorsTab.tsx` + `src/pages/Hub.tsx` admin gate; ignore 2 benign findings with security-memory note.
- Phase 2: additive migration for `mcp_improvement_log`; `.mcp.json` note (local key, not app secret).
- Phase 3: new root `CONNECTOR_CONTRACT.md`.
- No deploy/publish, no destructive migrations, no secret exposure.