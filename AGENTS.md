# AGENTS.md: read this before changing anything

This file is for every coding agent that touches VibeCo: Codex, Claude Code, Lovable, or anything else.

## One repo, one site

- **This repo (`github.com/PickleBill/vibeco`) is the only home for VibeCo.** Don't create a new project, folder, repo, or local-only prototype. If you have a prototype somewhere else, bring it into this repo on a branch.
- **`main` is what's live.** The Lovable project "VibeCo Labs" syncs with `main` in both directions and serves **https://vibeco.lovable.app**. Anything merged to `main` shows up in Lovable. It goes live when someone publishes from Lovable (Publish → Update, or the Lovable `deploy_project` tool).
- **How to work:** branch from `main` (`codex/<topic>`, `claude/<topic>`), push the branch, and open a PR. Don't push straight to `main`. Lovable also commits to `main`, so pull before you branch.
- **Preview locally:** run `bun install`, then `bun run dev` (Vite on port 8080). The app talks to the live Supabase project, so AI calls are real.

## What VibeCo is (Sept 2026)

VibeCo is an AI application, not a personal site: **"Turn a messy question into a clear next move."** It takes four kinds of question (idea or app, company or topic, business initiative, decision or disagreement) and runs each one through five steps: **Frame → Explore → Challenge → Decide → Put it to work**. Keep personal names, bios and résumé content off the site.

- The homepage lives in `src/pages/Index.tsx` and `src/components/home/` (hero, how it works, use cases, builds). The question types and use cases are in `src/lib/lenses.ts`.
- "Start a question" is `/simulate` (`src/components/simulator/SimulatorShell.tsx`).
- The agents are in `supabase/functions/` (core logic lives in `_shared/agents/`). Keep them. Change framing and UI, not the engine.

## Rules

- Follow `CLAUDE.md` for the code conventions: LLM calls go through `_shared/llm-client.ts`, and models are chosen through `_shared/model-router.ts`.
- **No invented proof.** No made-up stats, testimonials, customers, or results. Label illustrative content as illustrative.
- Keep these routes working, because other sites link to them: `/`, `/simulate`, `/report/:id`, `/#model`.
- `supabase/functions/ask-bill` is a backend for another site (a résumé terminal). It isn't part of the VibeCo UI, but don't break it.
- Before opening a PR, run `bun run lint`, `bun run test`, and `bun run build`.
