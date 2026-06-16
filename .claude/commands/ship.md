---
description: Pre-ship checks — lint, unit tests, and production build must pass
---
Run the full pre-ship verification for vibeco and report results concisely. Do NOT commit if any step fails.

1. `npm run lint` — fix any ESLint errors you introduced.
2. `npm test` — Vitest unit tests must pass.
3. `npm run build` — production build must succeed.

If a step fails, show the failing output and fix it before continuing. When all three pass, report a ✅ per step and a one-line summary.
