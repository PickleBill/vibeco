# Contract Coordinator — VibeCo Opportunity Engine

_Single source of truth for who-does-what across surfaces. Upgrades `CONNECTOR_CONTRACT.md`
(which stays the data-shape spec). This file is the **division-of-labor** spec so four agents
stop colliding. Owned by the orchestrator (Claude). Last reset: 2026-06-24._

## Mission (the plot)

> Give me an industry or an idea. Mine what people are actually frustrated about, rank the
> opportunities ruthlessly with proof, and hand me ONE conviction-grade bet I'd build this
> week — then let me riff it sharper.

Two modes, one engine:
- **Founder mode** — "here's my idea, pressure-test it." (v1 riff loop: `/simulate`)
- **Operator mode** (Eric Cole) — "here's an industry/business; rank its inefficiencies and
  customer pain into qualified opportunities, unbiased." Scanner is open-minded by design —
  no hardcoded vertical.

The #1 move: **close the loop.** Signal is fuel; the refined, stress-tested opportunity is the
product. `opportunity_roadmaps` must stop being empty.

## Home base

- **v1 (`b653b128`, this repo)** = engine core + the riff loop. Build & prove the loop here.
- **v2.1 (`8563d10e`, conviction-to-code)** = published showcase + `/briefing` for Eric.
- Shared Supabase (`ulgoah…`) + the courtana MCP = the bus. Merge direction is the council's
  call; the contract makes it cheap either way.

## Per-agent contracts

| Agent | Owns | Reads | Produces | Must NOT touch |
|---|---|---|---|---|
| **Claude (Cowork)** | strategy, orchestration, grading, prompts | everything | briefs, decisions (`org_decisions`), this file | direct code commits |
| **Claude Code** | backend, DB, edge fns, adapters, the loop | `signal_raw`, candidates | `opportunity_roadmaps`, `cluster_id`/member links, scanner adapters | frontend copy/layout |
| **Lovable (build surface)** | frontend, routes, components, the riff edge fns, deploy | DB schema, roadmap shape | UI rendering real rows, `close-loop` edge fn | DB schema ownership, backend business logic |
| **Codex** | bounded copy, labels, tooltips | the live page | plain-English strings | data, layout, logic |

## Rules of the road

1. **No agent invents a number.** Every count/metric binds to a DB row (`signal_raw`,
   `feature_candidates`, Semrush volumes). Anything illustrative is labeled "illustrative".
2. **State is the handoff, not the thread.** Decisions are logged to `org_decisions` with a
   date; the MCP reads them. Don't rely on chat memory across surfaces.
3. **Additive migrations only.** Version, never overwrite. Nullable columns.
4. **Ship gate.** Nothing published/sent/charged without an explicit human "yes."
5. **Build-vs-wire test before any new piece:** connector already does it? → wire it. Reusable
   protocol between two systems? → thin doc. Repeated judgment? → skill. None? → don't build.

## Connector posture (Lovable side)

Tier 1 (link now): **Perplexity** (signal/opportunity research — already in workspace),
**Fireflies** (Eric's discovery-call transcripts → first-party operator signal),
**Inngest** (durable overnight scans + morning cue). Keep **Firecrawl** (linked).
Tier 2 (soon): **Semrush** (real demand sizing), **Slack/Telegram** (run notifications),
**Google Drive/Docs** (PRD artifacts).
Keyless in-code (not connectors): **HN Algolia**, **Reddit public `.json`** (custom UA).
Reddit API self-serve closed Nov 2025 — do not fight it.

## Model routing

`gemini-3-flash-preview` for cheap fan-out breadth · `gemini-2.5-pro` / Claude for synthesis +
skeptic passes · `gemini-3.1-pro-preview` for the targeted cross-agent master run. Premium
per-run toggle stays admin/premium-gated.

See `OVERNIGHT_RUN_SPEC.md` for the phase sequence and `CONNECTOR_CONTRACT.md` for table shapes.
