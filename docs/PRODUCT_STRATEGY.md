# Courtana Product Strategy — Aces + the VibeCo "on-demand" ecosystem

**Status:** Draft v1 for Bill · **Author:** Claude Code session
**Scope:** the two-pronged plan + the social-listening initiative, and how they connect.

---

## TL;DR

1. **Prong 1 — Ship Aces.** A social golf app built around the **hole-in-one moment** —
   the most viral, least-productized event in golf. Aces owns that moment and uses it as
   the hook for a side-game ledger (skins/Nassau/etc.). White space is real: 18Birdies
   owns *tracking*; the insurance incumbents own *B2B coverage*; **nobody owns the
   consumer ace moment.** → [`ACES_PRD.md`](./ACES_PRD.md) · prototype at
   [`/aces/prototype/aces-prototype.html`](../aces/prototype/aces-prototype.html).

2. **Prong 2 — Bring it home to VibeCo.** Make Aces VibeCo's first *living* portfolio
   product: its users, feedback, and metrics flow **back** into the same agent mesh that
   vetted the idea (change requests → code, feedback → insight, agent-built customer
   profiles, ongoing expand/distill). The backbone — the Courtana MCP server, the agent
   mesh, the `auto-evaluate` flywheel — **already exists in this repo.** Prong 2 is mostly
   new task types + a feedback return-path, not new infrastructure. →
   [`VIBECO_X_ACES_INTEGRATION.md`](./VIBECO_X_ACES_INTEGRATION.md).

3. **Signal Mine — the demand sensor.** Continuously scan Reddit / app-store reviews /
   X for customer pain points and let the agent mesh turn the strongest, most-repeated
   ones into vetted, ranked features. It's the input firehose for Prong 2's feedback loop.
   → [`SOCIAL_LISTENING_PRD.md`](./SOCIAL_LISTENING_PRD.md).

Together these turn "vibe coding on demand" from a tagline into a literal machine:
**market signal → agent vetting → Claude Code ships a PR → live product → signal.**

---

## How the pieces connect

```
  Signal Mine ──pain points──▶ VibeCo agent mesh ──vetted features──▶ Aces (live)
       ▲                            (debate, synthesize,                   │
       │                             expand, distill,                      │
       │                             auto-evaluate)                        │
       └──────────────── users talk about Aces in public ◀────────────────┘
                                                                           │
                         change requests · feedback · metrics ────────────┘
                                        │
                                        ▼
                            Claude Code session ships a PR
                            (rationale written to shared org memory)
```

The same agents that *originate* ideas now *operate and evolve* them. That's the moat:
a compounding portfolio brain, not a one-shot idea generator.

---

## Recommended sequencing

| Phase | Focus | Outcome |
|---|---|---|
| **Now** | Align on this strategy + the Aces interpretation; get me the design file | Shared direction; I re-skin the prototype to match your design. |
| **Sprint A** | **Aces v1 MVP** (Prong 1): Skins + the Ace Moment, on the VibeCo stack | A real, shippable consumer app. The proof-of-portfolio. |
| **Sprint B** | **Prong 2 P2.0–P2.2**: register Aces in the portfolio, feedback inbox, feedback-synthesis | The return path opens. Cheap — infra already exists. |
| **Sprint C** | **Signal Mine v1** (Reddit + reviews → Signal Board) + **Prong 2 P2.3** (change-request loop) | Market signal starts driving the backlog; feedback becomes code with a human gate. |
| **Later** | Real-money (licensed partner), B2B course contest engine, multi-product Signal Mine | Monetization + scale, once the loop is proven on Aces. |

Discipline borrowed from `.lovable/plan.md` (Sprint 9): **remove three things for every
one we add.** Ship the distilled core first; let the agents (and the market) earn every
expansion.

---

## Decisions I need from you

1. **Aces interpretation** — I built the *consumer social ace app*. Is your existing
   Lovable build that, a B2B course-contest tool, or different? (Changes how much is new
   vs. reframe.)
2. **Brand** — **Aces** or **NiceAce**?
3. **Design file** — the shared Claude design link 404s from this cloud environment (it
   needs your authenticated session). Paste the HTML or screenshots and I'll match it exactly.
4. **Repo strategy** — my recommendation: keep everything here on this branch for review
   now, then **spin Aces into its own repo** before it grows a backend (clean compliance +
   release boundary). The MCP server likely graduates to its own repo too, since both
   VibeCo and Aces depend on it. Confirm and I'll execute the split.
5. **Where to point Signal Mine first** — recommend **Aces** (clearer pain space; proves the
   return path). And Twitter API budget: yes, or Reddit + reviews only for v1?

---

## What I've delivered in this pass

- ✅ A **functioning, interactive Aces prototype** (live skins engine + the Ace Moment).
- ✅ **Aces v1 PRD** (Prong 1) — market, wedge, scope, model, compliance, metrics.
- ✅ **Aces × VibeCo integration strategy** (Prong 2) — grounded in the actual MCP/agent
  code already in this repo, with a phased build plan.
- ✅ **Signal Mine PRD** — the social pain-point → feature pipeline.

What I have **not** done: matched a specific design (couldn't access it), written any
production Aces backend code, or touched the existing VibeCo app. All four deliverables
are additive (new `/aces` + `/docs` files) — nothing in the live product changed.
