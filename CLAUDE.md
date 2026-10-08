# VibeCo — AI-Powered Business Idea Simulator

## What This Is

> **Sept 2026 positioning:** VibeCo is an AI application, "Turn a messy question into a clear next move." It is not a personal site: no names or bios on it. Every agent (Codex, Claude Code, Lovable) works in this one repo. See `AGENTS.md`.

VibeCo helps non-technical founders go from a plain-English idea to a structured, testable product. Users submit an idea, AI agents analyze it through multiple strategic lenses, and the system produces business briefs, Lovable-ready build prompts, concept images, and multi-perspective critiques.

**Part of the Courtana organization** — a 65+ project ecosystem spanning pickleball tech, business tools, and experiments, all built on Lovable.

## Tech Stack

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS + shadcn-ui, Framer Motion
- **Backend**: Supabase (PostgreSQL + Edge Functions in Deno)
- **AI**: Multi-model via Lovable Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) + direct Anthropic API fallback
- **Deploy**: Lovable platform (auto-deploys from git)
- **Auth**: Supabase Auth + Lovable cloud auth (Google/Apple OAuth)

## Architecture

### Frontend (`src/`)
- `pages/` — Route components: Index (the "working AI lab" front door), Simulate (the workbench), Report, MySimulations, Portfolio, Auth, ForSeller (`/for/:seller/:module?/:reportId?`, the territory command center, e.g. `/for/omni`; linked from the homepage "Sales Teams" button, noindex), DealRoom (`/deal/:id`, the prospect-facing brief they can correct; claims and sources only, noindex)
- `components/account/` — Target-account lens (`lens: "account"`): AccountRunner (sources → First-call plan → seven agents and a verdict in one go; a research feed fills the wait; saved runs open instantly), AccountViews (citations, motion panel, status tags, job-board scan card), AccountReport (`/report/:id` for account runs). `explorer/` is the run view shared by both: hero (the fit grade opens "Why Fit X?": the model's reason plus four signals read in code by `signals.ts`: stack named, investing in data, dated trigger, stated intent), the seven-agent board (lit live from `agent_events`, replayed for saved runs), Verdict, "Explore one lens at a time" (stress test by seat with the live critic chat, Expand, Distill), the plan as tabs, and the saved-runs strip. Seller labels, pinned saved runs, the territory (each account with its segment and headquarters; the first account is the tour's demo account), lookalike seeds and the theme live in `src/lib/sellers.ts`
- `components/territory/` — The command center at `/for/:seller`: TerritoryShell (top bar, rail of views, `?demo` presenter walkthrough; puts the seller theme, e.g. `.theme-omni` in `index.css`, on `<html>`), `model.ts`/`useTerritory` (saved runs read into rows), shared pieces in `ui.tsx` (evidence tags, ageing source chips, fit badge, workbook tabs). `qualification/` reads MEDDPICC rows and the three whys (why change, why now, why the seller) from a run and its simulated meeting, with no model calls; a row is Confirmed or Inferred only from the sources, and the meeting only adds hints. It shows in the run's hero and plan tabs, the Committee and the Deal Room's seller side, never on the prospect page. Views in `modules/`, in rail order: Run an account (the front door; the account lens above), Radar, Lookalikes, Committee (`committee/`, the five critics' simulated meeting), Whiteboard (`whiteboard/`, partnership riffs on the `partner-riff` function, with an editable price-to-value model; the Deal Room, `dealroom/`, is its second tab at `?tab=deal`). Every view runs on real saved runs; the one exception is the Whiteboard's illustrative example, labeled a made-up company
- `components/home/` — Homepage sections (hero + worked example, how it works, use cases, builds shelf). Question types ("lenses") live in `src/lib/lenses.ts` and are passed to `simulate-idea` as `lens`
- `components/simulator/` — Core simulator workflow: IdeaInput → IdeaBrief → FollowUpQuestions → FinalReport → ActionHub
- `components/simulator/SimulatorShell.tsx` — **The main orchestrator.** Manages 3-round analysis state, calls edge functions, threads context between agents.
- `components/portfolio/` — Project registry dashboard
- `components/ui/` — shadcn-ui primitives
- `integrations/supabase/` — Client init + auto-generated types

### Agent Modules (`supabase/functions/`)

All agents follow the same pattern: receive JSON → construct system prompt → call Lovable Gateway with tool-calling → parse tool_call response → return JSON.

| Function | Purpose | Model | Tool Schema |
|----------|---------|-------|-------------|
| `simulate-idea` | 3-round idea analysis + deep dives; the account lens's one-round brief | Gemini 3-flash / 2.5-pro; account brief: Claude Sonnet 5 (gateway Messages), Flash fallback | `generate_idea_analysis`, `generate_deep_dive` |
| `persona-perspective` | 5 persona critiques (Skeptic, Champion, Competitor, Customer, Builder) | Gemini 3-flash / 2.5-pro | `generate_perspective` |
| `expand-idea` | 3 orthogonal business variations | Gemini 3-flash / 2.5-pro | `generate_expansions` |
| `distill-idea` | MVP distillation (one feature, one customer, one revenue) | Gemini 3-flash / 2.5-pro | `generate_distillation` |
| `refine-prompt` | Iterative Lovable prompt refinement using Thunderdome feedback | Gemini 3-flash / 2.5-pro | `generate_refined_prompt` |
| `generate-landing-page` | Full HTML landing page generation | Gemini 2.5-flash | None (raw HTML) |
| `generate-idea-image` | Concept art + logo generation | Gemini 3.1-flash-image | None (image modality) |
| `generate-alt-prompt` | Research/design/landing prompts for other AI tools | Gemini 2.5-flash | None (JSON response_format) |
| `probe-models` | Model diagnostics: the gateway's own model list, and whether each model the router uses (plus top-tier alternatives) answers and returns a tool call, with latency; direct Anthropic status. `{compare: {company, models}}` runs the real account brief on up to four models side by side. Rate-limited | Every routed model | `answer` (probe) |
| `synthesize` | Cross-agent synthesis (consensus, tensions, confidence) | Gemini 2.5-pro (GPT-5 fallback; GPT-5.5 premium) | `generate_synthesis` |
| `orchestrate` | Auto-Thunderdome: 7 agents parallel + synthesis | Multi-model | N/A (orchestrator) |
| `auto-evaluate` | **Flywheel**: raw idea → simulate → thunderdome → synthesize → score | Multi-model | N/A (pipeline) |
| `critic-chat` | Answer the critic: one of an account run's five critics replies to the seller in character from the brief and its sources only, grades the reply (strong, partial, misses) and asks one follow-up. Public, rate-limited | Gemini 3-flash, Claude Sonnet 5 fallback | `respond_as_critic` |
| `committee-sim` | Simulate the buying committee: the five critics of an account run argue in three rounds; stances (−2..2) and influence, path to yes, main blocker, a synthetic outcome band, what-if re-runs. Numbers and dates not in the brief are dropped in code. A saved run's meeting is stored once at `auto_analysis.committee`; what-ifs are never stored. Public, rate-limited | Claude Sonnet 5, Gemini 3-flash fallback | `run_committee` |
| `deal-room` | The prospect corrects the brief claim by claim (right, fix, not sure), saved at `auto_analysis.deal_room`; also serves the prospect-safe part of a run (no fit, critics, objections or plan). Public, rate-limited | None (no LLM) | N/A |
| `suggest-accounts` | Lookalikes, beyond the territory: suggests real companies in the region like a seed account that aren't in the territory yet. With `EXA_API_KEY`, an Exa company search finds the pages first (headquarters, size and listed tools from the page's company data) and the model only picks among them by number; without it, or when the search keeps nothing, the model names them. Code drops excluded, duplicate and directory domains, any reason with a number or a funding/headcount claim, and any domain that doesn't answer over HTTPS. Shown as unresearched hypotheses with a "Research it live" link; nothing stored. Public, rate-limited | Claude Sonnet 5, Gemini 3-flash fallback | `suggest_accounts` |
| `partner-riff` | **Whiteboard**: a partnership riff on one company: where the seller's analytics could live inside its product, what its customers would see, the pricing shape, a SWOT, the internal play and the next move. Grounded in Exa (its company profile, its own product pages, its own job posts); code keeps a claim "known" only when a cited source holds it, drops numbers no source or the seller's public proof contains (a line naming a seller customer keeps only that customer's proof numbers), calls a claim about its tools known only when its own pages or job posts confirm each one, and fills the seller's prices with editable placeholders. Saved per company for 14 days in `idea_reports` (lens `partner`), tagged with the checks version (`RIFF_CHECKS`): raise it when the checks change and older riffs run again. Public, rate-limited | Claude Sonnet 5, Gemini 3-flash fallback | `write_partner_riff` |
| `stack-scan` | **P1**: reads a company's public Greenhouse, Lever, Ashby or Workday job board (Workday via a registry of verified boards in `_shared/workday-boards.ts`) and lists the data tools its posts name, plainly or as one option among several. The same scan runs inside `simulate-idea`'s account research | None (no LLM) | N/A |
| `ask-bill` | **bricker-os**: corpus-grounded Q&A for Bill's dynamic résumé terminal (corpus fetched from the Brick repo's GitHub Pages; public endpoint, rate-limited) | Claude 3.5 Sonnet / 3 Haiku | None (plain text answer) |

