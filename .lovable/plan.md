# Sprint 6 — Connected Project Import + Simulator Polish Pass

Two parallel tracks. Track A makes "Import Project" actually useful (one-click from a real Lovable project). Track B applies the Impeccable polish pass to the simulator flow.

---

## Track A — Connected Project Import (the Sanctuary test case)

### What's broken today

- `ProjectImporter` only reads from your local `project_registry` table — and most rows have no `lovable_project_id`.
- `AddProjectDialog` asks you to paste a Lovable Project ID with **no instructions on where to find it**, no validation, no preview.
- Even when imported, the "idea text" is just a label dump (`**Project:** ...`) — none of the actual project context (`.impeccable.md`, `package.json`, page structure) is pulled in.
- Cross-project tools exist in this workspace and **work**: I just confirmed I can read Sanctuary Southeast's `.impeccable.md` (audience tiers, brand tone, anti-patterns, design tokens, voice rules) — that's exactly the gold the simulator needs.

### What we'll build

**1. Workspace project picker (replaces the paste-an-ID flow).**
A new edge function `list-workspace-projects` that calls Lovable's cross-project API and returns `{id, name, description}` for every project in the workspace. The Register Project dialog gets a "Pick from workspace" button that opens a searchable list — no UUID hunting.

> If the cross-project API isn't callable from an edge function (it's tool-scoped to the agent), the fallback is a one-time CSV/JSON paste in Portfolio settings — but we'll try the API path first.

**2. Deep import via `import-project` edge function.**
Given a `lovable_project_id`, this function fetches:

- `.impeccable.md` (brand context, audience, anti-patterns, tone) — **highest signal**
- `package.json` (tech stack — TanStack vs Vite, React 19 vs 18, Tailwind v3 vs v4)
- `README.md` if it exists
- Top-level `src/pages/` or `src/routes/` directory listing (page inventory)
- Any `CLAUDE.md` / `*_DESIGN_SYSTEM.md`

Returns a structured `ProjectManifest` JSON.

**3. Manifest-aware idea brief.**
Replace `ProjectImporter`'s label-dump with a real prose synthesis:

> *"Sanctuary Southeast is a clinical residential program targeting C-suite principals ($10M+ net worth), referral professionals, and trusted advisors. Brand voice: clinical, restrained, unhurried — explicitly anti-spa and anti-celebrity. Stack: TanStack Start v1, React 19, Tailwind v4. Current pages: [list]. Strategic question to test:"*

Then a **single editable prompt** appears: "What do you want to test or improve about this project?" The user adds intent (e.g., "stress-test the referral flow against trust objections") and that becomes round 1 of the simulator — already grounded in real project DNA.

**4. Round-trip the result.**
After simulation, the FinalReport for an imported project surfaces a **"Push improvements back"** action: copies a Lovable-formatted brief specifically for the source project (with file paths from the manifest) plus a one-click "Open project in Lovable" link.

### Files

- `supabase/functions/import-project/index.ts` — new
- `supabase/functions/list-workspace-projects/index.ts` — new (with API-fallback to CSV)
- `supabase/functions/_shared/agents/import-manifest.ts` — manifest synthesizer
- `src/components/simulator/ProjectImporter.tsx` — full rewrite
- `src/components/portfolio/AddProjectDialog.tsx` — replace ID field with workspace picker
- `src/components/portfolio/ProjectCard.tsx` — show manifest-derived metadata
- `src/components/simulator/FinalReport.tsx` — add "Push back to source project" CTA when `imported_from` is set

### Sanctuary as Test Case #1

We'll seed `project_registry` with Sanctuary Southeast (ID `14cfc7e9-e959-4f21-9f32-73470da14fa9`) and run the full loop: pick → import manifest → simulate "stress-test the trusted-advisor flow" → get a clinical-tone-aware Lovable prompt back. This becomes the demo + the regression case.

---

## Track B — Impeccable Polish Pass on Simulator

Goal: take the simulator from "functional" to "delightful." Run `Run impeccable polish` against each surface, in order.

### B1 — `IdeaInput` (`/simulate` entry)

**Current debt**: hard-coded textarea border colors, mode toggle is plain text, "↵ to simulate" hint sits in same color as count.
**Polish**:

