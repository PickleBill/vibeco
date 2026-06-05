# Aces

**The social home for golf side games and hole-in-one moments.**

Aces turns the bets you already make on the course — skins, Nassau, nearest-the-pin,
and the hole-in-one pool — into a tracked, celebrated, shareable experience. The
wedge is the **Ace Moment**: the hole-in-one is golf's most viral event and today it
happens with no system of record, no payout rails, and no shareable artifact. Aces
owns that moment and uses it as the hook for the broader side-game ledger.

> Part of the **Courtana** ecosystem. Aces is the first consumer vertical we're
> spinning out of the VibeCo "vibe-coding-on-demand" engine — see
> [`/docs/VIBECO_X_ACES_INTEGRATION.md`](../docs/VIBECO_X_ACES_INTEGRATION.md).

---

## Run the prototype

It's a single self-contained file — **no build step**.

```sh
open aces/prototype/aces-prototype.html        # macOS
# or just drag the file into any browser
```

It loads React + Tailwind from CDNs, so the first paint needs network access. State is
seeded with a live 9-hole round so you land mid-game.

### What works in the prototype
- **Today** — live round hero, ace-pool card, recent moments.
- **Round** — tap your score hole-by-hole; the group is simulated so **skins standings
  recompute live** (lowest unique score wins; ties carry over). Tap **`1`** on any hole
  to fire the **Ace Moment** (confetti, overlay, pool payout, feed post, Ace Wall card).
- **Feed** — aces / birdies / stolen skins as a social timeline.
- **Wallet** — net settlement per player + ace-pool resolution.
- **You** — profile, career aces, the **Ace Wall** of shareable hole-in-one cards.

### What's mocked
- No backend, auth, or payments — all state is local and resets on refresh.
- The group's scores are simulated when you log a hole, so standings move on their own.
- Tokens are **social credits**, not real money. Real-money wagering is a
  jurisdiction-gated, licensed-partner decision — see the PRD's Compliance section.

---

## ⚠️ Design fidelity note

This prototype was built **without access to the source design file**
(`prototype/Aces - Prototype.html` in the shared Claude design package). That link
(`api.anthropic.com/v1/design/...`) requires an authenticated browser session and
404s from the cloud build environment.

So the visual language here is an **interpretation** built to be easily re-skinned:
it follows VibeCo's cinematic-dark aesthetic (matte charcoal `#0B0D0C`, electric-lime
"ace" accent `#C6FF3A`, Sora/Albert Sans) from `.impeccable.md`. The information
architecture and interaction loops are the substance; colors and type are one config
block (`tailwind.config` at the top of the HTML).

**To align with your design:** paste the design's HTML or a few screenshots into the
session and I'll match the layout, palette, and components exactly.

---

## Docs

| Doc | What it covers |
|---|---|
| [`/docs/PRODUCT_STRATEGY.md`](../docs/PRODUCT_STRATEGY.md) | Executive overview — the two-pronged plan, sequencing, and how the three docs fit together. |
| [`/docs/ACES_PRD.md`](../docs/ACES_PRD.md) | **Prong 1** — Aces v1 PRD: market, wedge, scope, model, compliance, metrics. |
| [`/docs/VIBECO_X_ACES_INTEGRATION.md`](../docs/VIBECO_X_ACES_INTEGRATION.md) | **Prong 2** — wiring Aces back into the VibeCo agent/MCP ecosystem (change requests, feedback, customer profiles, expand/distill, perspective agents). |
| [`/docs/SOCIAL_LISTENING_PRD.md`](../docs/SOCIAL_LISTENING_PRD.md) | PRD for the Twitter/Reddit → pain-point → product-feature pipeline. |
