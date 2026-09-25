# Workbench privacy, account continuity, and usage controls

Implemented locally; the migration and Edge Functions have **not** been deployed. Production Supabase settings and enforcement still require staging verification.

## Behavior and compatibility

- Historical reports keep `purpose = build` and `schema_version = 1`; new general reports use schema 2. Existing report contents are not rewritten.
- Reports, perspectives, saved insights, and simulator backups require the owning session. Report events are owner-readable and server-writable. Anonymous Supabase sessions have an authenticated UID and can own their guest work.
- `sharing_enabled` defaults to false for all reports, including historical records. `set_report_sharing(_report_id, _enabled)` checks the registered owner (including protection against direct anonymous updates); `get_shared_report(_report_id)` returns a curated report only while sharing is enabled. Old report URLs remain routes, but previously implicit public links require the owner to enable sharing again. Revoking a link cannot erase copies already downloaded by recipients.
- Organizational decisions, signal storage, connector records, and MCP telemetry are administrator/service data. Public Signal scans use explicit in-memory items and `persist: false`; their queries are not written to the shared connector timeline. Existing ownerless records remain untouched and inaccessible to ordinary accounts; recovering ownership requires a separate verified administrator operation.
- Guest email signup uses `updateUser(email)`, email confirmation, then `updateUser(password)`, preserving the UID. Guest OAuth uses `linkIdentity`. Signing into a separate existing account requires a downloaded recovery JSON archive first; it does not merge ownership. After a successful account switch, old browser drafts are cleared. Upgrade keeps those drafts.
- `ask-bill`, its agent, and its existing shared dependencies are unchanged. The new guard applies to all other existing Edge wrappers, plus `workbench`. Diagnostics and MCP usage analysis require administrator or explicit service credentials. All guarded tools use POST.

## Durable limits

The guard validates the user through Supabase Auth, checks report ownership where a report ID is provided, then atomically reserves usage through a service-only database RPC **before** calling providers. Missing configuration, denied ownership, or unavailable quota storage prevents provider execution. Body input is limited to 96 KiB, debate to five perspectives, collection to seven queries and three domains, and signal processing to 80 supplied items.

| Server environment setting | Default | Meaning |
| --- | ---: | --- |
| `AI_GUEST_TRIAL_UNITS` | 24 | Lifetime weighted units for one guest primary question, expiring after 24 hours |
| `AI_ACCOUNT_DAILY_UNITS` | 120 | Registered account budget per UTC day |
| `AI_INTERNAL_DAILY_UNITS` | 500 | Separate internal service budget per UTC day |
| `AI_GLOBAL_DAILY_UNITS` | 1000 | Total guarded capacity per UTC day, including new anonymous identities |
| `AI_CONCURRENT_REQUESTS` | 4 | In-flight requests per user/service subject |

Weights reflect bounded workflow fan-out: a single perspective costs 1 unit, a concept image 2, a general workbench report or debate 6, orchestration 9, and the full auto-evaluation pipeline 10. They are capacity units, not a dollar estimate. Configure actual provider spending limits separately before deployment.

The global database lock serializes admission across Edge instances and anonymous identity creation. No caller-supplied IP address is trusted. Identical per-user payloads are deduplicated for ten minutes; completed JSON responses up to 1 MiB can be replayed without another provider call. Cached responses are cleared opportunistically after ten minutes. Running reservations expire after five minutes and remain charged. Attempts, including provider failures, consume units. The protected ledger is accessible only to the service role. No raw request body or bearer token is stored there.

## Offline verification

Run `npm test -- src/test/security`.

- PGlite executes the **actual new migration** against a minimal existing-schema fixture. It checks two-account isolation, denied attribution to another owner, explicit sharing/revocation, internal-table/RPC permissions, replay, guest/daily/global limits, and competing reservation requests. This verifies SQL behavior without a production connection; it does not replay the repository's older migration history, which contains duplicate DDL.
- Mocked native-fetch tests prove denied or unavailable reservations never enter the provider handler, exact service credentials use a separate budget, reports are owner-checked, and legacy adapters preserve JSON inputs.
- Auth state and rendered-interface tests exercise email upgrade, verified password completion, safe return URLs, mandatory guest recovery export, and cleanup only on a successful account switch.

## Required staging checks before release

1. Reconcile the deployed schema and apply `20260925090000_workbench_privacy_and_usage.sql` to staging. Deploy guarded functions only with the migration available; otherwise they intentionally return `USAGE_UNAVAILABLE`.
2. Enable anonymous Auth and manual identity linking if Google/Apple upgrades are offered. Allow `/auth?finish=1&returnTo=...` callbacks for the exact approved site origins. Verify email delivery, confirmation, refresh tokens, and same-UID continuation with a real test account. Reference: [Supabase anonymous user conversion](https://supabase.com/docs/guides/auth/auth-anonymous).
3. Repeat owner/second-account/anonymous sharing checks against staging PostgREST, including Realtime events and archived ownerless records. Verify service-only MCP callers use the explicit service credential and POST.
4. Exercise real provider timeout, quota, and partial-scan behavior using a bounded staging allowance. Confirm `ask-bill` against Brick with its unchanged contract.
5. Inspect production policies and Lovable's active branch before any authorized release. No production claims are inferred from the offline tests.

## Signal collection outcomes

The collector attaches `warnings: string[]`, `partial: boolean`, and per-query `sources.status` entries (`success`, `error`, or `skipped`, with sanitized reason codes). Missing web configuration is explicit. One failed provider does not discard another provider's results, including when provider credits are exhausted. Successful empty responses remain valid empty scans; HTTP 502 is reserved for scans with no successful source query. Deliberately disabled sources do not make coverage partial. Provider calls have a 15-second timeout and a 2 MiB response ceiling; raw provider error bodies are never returned. Offline tests cover partial failures, missing configuration, all-source failure, valid empty results, timeout, malformed/oversized responses, and URL deduplication.
