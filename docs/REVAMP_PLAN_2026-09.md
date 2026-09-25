# VibeCo revamp plan (approved 2026-09-25)

> **Update (Bill, 2026-09-25): VibeCo is an application, not a personal site.** No name, bio or résumé content on it. "About Bill" is replaced by Use cases, and "Workbench" is back to "Simulate". Where the plan below says otherwise, this note wins.
>
> Status: Phases 1-3 and 5 are in the first PR (branch `claude/eloquent-bohr-o72zxv`). Phase 0 (Codex pushes `codex/workbench`), Phase 4 real example runs, and Phase 6 (publish + Brick link PR) come after review.


## 30-second version

- **Don't build a new site.** The live site (vibeco.lovable.app) is the Lovable project "VibeCo Labs", and it's already in two-way sync with GitHub `PickleBill/vibeco` (both at commit `512586c`). That's home base. Anything merged to `main` shows up in Lovable. Publishing takes one more step, which I can run.
- **Codex's design becomes the front door. The AI engine you built with Lovable and Claude Code stays behind it.** Codex's 5 steps (Frame, Explore, Challenge, Decide, Put it to work) line up one-to-one with agents that already exist. Keeping those agents is how we keep the value.
- **Why Codex keeps going off on its own:** it isn't working inside this repo. The fix: its code goes to a branch on `PickleBill/vibeco`, and the repo gets an `AGENTS.md` (the instructions file Codex reads). After that, Codex, Claude Code and Lovable all work from one repo.
- **Who does what:** I port the design on a branch and open a PR with screenshots. You approve from your phone. I merge, Lovable syncs, and I publish with Lovable's deploy tool.
- **Two extras worth doing:** (1) Your Brick résumé terminal calls VibeCo's `ask-bill` function, which currently returns an error on every request. The likely cause is a 2-line model fix. (2) Link Brick and VibeCo to each other as sister sites.

---

## Prompt-forge read

**Goal as I read it:** turn vibeco.lovable.app into "Bill Bricker's working AI lab", a clear, honest workbench that shows your skills in interviews and that you actually use for job-hunt research. Use Codex's design, run it on VibeCo's existing agents, keep all the code in one repo, and link it prominently from picklebill.github.io/Brick.

