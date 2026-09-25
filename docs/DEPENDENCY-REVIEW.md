# Dependency security update — 2026-09-25

Executed `npm audit --json`, then **`npm audit fix --json` without force**, followed by full and production-only audits. No major direct dependency upgrades or production actions were performed.

| Audit | Before | After compatible fixes |
| --- | ---: | ---: |
| Critical | 2 | 0 |
| High | 17 | 1 |
| Moderate | 7 | 5 |
| Low | 2 | 0 |
| Total package findings | 28 | 6 |

Production-only audit now reports **two moderate package entries** (`react-router` and `react-router-dom`), with no high or critical findings. Audit counts include transitive package chains and are not counts of demonstrated exploits in this application.

## Applied updates

The compatible repair changed 49 installed packages, added two, and removed one. Direct dependency minimum ranges are now explicitly set to the installed compatible versions:

- `jspdf ^4.2.1` (critical PDF-generation advisories cleared)
- `react-router-dom ^6.30.6`
- `postcss ^8.5.28`
- `vite ^5.4.21`
- `vitest ^3.2.7` (critical Vitest advisory cleared; a separate moderate finding remains)

`package-lock.json` records the transitive patches. `npm install --package-lock-only --ignore-scripts --no-audit` synchronized the raised minimum ranges without additional dependency execution. Final clean-install, test, type, build and browser evidence is included in the review package.

## Remaining findings and actual context

| Dependency family | Severity / entries | Context and remaining work |
| --- | --- | --- |
| Vite / esbuild | 1 high + 1 moderate | Development tooling, not part of the static production runtime. Remaining source-map traversal and development-server issues require a Vite major upgrade to a patched supported line. The default development host has been changed from `::` to `127.0.0.1` (loopback). Do not expose this development server publicly. |
| Vitest / @vitest/mocker | 2 moderate | The remaining advisory concerns redirect-mock file access through a development-server socket. This project uses `vitest run` with Node/jsdom tests and does not configure public standalone mocker plugins or Vitest browser mode. A patched release requires Vitest 4.1.11+ or 5.x; no maintained 3.x fix is planned by upstream. |
| React Router / react-router-dom | 2 moderate | Upstream patches are in 7.18+. The SSR hydration advisory does not apply to this declarative BrowserRouter/createRoot SPA. The open-redirect advisory concerns attacker-controlled navigation destinations; the app's user-controlled `returnTo` passes through `safeReturnPath`, which rejects backslashes, protocol-relative paths, and control characters. Current remaining route destinations use fixed route prefixes or encoded query values. This reduces current exposure but does not make the dependency audit clean. |

No overrides forcing incompatible transitive versions were added. The remaining recommended major upgrades are a separate compatibility task, rather than an untested `npm audit fix --force`.

## Primary references

- [React Router open redirect advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6)
- [React Router SSR hydration advisory and declarative-mode exemption](https://github.com/remix-run/react-router/security/advisories/GHSA-337j-9hxr-rhxg)
- [Vite source-map traversal advisory](https://github.com/vitejs/vite/security/advisories/GHSA-4w7w-66w2-5vf9)
- [Vitest redirect mock advisory, scope, and patched versions](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9)
- [esbuild development-server advisory](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99)

Machine-readable evidence: `npm-audit-before.json`, `npm-audit-fix.json`, `npm-audit-after.json`, `npm-audit-production.json`; lock refresh output: `npm-lock-refresh.log`.
