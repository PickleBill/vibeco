# Signal Engine — standalone, Lovable-free

The market-research / signal-scan / opportunity-scoring engine as an **independent** unit:
Supabase backend + a single static dashboard. No Lovable, no frontend build step.

See [`/docs/DECOUPLING.md`](../docs/DECOUPLING.md) for the why and the architecture.

## What's in the engine

| Piece | Location (in this repo for now) | Role |
|---|---|---|
| DB schema + RLS | `supabase/migrations/20260605000000_signal_mine.sql` | signal_raw / clusters / feature_candidates |
| Theme memory | `supabase/migrations/20260605010000_pulse_themes.sql` | durable themes + trend history |
| Daily automation | `supabase/migrations/20260605020000_signal_mine_cron.sql` | pg_cron → scan twice daily |
| Collector | `supabase/functions/signal-collect/` | Reddit + competitor App Store reviews (public, no key) |
| Processor | `supabase/functions/signal-process/` | classify → cluster → synthesize → persist themes |
| Agent logic | `supabase/functions/_shared/agents/signal-mine.ts` | the reasoning |
| **Dashboard** | `signal-engine/dashboard.html` | **live** view of any Supabase project; Run-scan button |

> These live in the `vibeco` repo today for convenience. To fully separate, copy
> `supabase/` + `signal-engine/` into a new repo — nothing here depends on the VibeCo app.

## Deploy WITHOUT Lovable (Supabase CLI)

```sh
# one-time
npm i -g supabase            # or: brew install supabase/tap/supabase
supabase login

# point at a dedicated project (create one at supabase.com first)
supabase link --project-ref <YOUR_PROJECT_REF>

# schema + cron, then functions
supabase db push
supabase functions deploy signal-collect
supabase functions deploy signal-process

# the LLM secret for processing — pick ONE:
supabase secrets set LOVABLE_API_KEY=<key>     # Lovable Gateway (multi-model)
#   …or fully independent of Lovable:
supabase secrets set ANTHROPIC_API_KEY=<key>   # direct Anthropic (set body.llm_provider="anthropic")
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected into edge functions.

## Use the dashboard

Open `signal-engine/dashboard.html` (locally, on GitHub Pages, or any static host) and either:
- paste your **project URL + publishable (anon) key** in the connect form, or
- pass them in the link: `dashboard.html?url=https://xxx.supabase.co&key=eyJ...&product=niceace`

Then **Run scan** → it collects real public data, processes it, and shows live themes +
feature candidates. The anon key is public-by-design and safe in the browser; RLS + the
functions' service-role context do the privileged work.

## Get real data fast (no clicks)

The cron migration scans daily on its own once deployed. Verify:
```sql
select jobname, schedule from cron.job;
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
select count(*) from signal_raw;        -- real collected items
select title, pain_score from signal_themes order by pain_score desc;
```

## Sources

- **Reddit** — public search JSON (subreddits + queries; defaults target golf).
- **Competitor App Store reviews** — pass `appstore_terms: ["18Birdies","Golfshot",…]`; the
  collector resolves names → App Store ids via the iTunes Search API and pulls recent reviews,
  tagged with the competitor name for per-competitor theses. All public, no key, ToS-friendly.