**Open assumptions:**
- "Live site" means vibeco.lovable.app (project `b653b128`), not "live VibeCo V2.1" (`8563d10e`, the Signal scanner, which has its own repo and hasn't been touched since July 7).
- Codex's code exists only on your Mac. 127.0.0.1:8087 is your laptop, so I can't reach it. Its plan text is only partly visible in your screenshot.
- The audience is hiring managers and interviewers first, and you second (for research). It is no longer "founders who hire a studio".

**Decisions, with the defaults I'll use unless you say otherwise:**
1. **Home base:** VibeCo Labs + `PickleBill/vibeco`. *Default: yes.* A new project or remix would lose the URL, the Supabase backend, and the ask-bill function Brick depends on.
2. **V2.1 Signal scanner:** freeze it, leave its URL up, and don't link it for now. *Default: freeze.*
3. **If Codex's branch isn't pushed when I start:** build the home page from your screenshot, which is detailed enough, and fold Codex's details in when they arrive. *Default: don't wait.*
4. **Publishing:** after you approve the PR, I merge and run Lovable's deploy tool. *Default: yes.* The alternative is that you click Publish → Update in Lovable yourself.
5. **Brand line:** "Bill Bricker's working AI lab / Turn a messy question into a clear next move" (Codex's). *Default: yes.*

### Forged brief (portable: paste it into any fresh Claude Code or Codex session)

```
ROLE: Senior product engineer who ships on Lovable + Supabase. You work only inside github.com/PickleBill/vibeco.
GOAL: Replace vibeco.lovable.app's studio/agency homepage with the "working AI lab" workbench, wired to the existing agents, and publish it live.
CONTEXT:
- Lovable project b653b128 ("VibeCo Labs") is two-way synced with the repo's main branch and serves vibeco.lovable.app. Merging to main updates Lovable. Lovable's Publish/Update (or the Lovable deploy_project tool) pushes it live.
- New front door (Codex design, branch codex/workbench or docs/CODEX_WORKBENCH_PLAN.md): light warm paper, deep teal accent.
  Hero: "BILL BRICKER'S WORKING AI LAB / Turn a messy question into a clear next move."
  Four question types: Idea or app · Company or topic · Business initiative · Decision or disagreement.
  Five steps: Frame · Explore · Challenge · Decide · Put it to work.
  Honesty labels: "Illustrative example · no AI run", "Synthetic perspectives, not customer interviews", "The output is a starting point for judgment."
  Nav: Workbench · Examples · About Bill · Sign in.
- The engine already exists: simulate-idea, expand-idea, persona-perspective, debate, synthesize, distill-idea, refine-prompt, generate-alt-prompt, generate-idea-image (supabase/functions/_shared/agents/*). Keep every agent. Change labels, framing and routing, not the engine.
INPUT: The repo, the codex/workbench branch if it exists, and the screenshot of the Codex build.
OUTPUT: One PR to main with before/after screenshots at 390px and 1440px. After approval: merge, publish, and a live-site check.
CONSTRAINTS:
- Follow CLAUDE.md conventions: LLM calls go through _shared/llm-client.ts and models through _shared/model-router.ts.
- Keep these routes working: /simulate, /report/:id, /auth, /my-simulations. Brick links to /, /simulate and /#model.
- No fabricated proof: remove the invented stats, fake testimonials and partnership FAQ.
- No schema changes unless a step needs one. Don't touch the Supabase secrets.
EDGE CASES: If the Codex code is missing, rebuild from the screenshot. If Lovable sync lags, verify the Lovable project's latest_commit_sha equals main before publishing. If an agent call fails, show a plain-English error rather than a blank step.
QUALITY BAR: A hiring manager lands on the page, understands what it does in 10 seconds, runs a real question in under 3 minutes, and leaves with a shareable report. Every claim on the page is true.
```

**Self-rate: 8/10, capped.** It reaches 10 once Codex's actual code and full plan text are on GitHub (Phase 0).

---

## What I found

| Surface | Where it lives | State |
|---|---|---|
| **VibeCo Labs** (live) | Lovable `b653b128` ⇄ `PickleBill/vibeco` main → vibeco.lovable.app | Studio/agency pitch, 8 nav items (Signal, Portfolio, Hub, Dashboard…), invented stats (`StatsBar.tsx`: "<48hrs"…), made-up testimonials (`Testimonials.tsx`: "Jordan M.", "Priya S."), 18 edge functions. Palette is already warm paper + teal (`src/index.css` `--primary: 182 66% 30%`), close to Codex's. |
| **live VibeCo V2.1** | Lovable `8563d10e`, repo `vibeco-v2-ai-opportunity-engine-35` | Dark "Signal" scanner. A separate brand fork. Freeze it. |
| **Codex build** | Your Mac only (127.0.0.1:8087) | Not in GitHub, which is why it feels like a separate environment. |
| **Brick** | `PickleBill/Brick` (GitHub Pages) | Links to vibeco.lovable.app, `/simulate`, `/#model` (`work.html`). Its terminal calls vibeco's `ask-bill`, which returns 500 (Brick `_source/decisions.md` P-3). Likely cause: `model-router.ts` "bill-qa" routes to `anthropic/claude-3.5-sonnet` / `claude-3-haiku`, which are retired and invalid IDs. |

### How Codex's 5 steps map to the engine you already have

| Codex step | Existing agent / UI (kept) |
|---|---|
| 01 Frame: get the question right | `simulate-idea` round 1 → `IdeaBrief` + `FollowUpQuestions` |
| 02 Explore: see more than one angle | `expand-idea` (3 variations) → `ExpandContractPanel` |
| 03 Challenge: find weak assumptions | `persona-perspective` (Skeptic, Customer, Builder…) + `debate` → `PerspectivesPanel`, `ThunderdomePanel` |
| 04 Decide: make tradeoffs clear | `synthesize` + `distill-idea` → `SynthesisPanel`, `FinalReport` |
| 05 Put it to work: leave with a next move | `refine-prompt`, `generate-alt-prompt`, `generate-idea-image` → `ActionHub`, `VibeStack` |

`SimulatorStepper.tsx` already has exactly 5 stages (Describe / Analyze / Verdict / Build prompt / Next actions), so switching to Codex's labels is a relabel, not a rebuild.

---

## Phases

**Phase 0 · You, 2 minutes, before closing the laptop.** Paste the Codex prompt I gave you in chat. It pushes Codex's work to `codex/workbench` plus `docs/CODEX_WORKBENCH_PLAN.md`. If you skip this, I build from the screenshot.

**Phase 1 · Put everything in one repo** (branch `claude/eloquent-bohr-o72zxv`)
- Add `AGENTS.md` at the repo root: "Work in this repo. Branch from main. Push a branch and open a PR. Never create a separate project. Lovable deploys main." It points to CLAUDE.md for conventions, so Codex stops forking.
- Merge in the `codex/workbench` components, adapted to the repo's Tailwind tokens and shadcn primitives.

**Phase 2 · New front door** (`src/pages/Index.tsx`, `src/components/Navbar.tsx`, `index.html`)
- The homepage becomes Codex's layout: hero, 4 question-type chips, input box that sends to `/simulate?lens=…&q=…`, worked-example card with Customer/Skeptic/Builder tabs, the 5-step strip, "From questions to things you can try", About Bill, footer.
- Nav: Workbench (`/simulate`), Examples, About Bill, Sign in. Signal, Portfolio, Hub and Dashboard move behind sign-in. The routes stay alive; they're just not in the public nav.
- Remove from the page (files kept in git history): `StatsBar`, `Testimonials`, `Model` partnership pitch, `EverydayFounders`, `SpeedTimeline`, `ContactForm`/`FinalCta` agency CTA, `VariantSwitcher`, and the FAQ JSON-LD about rev-share.
- Keep an `id="model"` anchor on the 5-step section so Brick's `/#model` link still lands somewhere sensible.
- Meta/OG: new title and description. Canonical becomes vibeco.lovable.app unless you own vibeco.dev.

**Phase 3 · The workbench is the simulator, relabeled** (`SimulatorShell.tsx`, `SimulatorStepper.tsx`, `IdeaInput.tsx`, `_shared/agents/simulate.ts`)
- Rename the stepper to Frame / Explore / Challenge / Decide / Put it to work.
- Add a `lens` field (`idea | company | initiative | decision`). It goes from the chips, through `SimulatorShell`, into `simulate-idea`, and into prompt framing in `_shared/agents/simulate.ts`, plus `types.ts`. It has to be a new field: the existing `mode` param means fast/deep model choice.
- Add honesty labels on the persona output ("Synthetic perspectives, not customer interviews").

**Phase 4 · Examples + About Bill**
- Run 3–4 real questions through the live pipeline, one per lens. Good candidates: the coach question from Codex's card, a company-research run, and a decision run. Link each through the existing `get_shared_report` RPC → `/report/:id`. With that, "Open the worked report" opens a real report instead of a mock.
- About Bill: 3 lines, a photo, and a prominent "Résumé & proof → picklebill.github.io/Brick" link. Plus a small "How it's built" panel (Lovable + Claude Code + Codex, a multi-model router, 18 agents), because that's the interview talking point.

**Phase 5 · Fix Brick's terminal backend** (`_shared/model-router.ts` "bill-qa")
- Swap the retired Claude IDs for current ones. Put a gateway-served model first so it works even without `ANTHROPIC_API_KEY`. Redeploy through Lovable (done 2026-09-25; the old `deploy-ask-bill.yml` workflow was removed because Lovable Cloud has no Supabase access token).

**Phase 6 · Ship**
- PR → you approve → merge to main → confirm Lovable's `latest_commit_sha` matches → publish with Lovable `deploy_project` → check vibeco.lovable.app live.
- Then a small PR to Brick (needs push access to `PickleBill/Brick`, which I'll request): new VibeCo card copy and screenshot in `work.html`, fix the `/#model` link, and a "Sister site: VibeCo" link in the nav/footer.

**Out of scope for now:** merging V2.1's Signal engine, Hub/connectors work, and new agents.

---

## Verification
- `npm run lint`, `npm test`, `npm run build` pass on the branch.
- Playwright screenshots of `/`, `/simulate`, and one `/report/:id`, at 390px and 1440px, attached to the PR.
- One real end-to-end run per lens on the Lovable preview after merge, and each one produces a shareable report.
- `curl` the ask-bill endpoint and get a 200 with an answer. Brick's terminal answers live instead of falling back.
- Live check: vibeco.lovable.app shows the new hero, and `/simulate` and the Brick links resolve.

## Rollback
Lovable version history ("Restore") or `git revert` of the merge commit on main, then publish again. Nothing is deleted, so every old component stays in git.
