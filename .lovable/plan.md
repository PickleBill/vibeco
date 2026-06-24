# VibeCo Engine Reset — v2 (the Lovable side, wired into the council)

## Confirming I get it

The plot, restated the way your own briefs land it:

> **"Give me an industry or an idea. Mine what people are actually frustrated about, rank the opportunities ruthlessly with proof, and hand me back ONE conviction-grade bet I'd build this week — then let me riff it sharper."**

Two laddered modes, one engine:
- **Founder mode** — "here's my idea, pressure-test it" (v1's riff magic).
- **Operator mode** (Eric Cole) — "here's an industry / a business; objectively rank its inefficiencies + customer pain into qualified opportunities." The scanner is *open-minded by design* — no hardcoded golf, no single vertical.

Every uploaded agent (ChatGPT, Codex-warm brief, the council) converges on the same #1 move: **the engine collects signal but never closes the loop.** `opportunity_roadmaps` is empty. It shows clusters, not convictions. **Closing that loop is the work. Everything else is decoration.**

## The one strategic call (my recommendation, your override)

I will not pretend to settle "one codebase or two" — that's the council you're running, and it's genuinely your call. But the Lovable-executable answer is clean:

**Build + prove the engine loop HERE in v1, because v1 owns the riff core (`simulate-idea` → `persona-perspective` → `synthesize`) that closing the loop literally depends on — and it's where I have full build access.** v2.1 stays the published showcase/front door for Eric. The shared Supabase + MCP contract makes the eventual merge one-directional and cheap *whichever* way the council lands. So: **no fresh repo, no rewrite — redirect v1 into the unified engine (call it v1.1), port to/from v2.1 over the contract.**

```text
  v1 (THIS repo)            shared Supabase (ulgoah…)         v2.1 (conviction-to-code)
  engine core + riff   ───►  org_decisions / candidates  ◄───  published showcase + /briefing
  close-the-loop here        opportunity_roadmaps              renders the same rows for Eric
                         ▲ MCP pipe (courtana-mcp-server) ▲
                              Claude orchestrates both
```

---

# PART 1 — The Lovable ecosystem (what I build & wire here)

**Phase A — Kill the identity collision + reframe (fast, unblocks publish).**
- Homepage de-collision: one job — "what should I build next, and why." Remove agency/"discovery audit" framing; primary CTA **"Run an opportunity scan"**, secondary **"See this week's opportunity →"** deep-linking the top real candidate.
- Replace invented stats (`StatsBar` 16+/48hrs/etc.) with live counts from `signal_raw`/`feature_candidates`, or cut them. **No agent invents a number** becomes a hard rule.
- Nav: add **Signal** and **Sketchpad (/simulate)** as real, clearly-named doors.

**Phase B — Close the loop (THE move).**
- New edge function `close-loop` (lives here because the riff agents do): for each `feature_candidate`, run candidate → `simulate-idea` → 3–4 `persona-perspective` → `synthesize` → write an **`opportunity_roadmap`** row: one-paragraph idea, who it's for, strongest objection + rebuttal, riskiest assumption, and a Build / Pre-sell / Partner call with a plain-English reason grounded in real signal counts. Idempotent + re-runnable.
- Frontend: `/signal` and the homepage render the **finished opportunity** (the hero), not just clusters.

**Phase C — The Opportunity Qualifier (Eric Cole's ruthless rank).**
- A scored rubric every opportunity passes through: pain intensity · frequency/recurrence · willingness-to-pay · build feasibility · wedge/moat · operator-or-founder fit. Surfaced as the ranking + a one-line "why this is #1." This is what makes it a *qualifier*, not a dashboard.

**Phase D — Breadth (the proof).**
- Make scan topic-driven: an idea/industry input expands (via gateway) into pain-oriented queries — golf defaults deleted.
- Add two **keyless, in-code** adapters to `signal-collect`: **HN Algolia** (no auth) and **Reddit public `.json`** (custom User-Agent). Scan 3–4 unexpected verticals so it surprises you.

**Phase E — Polish behind a full plate (fast-follows, not blockers).**
- Evidence drawer (real source links), plain-English motion labels + tooltips, live (real) scan stepper, sample/empty states that explain themselves.

### Connectors — my prioritized take (grounded in your actual workspace)
**Link now (Tier 1):**
- **Perplexity** — *you already have it connected in the workspace, just not to this project.* Instant signal breadth + opportunity research, zero new signup. Highest ROI, no friction.
- **Fireflies** — Eric Cole's discovery-call transcripts become **first-party operator signal**. This is the killer input for operator mode (real businesses' real pain, not just public forums).
- **Inngest** — durable background jobs = the **overnight multi-vertical scan + morning "one move" cue**. This is the cleanest in-stack infra for your overnight run.
- Keep **Firecrawl** (already linked); broaden beyond Reddit.

**Link soon (Tier 2):** **Semrush** (real search-demand to size opportunities — kills invented numbers), **Slack or Telegram** (overnight-run + cue notifications), **Google Drive/Docs** (write PRD/handoff artifacts where Cowork reads them).

**Defer (Tier 3):** TikTok (social signal later), Sentry (post-publish), Databricks/Snowflake/BigQuery (overkill now), Linear/Notion (workflow weight), n8n/Zapier (Inngest covers durable workflows in-stack — only add if you want no-code external automations).

**Stop fighting Reddit:** the API self-serve door closed (Nov 2025 Responsible Builder Policy) — it's not you. Public `.json` + HN Algolia give breadth this week with zero credentials. No Reddit connector needed.

### Skills to author (only repeated judgment, per your build-vs-wire law)
- **opportunity-qualifier** — the ruthless ranking rubric (reusable v1 ↔ v2.1).
- **signal-to-opportunity** — the close-the-loop dogfood sequence.
- **council** — fan-out → synthesis (formalize once run 3+; you've already sketched it).

### Models / premium
- Dual-speed stays: **gemini-3-flash-preview** for cheap fan-out breadth; **claude / gemini-2.5-pro** for synthesis + skeptic passes. For the targeted cross-agent master run, step up to **gemini-3.1-pro-preview** where judgment matters. Per-run premium toggle stays admin/premium-gated.

---

# PART 2 — How Lovable plugs into the rest of the ecosystem

Your `ARCHITECTURE.md` already names the model: **one orchestrator (Claude), many surfaces.** Lovable is the *build surface*, not a competing brain. I'll wire Lovable to fit that — not reinvent it.

### The handoff substrate (so the overnight run actually talks)
1. **`CONTRACT_COORDINATOR.md`** (upgrades the existing `CONNECTOR_CONTRACT.md`) — one source of truth with a **per-agent contract** (owns / reads / produces / must-not-touch), so agents stop colliding:

| Agent | Owns | Produces | Must NOT touch |
|---|---|---|---|
| **Claude (Cowork)** | strategy, orchestration, grading | briefs, decisions | direct commits |
| **Claude Code** | backend, DB, adapters, the loop | roadmaps, `cluster_id`/member links, scanner | frontend copy/layout |
| **Lovable (me)** | frontend, routes, the riff edge fns, deploy | UI that renders real rows, `close-loop` | DB schema ownership, backend logic |
| **Codex** | bounded copy/labels | plain-English strings | data, layout, logic |

2. **`OVERNIGHT_RUN_SPEC.md`** — the machine-readable run plan aligned to Claude's P0–P4 phase sequence, with Lovable's lanes explicit:

| Phase | Owner | Lovable's part |
|---|---|---|
| P0 Kickoff | Claude | — (decision logged to `org_decisions`) |
| P1 Data-contract audit | Claude Code | confirm/align schema; additive migration for `member_signal_ids` if missing |
| P2 Keystone loop | Claude Code + **Lovable** | I ship `close-loop` edge fn (riff agents live here); Claude Code invokes it |
| P3 Source breadth | Claude Code | I mirror HN + Reddit `.json` adapters in `signal-collect` |
| P4 Render | **Lovable** | opportunity cards, homepage de-collision, nav |

3. **Announce the redirect over the pipe:** write one `org_decisions` row ("VibeCo redirected to Signal→Opportunity→Sketch; v1 = engine home") so Claude's MCP picks it up automatically — this is me "communicating my side" through the shared substrate.

### Pickle DaaS + future tenants
The contract is org-generic on purpose — Pickle DaaS (and any tenant) reads/writes the same three shared tables. Once the qualifier + close-loop exist, pointing the engine at a new tenant is a config row, not a rebuild.

### The "no number is invented" ledger
All counts/metrics bind to DB rows (`signal_raw`, candidates, Semrush volumes). Anything illustrative is labeled. This is the single rule that keeps four agents honest.

---

## Decisions (defaults chosen — override any)
1. **Identity:** VibeCo = the founder/operator **opportunity engine** (default). If it's actually the AI-ops agency, the whole sequence flips — say so.
2. **Home base:** build/prove the loop in **v1 (this repo)**, v2.1 stays showcase, merge later via contract (default). Or tell me to target v2.1 as home.
3. **Connectors to link this pass:** Perplexity + Fireflies + Inngest (default Tier 1). Add Semrush now or defer?

## What I'll execute on approval (in order)
Phase A (de-collision + kill invented stats + nav) → write `CONTRACT_COORDINATOR.md` + `OVERNIGHT_RUN_SPEC.md` + `org_decisions` announce → link Tier-1 connectors → Phase D breadth adapters + topic-driven scan → Phase B `close-loop` + opportunity render → Phase C qualifier → author the 3 skills → Phase E polish. I'll show diffs and publish nothing without your explicit yes.