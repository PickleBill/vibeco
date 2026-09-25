# VibeCo

Turn a messy question into a clear next move. Explore an idea, research a company, pressure-test an initiative, or work through a decision.

React / TypeScript / Vite frontend with Supabase Auth, PostgreSQL and Edge Functions. The original build simulator remains intact; purpose-aware reports are additive.

## Project identity

- Repository: `PickleBill/vibeco`
- Registry slug: `vibeco-labs`
- Registry Lovable project: `b653b128-3875-4437-8937-09034702860d`
- Existing Supabase reference: `ulgoahsxkrkzoquvntei`
- Public site: https://vibeco.lovable.app/

Confirm the active Lovable editing branch before publishing. The earlier unfinished local redesign is preserved separately and was not copied wholesale over this baseline.

## Local review

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 8087
```

Localhost automatically uses isolated preview mode. All Supabase transport is blocked; examples, navigation, copy and downloads work without creating accounts or spending provider credits. Open `/examples` for all four report purposes.

To exercise a separately authorized staging backend, explicitly configure its public Supabase URL/key and `VITE_ENABLE_LIVE_BACKEND=true`. Never put service-role/provider keys in frontend `VITE_` variables. `VITE_LOCAL_PREVIEW=true` forces isolation even when another flag is present.

```sh
npm test
npx tsc --noEmit -p tsconfig.app.json
npm run build
node scripts/verify-preview.mjs
```

The browser suite requires Playwright Chromium (or `PLAYWRIGHT_CHROMIUM_EXECUTABLE`) and a running local preview. It fails if the preview attempts a backend request. `npm run lint` still reports legacy repository issues; see the validation report for the measured baseline/delta.

## Review and release

- [Capability map](docs/CAPABILITY-MAP.md)
- [Security and staging requirements](docs/SECURITY-VALIDATION.md)
- [Legacy build validation](docs/LEGACY-VALIDATION.md)
- [UI validation](docs/UI-VALIDATION.md)
- [Dependency review](docs/DEPENDENCY-REVIEW.md)
- [Brick handoff](docs/BRICK-HANDOFF.md)
- [Implementation brief](docs/IMPLEMENTATION-BRIEF.md)

The workbench migration must precede guarded function deployment. Without quota storage the functions fail closed. Existing reports become private by default; sharing must be explicitly enabled by a registered owner. Live email conversion, identity linking, provider behavior, database policies and Brick integration must be checked on staging before an approved release.

Do not push main as an innocent backup: existing workflows can deploy the frontend or redeploy `ask-bill`. This local implementation has not been pushed, published, or migrated to production.
