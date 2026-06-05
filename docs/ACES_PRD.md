# PRD — Aces v1 ("Aces Only")

**Owner:** Bill / Courtana · **Status:** Draft v1 · **Prong:** 1 of 2 (ship Aces)
**Prototype:** [`/aces/prototype/aces-prototype.html`](../aces/prototype/aces-prototype.html)

---

## 1. One-liner

**Aces is the social home for the bets golfers already make — built around the
hole-in-one moment.** Track skins, Nassau, and nearest-the-pin live; settle up in one
tap; and turn every ace into a celebrated, shareable, payout-backed event.

## 2. Why now / why this wedge

The golf-tech market has a clear shape, and a clear gap:

| Layer | Who owns it | Gap |
|---|---|---|
| Side-game **tracking** (skins, Nassau, Vegas, Wolf) | **18Birdies, Golf Gamebook** — mature, feature-complete | Commoditized. Not a wedge on its own. |
| Hole-in-one **prize coverage** | **US Hole In One, American Hole 'n One, GolfStatus** | 100% **B2B tournament insurance**. Zero consumer/social product. |
| The hole-in-one **moment itself** | **Nobody** | No system of record, no payout rails, no shareable artifact, no social graph. |

**The insight:** the hole-in-one is the most viral, most-bragged-about, most
emotionally charged event in amateur golf — and it is completely un-productized for the
everyday golfer. Aces owns *that moment* and uses it as the acquisition hook for the
(otherwise commoditized) side-game ledger underneath.

- **Hook:** "I aced a hole and Aces paid out the pool + made me a card I posted." → viral loop.
- **Habit:** the side-game ledger is the every-round utility that keeps the group in the app between aces.
- **Moat over time:** the social graph of golf groups + the ledger of who-owes-who + the verified ace history. None of the incumbents have all three.

## 3. Target users

- **Primary — "The Group Organizer."** Plays a weekly money game with the same 4–8 guys.
  Currently runs skins on a napkin or a clunky tracker, Venmos it out after. Wants less
  math, no disputes, and bragging rights that stick.
- **Secondary — "The Ace Chaser."** Casual/social golfer who lives for the highlight.
  Comes for the ace celebration and pool, stays for the group.
- **Tertiary (later, B2B) — Courses & leagues.** Par-3 courses, sims, and leagues that
  want a branded hole-in-one promotion / contest engine (this is where the
  insurance-incumbent revenue actually lives — we get there via consumer pull).

## 4. The core loops (what the prototype demonstrates)

1. **Round loop (utility / retention):** Create or join a round → pick format(s) and
   stakes → score hole-by-hole → standings recompute live → settle up. *In the
   prototype: the Round tab, with a working skins engine and live Wallet.*
2. **Ace loop (virality / acquisition):** Someone logs a `1` → celebration overlay →
   hole-in-one pool pays out → a shareable Ace Card is minted → posts to the Feed and
   the player's Ace Wall. *In the prototype: tap `1` on any hole.*

These two loops reinforce: the round loop produces the moments that fuel the ace loop;
the ace loop pulls new groups in, who then need the round loop.

## 5. Scope

### v1 — MVP (the distilled core)
> *One feature, one customer, one moment.* Run a single side-game (Skins) for one group,
> with the Ace Moment fully realized.

- Create round: course (free-text or simple search), players (invite by link/SMS),
  one format = **Skins** with a per-hole stake + a **hole-in-one pool** entry.
- Live hole-by-hole scoring (the person scoring enters the group, or each player self-enters).
- Live skins computation + carryover; live net standings.
- **Ace Moment:** capture, witness confirmation (tap-to-confirm by ≥1 playing partner),
  celebration, pool payout, shareable Ace Card, Ace Wall.
- Settle-up screen with net positions; **social tokens only** in v1 (no real money).
- The Feed (group-scoped) + push notifications for aces and stolen skins.

