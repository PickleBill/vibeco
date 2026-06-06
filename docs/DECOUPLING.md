# Decoupling from Lovable — independent build environments

## Why was it ever "dependent on Lovable"?

It wasn't, structurally — it was just **where this repo happened to live.** VibeCo is a
Lovable project, so when we added Signal Mine *inside it*, Lovable did two convenience jobs:

1. **Built/hosted the React frontend** (the `/signal` page).
2. **Auto-applied migrations + deployed edge functions** from git on every merge.

Neither is required. The actual engine is **Supabase + edge functions + cron + public-data
collection** — all of which run on Supabase, which is fully independent of Lovable. Lovable
is a frontend builder and a git-deploy convenience, nothing more.

```
   What Lovable was doing            How we replace it (no Lovable)
   ─────────────────────             ──────────────────────────────
   build + host the dashboard   →    static HTML on GitHub Pages (or any static host)
   deploy functions/migrations  →    `supabase` CLI  (supabase db push / functions deploy)
   (the database itself)        →    Supabase — unchanged, was never Lovable
   (the LLM calls)              →    Lovable Gateway OR direct provider key (your choice)
```

## The new shape: separate, purpose-built environments

You're right to split these. Proposed (names are placeholders):

### 1. **Research Engine** — `signal-engine/` (this is the "prod research / opp scoring / signal scan" build)
- **Backend:** its own Supabase project — Postgres (signal_raw / clusters / themes /
  feature_candidates), the `signal-collect` + `signal-process` edge functions, and the
  `pg_cron` daily automation.
- **Frontend:** `signal-engine/dashboard.html` — a single static file (no build, no Lovable)
  that reads live data from that Supabase project and can trigger scans. Host on GitHub Pages.
- **Data sources:** public + no-key — Reddit search, **competitor App Store reviews**
  (resolved by name via the iTunes Search API), expandable to your own support/NPS later.
- **Lovable involvement:** none.

### 2. **NiceAce** — product build/sandbox
- Its own Supabase project + frontend. Can use Lovable later for speed, or stay on the plain
  React/Vite + Supabase stack. Kept separate so the consumer app's release cadence and
  (eventual) money/compliance surface don't entangle with the research engine.

### Shared brain (optional, unchanged)
Both can still call the Courtana MCP agent mesh + org memory — that's a Supabase/edge concern,
not a Lovable one.

## How to stand up the Research Engine WITHOUT Lovable

Full steps in [`/signal-engine/README.md`](../signal-engine/README.md). In short:

```sh
# 1. Create (or pick) a dedicated Supabase project — supabase.com, or `supabase projects create`
# 2. Link this repo's supabase/ to it
supabase link --project-ref <YOUR_PROJECT_REF>
# 3. Push schema (tables, RLS, cron) and deploy functions — NO Lovable
supabase db push
supabase functions deploy signal-collect
supabase functions deploy signal-process
# 4. Set the one secret the processing step needs (LLM)
supabase secrets set LOVABLE_API_KEY=...      # or ANTHROPIC_API_KEY for a direct, non-Lovable provider
# 5. Open the dashboard, paste the project URL + anon key, hit Run scan
#    signal-engine/dashboard.html  (host on Pages or open locally)
```

That's the whole loop — real public data → real candidates → live dashboard — with Lovable
nowhere in it.

## On the LLM dependency (the one remaining soft tie)

Classification/clustering/synthesis call an LLM. Today that's the **Lovable Gateway**
(`LOVABLE_API_KEY`). To be 100% Lovable-free, the code already supports a **direct provider**
path (`ANTHROPIC_API_KEY` via the `anthropic-direct` gateway in `_shared/llm-client.ts`) —
set that secret instead and processing runs without touching Lovable. **Collection
(Reddit + App Store) needs no LLM and no Lovable at all**, so the public-data half is provable
immediately.

## What I can and can't do from here (so expectations are clear)

- ✅ I can write/restructure all the code, the standalone dashboard, the deploy scripts, docs.
- ✅ Collection uses public, no-key endpoints — real data the moment it runs on Supabase.
- ⚠️ I **cannot create or deploy to a Supabase project from this session** — the Supabase
  tool here is connected to a different account, and the build sandbox has no outbound
  network. So the live deploy is either (a) you run the 5 CLI commands above, or (b) you give
  me access/keys to a designated project and I deploy it. Either way: **not gated by Lovable.**

## Recommended next move
Spin the Research Engine into its **own repo + own Supabase project** (clean separation, own
cron, own dashboard). I can scaffold that repo's contents from `signal-engine/` on request.
