# Overnight Run Spec — VibeCo Opportunity Engine

_Machine-readable plan for an unattended, multi-agent run driven by Claude Code / Cowork.
Aligned to the orchestrator's P0–P4 sequence. Human-gated phases are isolated so the rest can
run safely overnight. Last reset: 2026-06-24._

## Goal of a run

Take an industry or idea → scan real pain across multiple verticals → cluster → rank with the
Opportunity Qualifier → close the loop into ≥1 conviction-grade `opportunity_roadmap` per
vertical → surface the single best one. Success = a founder/operator reads one roadmap and
says "I'd consider building this."

## Phase sequence

| Phase | Owner | Unattended? | Input | Output |
|---|---|---|---|---|
| **P0 Kickoff** | Claude | no (human) | this spec | decision row in `org_decisions`, run scoped |
| **P1 Data-contract audit** | Claude Code | yes | shared schema | confirm `cluster_id` + member linkage exist; additive migration for `member_signal_ids` if missing |
| **P2 Keystone loop** | Claude Code + Lovable | yes | `feature_candidates` | `opportunity_roadmaps` via `close-loop` (riff: simulate → persona → synthesize) |
| **P3 Source breadth** | Claude Code | yes | vertical list | HN Algolia + Reddit `.json` adapters scan 3–4 verticals into `signal_raw` |
| **P4 Render** | Lovable | partial (deploy gate) | roadmap shape | opportunity cards on `/signal` + homepage hero + nav; de-collision |

## Lovable's lanes (what this repo ships)

- **P2:** `close-loop` edge fn lives here (the riff agents `simulate-idea` /
  `persona-perspective` / `synthesize` are here). Claude Code invokes it per candidate; it
  writes `opportunity_roadmaps`. Idempotent + re-runnable.
- **P3:** mirror the keyless adapters in `signal-collect` (HN Algolia done; Reddit `.json`
  next) and make scan topic-driven (done — `topic` param expands to pain phrases).
- **P4:** render the finished opportunity as the hero; `/signal` shows qualified, proof-backed
  cards; Signal in nav; kill invented stats.

## The Opportunity Qualifier (ranking rubric)

Every opportunity is scored 0–100 on six axes, then ranked. Surface the score + one-line
"why this is #1." No invented numbers — anchor to real signal counts.

1. **Pain intensity** — how acute is the complaint
2. **Frequency / recurrence** — how often it shows up across sources
3. **Willingness to pay** — evidence of spend or active workarounds
4. **Build feasibility** — can a small team ship a wedge fast
5. **Wedge / moat** — is there a defensible entry
6. **Operator-or-founder fit** — does it match who's running it

## Run safety

- Unattended phases (P1–P3) never publish, never charge, never touch frontend copy.
- P4 deploy and any publish are **human-gated**.
- All adapters: cap request rate, custom User-Agent on Reddit, backoff + dedupe on `source_url`.
- Every run logs to `connector_sync_events` (already wired) so progress is real, not animated.

## Kickoff checklist (P0, human)

- [ ] Pick the verticals to scan (default: 3–4 unexpected ones beyond the seed).
- [ ] Confirm premium model budget for the run.
- [ ] Log the decision to `org_decisions` (category `run-kickoff`).
- [ ] Hand P1–P3 to Claude Code; P4 returns to Lovable for the deploy gate.