### Shared Agent Infrastructure (`supabase/functions/_shared/`)

Shared code lives here. Supabase convention: `_shared/` prefix means it's not deployed as its own endpoint.

| Module | Purpose |
|--------|---------|
| `cors.ts` | CORS headers |
| `llm-client.ts` | Unified LLM caller: Lovable Gateway chat completions, its Messages endpoint for `anthropic/*` models (Claude bills to `LOVABLE_API_KEY`), and Anthropic direct |
| `model-router.ts` | Smart model selection by task type |
| `types.ts` | Shared TypeScript types for agent I/O |
| `error-handler.ts` | Unified error handling (429/402/500) |
| `agents/*.ts` | Core logic for each agent, importable by other agents (`agents/account.ts`: account-lens schema, evidence checks, First-call plan) |
| `lens.ts` | Per-lens framing: brief slots, critic seats, distill slots, deliverables (`account` answers in one round) |
| `research.ts` | Live sources: Firecrawl search (company lens), and account research (job-board scan + four web searches in parallel: stack, product, jobs, news; 10-source cap) |
| `motion.ts` | Account lens: Internal, Embedded, Both or Unclear, decided in code from evidence in the sources (own job posts, own product pages and analytics product titles, cited sources); the model writes each motion's clock, buyer and question |
| `stack-scan.ts` / `stack-tools.ts` | Job-board scan and the data-tool catalog; a tool listed only as an option ("Snowflake, BigQuery, or Redshift", a parenthetical list, a "Bonus" or "Preferred" line) is never Confirmed, and one the company moved off is Former |
| `match.ts` | Company and word matching shared by the evidence checks ("Chime" counts, "chime in" doesn't); `parseCompany` splits "Bandwidth (bandwidth.com)" into a name and a domain |
| `sellers/` | Seller profiles for the account lens (`omni.ts`: public facts with source URLs, plus the two motions as generic seller config) |
| `exa.ts` | Exa company search: real company pages read into name, own domain, headquarters, headcount and the data tools the page's company data lists |
| `rate-limit.ts` | Per-IP limits for public endpoints that pay for searches or long model calls |

### Database (Supabase PostgreSQL)

Key tables: `idea_reports` (simulation state), `idea_perspectives` (persona results), `simulator_captures` (session backup), `project_registry` (portfolio), `contact_submissions`, `user_roles`.

All tables use UUID primary keys, `now()` timestamps, and row-level security (RLS) policies.

## Conventions

- **All LLM calls** go through `_shared/llm-client.ts` — never raw `fetch` to the gateway
- **Model selection** uses `_shared/model-router.ts` — never hardcoded model strings
- **Tool schemas** use OpenAI function-calling format (the Lovable Gateway speaks this)
- **Edge function endpoints** are thin HTTP wrappers (~20 lines) that import core logic from `_shared/agents/`
- **CORS headers** imported from `_shared/cors.ts`
- **Error handling** uses `_shared/error-handler.ts` patterns

## Adding a New Agent

1. Create `supabase/functions/_shared/agents/{name}.ts` with the core logic (system prompt, tool schema, main function)
2. Create `supabase/functions/{name}/index.ts` as a thin HTTP wrapper that imports from the shared module
3. Add the agent's task type to `_shared/model-router.ts`
4. Add TypeScript types to `_shared/types.ts`
5. If other agents should be able to call it, register it in the orchestrator's workflow DAG

## Environment Variables

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — Frontend Supabase connection
- `LOVABLE_API_KEY` — Supabase Edge Function secret for Lovable Gateway
- `EXA_API_KEY` — Optional, grounds `suggest-accounts` in an Exa web search
- `ANTHROPIC_API_KEY` — Optional, enables direct Claude API calls as fallback (Claude also runs through the Lovable gateway without it)

## Design System

See `.impeccable.md` for brand context. See `SKILL_*.md` files for the design orchestration framework (9 interlocking skills adapted from Impeccable Style). Key aesthetic: cinematic dark mode, matte charcoal, electric accents. Anti-pattern: generic AI-generated interfaces.

## Testing

- `npm test` — Vitest unit tests
- `npx playwright test` — E2E tests
- `npm run build` — Verify production build
- `npm run lint` — ESLint checks