- Replace `border-primary/30` etc. with semantic tokens (`focus-ring`, `input-border-active`).
- Mode toggle becomes a segmented control with a sliding indicator (Framer Motion `layoutId`).
- Caret-on-load animation: textarea auto-focuses with a 1px primary glow that decays after 800ms.
- Placeholder rotates between 3 idea archetypes (saas / marketplace / consumer) every 6s when idle.

### B2 — `IdeaBrief` (round 1–3 results)

**Current debt**: Sprint 4 broke the card monoculture for Problem + Core Features; the other 5 sections are still uniform `border-border/30 rounded-lg p-5` cards.
**Polish**:

- Introduce a 3-tier hierarchy: **Hero** (Problem, Features) → **Tension** (Investor + Customer perspective rendered as a side-by-side dialogue, not two cards) → **Supporting** (Revenue, Industry — compact accent strip).
- The `FeatureStrengthBar` deterministic-hash percentage is faked. Either remove it or wire it to real signal from synthesis (deferred to B5).
- Replace the icon-in-circle pattern in supporting cards with a left-rule treatment (matches Hero rhythm).

### B3 — `ThunderdomePanel` (Auto-Analyze + lenses)

**Current debt**: still has decorative gradient background; "Auto-Analyze" CTA is now primary but the secondary lenses look like an orphan toolbar.
**Polish**:

- Remove the gradient; replace with a quiet 1px top accent line.
- Group secondary lenses under "Or explore one lens →" with a chevron disclosure (collapsed by default).
- Move Auto-Analyze's progress (when running) to a sticky top bar so the user can scroll the brief while it runs.

### B4 — `SynthesisPanel`

**Current debt**: per-agent realtime works (Sprint 4) but visual treatment is utilitarian — checkmark + label.
**Polish**:

- Each agent gets a 2-line living card: name + the actual one-line teaser of what they're saying ("Skeptic: 'The unit economics assume 80% retention…'").
- Confidence ring becomes a typographic centerpiece, not a small badge — show "73% confident" at H2 weight with one-line rationale below.
- Cost surfaced (deferred from Sprint 5) as a subtle footer: "$0.04 spent · 6 models queried."

### B5 — `FinalReport`

**Current debt**: Sprint 4 promoted the prompt to position 2. Now polish the prompt itself.
**Polish**:

- The Lovable Prompt block gets a **"copy with highlights" preview** — show which highlights will be appended in a small pill row above Copy.
- "Open in Lovable" button becomes primary equal to Copy (today it's tertiary).
- Add a subtle progress affordance for "Iterate on This" — it's currently a button with no preview of what state is preserved (Sprint 5 fix is silent).
- Remove `FeatureStrengthBar` if not wired to real data.

### B6 — Cross-cutting microinteractions

- Standardize all transitions to `cubic-bezier(0.22, 1, 0.36, 1)` 400-600ms (currently mixed eases).
- Add `prefers-reduced-motion` guards to `framer-motion` blocks.
- Toast positioning: confirm sonner uses `top-center` on mobile, `bottom-right` on desktop.

---

## Sequencing & Scope


| Phase             | Track      | Scope                                                      | Notes                    |
| ----------------- | ---------- | ---------------------------------------------------------- | ------------------------ |
| 6.1 (this sprint) | A          | Workspace picker + `import-project` + manifest-aware brief | Core value unlock        |
| 6.2 (this sprint) | B1, B2     | IdeaInput + IdeaBrief polish                               | Highest-traffic surfaces |
| 6.3 (next)        | A          | Round-trip "push back" CTA + Sanctuary regression case     | Closes the loop          |
| 6.4 (next)        | B3, B4, B5 | Thunderdome / Synthesis / FinalReport polish               | Depth surfaces           |
| 6.5 (next)        | B6         | Motion + a11y polish pass                                  | Final 5%                 |


### Open Questions

1. **Workspace API access from edge functions** — if the cross-project tools are agent-only, do you want me to (a) hard-code a manual paste-CSV fallback, or (b) build a one-time admin sync flow that you trigger from Portfolio?  B if possible and easily testable 
2. **Manifest cache** — re-fetch `.impeccable.md` on every import (always fresh, ~2s slower) or cache for 24h in `project_registry.manifest_cache` (faster, can drift)?  Idk what this q means
3. **Push-back format** — when sending improvements to the source project, prefer (a) a paste-ready Lovable prompt the user copies manually, or (b) deep-link with prefilled chat (if Lovable supports `?prompt=` URL param)?  Let's do Aa for now seems simpler