### v1.1 — fast follows
- More formats: **Nassau, Nearest-the-Pin, Wolf, Vegas** (the proven 18Birdies set).
- GHIN/handicap import for net games.
- Group/season standings ("the league table").
- Real-money settlement via licensed partner where legal (see Compliance).

### Explicitly NOT in v1 (parking lot)
- Full GPS rangefinder / shot tracking (don't fight 18Birdies on their turf yet).
- Public/global leaderboards & strangers (start with closed groups).
- B2B course contest engine (Prong-1.5 once consumer pull is proven).
- Marketplace / merch for Ace Cards.

## 6. Differentiation vs. incumbents

- **vs. 18Birdies / Golf Gamebook:** they're a *tracker*; we're a *social + money + moment*
  product. We lead with the ace, not the scorecard. Our settle-up + verified-ace history
  + group social graph is the part they under-invest in.
- **vs. hole-in-one insurance co's:** they're B2B event coverage; we're a consumer
  network. Long-term we can *route* large consumer pools to their underwriting — partner,
  not compete.

## 7. Business model (directional)

1. **Freemium group features** — free to track; paid tiers for season standings, advanced
   formats, deeper history, custom Ace Cards.
2. **Pool rake / processing** — small take on real-money pools *where legal*, via partner.
3. **B2B contest engine** (later) — courses/leagues pay for branded hole-in-one promotions;
   reinsured by the existing insurance incumbents.
4. **Sponsorship of the Ace Moment** — the celebration/card is premium ad inventory
   (golf brands love being attached to a hole-in-one). Highest-margin, brand-safe.

## 8. Compliance & trust (must-design-for, not an afterthought)

Real-money side bets are **regulated and jurisdiction-specific** (skill-game vs. gambling
distinctions vary by US state and country). Design principles:

- **v1 ships on social tokens / IOU ledger only** — Aces is a *record-keeper and
  celebration layer*, not a bookmaker. Settlement happens off-platform (cash/Venmo) and we
  just track it. This is the same posture as 18Birdies' game tracking — low regulatory surface.
- **Real-money is opt-in, gated, and partner-operated.** When we add it, money custody/payout
  goes through a licensed payments/contest partner with geofencing + KYC. Aces never holds
  stakes directly in v1/v1.1.
- **Ace verification** = witness confirmation + (later) optional video/photo, to prevent
  fraud on payout-bearing aces.
- Clear age-gating (18+/21+ as required) on any money feature.

## 9. Success metrics

- **Activation:** % of created rounds that reach hole 9 with ≥3 players scored.
- **The ace funnel:** aces logged → witness-confirmed → shared externally. (Share rate is
  the viral coefficient input.)
- **Retention:** weekly active *groups* (not just users) — the group is the real unit.
- **K-factor:** new groups created per shared Ace Card.
- **Settle-up completion:** % of rounds marked settled (trust signal).

## 10. Tech approach

- **Frontend:** React + TS + Tailwind + shadcn — *the exact VibeCo stack*, so we reuse the
  design system and component library and can move the prototype to production fast.
- **Backend:** Supabase (Postgres + Edge Functions + Realtime + Auth) — same as VibeCo.
  Realtime is the natural fit for live group scoring.
- **Why this matters:** Aces and VibeCo share infrastructure on purpose — see Prong 2.
  The Courtana MCP server and agent layer become Aces' "product brain."

## 11. Open questions (for Bill)

1. Is the existing Lovable hole-in-one build the **consumer ace app** described here, a
   **B2B course-contest** tool, or something else? That determines how much of this PRD is
   "new" vs. "reframe what you have." *(I built the consumer-social interpretation.)*
2. Real money in v1.1, or stay social-token longer to keep regulatory surface near zero?
3. Repo strategy — fold Aces into this repo (current: `/aces` on this branch) or spin a
   fresh repo? Recommendation in [`PRODUCT_STRATEGY.md`](./PRODUCT_STRATEGY.md).
4. Brand: is it **Aces** or **NiceAce**? (Both were mentioned.)
