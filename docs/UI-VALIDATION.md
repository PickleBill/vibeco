# VibeCo studio and browser validation

Validated locally on September 25, 2026 against `http://127.0.0.1:8087`.
No production backend, account, or AI-provider operations were performed.

## Public experience

- Home now leads with a question and four optional purposes. Starting questions
  populate the input; submitting hands the question to the workbench for review.
- The interactive prepared preview shows synthetic perspectives and a concrete
  next move. It never starts a model run.
- Examples includes all four prepared reports and all 14 original project links.
  Catalog descriptions avoid unsupported delivery, adoption, and outcome claims;
  maturity is conservatively identified as a prototype or website concept.
- About Bill emphasizes Strategic Partnerships & Business Development and links
  to Brick. No Brick files were changed.
- Navigation separates Workbench, Examples, and About Bill from account tools.
  Anonymous visitors see sign-in; ordinary accounts do not see owner tools.
- The approved warm paper / teal studio direction is recorded in `.impeccable.md`.
  Existing typography is retained; decorative AI imagery and public experiment
  controls are absent from the new public entrance.

## Checks and evidence

`node scripts/verify-preview.mjs` completed **57 checks, all passing**, at
1440×1000 and 390×844 viewport sizes. The suite:

- visits the public pages, four worked reports, build input, Signal, auth, saved
  work, Hub, and Portfolio entry paths; verifies headings and no horizontal overflow;
- checks deliberate start behavior, exact question/purpose handoff, retention of
  edited questions through general and legacy build mode changes, and a clear
  local-service failure that retains the input;
- expands a research perspective, keeps an insight, and verifies source links;
- downloads Markdown and PDF for the three general reports, and PDF for the legacy
  build report; checks nonempty files and PDF signatures;
- verifies Signal sample labeling, accessible auth inputs, legacy `/#projects`
  scrolling, mobile menu keyboard operation and focus return, 44px purpose targets,
  and reduced-motion behavior;
- intercepts and fails production backend requests. The final run recorded **zero
  backend requests or sockets, zero unexpected remote assets, and zero uncaught
  browser errors**. Public font requests were allowed.

Evidence is generated under `.local-verification/acceptance/`: `summary.json`,
route screenshots, and the downloaded reports. Full public-page screenshots and
viewport images also exist under `.local-verification/studio/`. These are local
verification artifacts, not application source.

Desktop home, Examples, and About layouts were visually inspected, as were the
mobile home, research report, legacy build report, and Signal screen. The mobile
Signal counters now use two columns. The prepared build report hides redundant
progress controls. The repeated introductory example notice was consolidated into the report disclosure; its legacy report layout remains denser than the general reports.

The public studio's eight unit tests pass. They cover starter behavior, query
roundtrip, synthetic perspective interaction, retained catalog destinations,
anonymous account handling, owner-menu separation, and private-draft cleanup
only after successful sign-out. Targeted ESLint, TypeScript, and the production
build pass. The build retains nonblocking bundle-size and old Browserslist-data
notices.

## Boundaries

Local checks do not certify deployed authentication, cross-account RLS, real
source retrieval, AI-provider output, production sharing/revocation, or Lovable's
active branch. Those require the separate deployment validation gate. Source-link
checks verify available destinations and preserved references, not a fresh web
research run. Catalog demo maturity and capabilities should be revisited when
publishing a detailed case study.
