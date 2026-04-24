# Quick Read on Portfolio Import + Sprint 6.3 Pivot

## On the import flow — agree, table it (mostly)

You're right. The current flow added clicks without removing the underlying friction. Here's the honest truth about what's possible:

**Why true one-click import is blocked:** Lovable's cross-project tools (`read_project_file`, `list_project_dir`) are **agent-scoped** — they only work when *I'm* running them in chat. They can't be called from a Supabase edge function. So a self-serve "paste ID → magic import" button is genuinely not buildable today.

**The one shortcut that works:** *Agent-mediated import.* You drop a project ID (or name) in chat, I run the cross-project tools, synthesize the manifest, and write it directly into your `project_registry.manifest_cache` via SQL. One paste, fully automated *for projects I can reach*.

That's not a product flow — it's a power-user shortcut. Worth keeping the `import-project` edge function and `manifest_cache` column we just built (they're not wasted; they're the storage layer for whichever path you take). Just **hide the broken self-serve UI** until the platform exposes a real API.

### Proposed cleanup (~15 min)

1. Hide the "Import Project" mode toggle in `IdeaInput.tsx` behind a feature flag (default off).
2. Simplify `AddProjectDialog.tsx` back to the single "Project Context" textarea — drop the "where to find your ID" helper text.
3. Keep `manifest_cache` column + `import-project` function intact for the agent-mediated path.
4. Add one chat-driven flow: when you say *"import @project:NAME"* I'll fetch + cache the manifest in one shot.

---

## Resuming the rest of Sprint 6 — the polish track

Track B is where the real wins are now. Here's what's left, in order of impact:

### B3 — `ThunderdomePanel` polish

- Kill decorative gradient; replace with quiet 1px top accent line.
- Group secondary lenses (Perspectives / Expand / Distill) under a collapsed *"Or explore one lens →"* disclosure.
- During Auto-Analyze, lift progress into a sticky top bar so the brief stays scrollable.

### B4 — `SynthesisPanel` polish

- Each agent becomes a 2-line living card: name + live one-line teaser pulled from `agent_events` payload.
- Confidence ring promoted to typographic centerpiece — `73% confident` at H2 weight, one-line rationale below.
- Add subtle cost footer: `$0.04 spent · 6 models queried`.

### B5 — `FinalReport` prompt block polish

- "Copy with highlights" preview pills row above the Copy button (shows what gets appended).
- "Open in Lovable" gets visual parity with Copy (currently tertiary).
- "Iterate on This" gets a tooltip preview of what state is preserved (Sprint 5 fix is silent).
- Remove `FeatureStrengthBar` (still rendering fake hash percentages).

### B6 — Cross-cutting motion + a11y pass

- Standardize all transitions to `cubic-bezier(0.22, 1, 0.36, 1)` 400–600ms.
- Add `prefers-reduced-motion` guards on every Framer Motion block.
- Sonner toast positioning: `top-center` mobile, `bottom-right` desktop.

### Bonus — Sprint 5 leftover

- Surface model cost & timing in `SynthesisPanel` (deferred from Sprint 5; folds naturally into B4).

---

## Sequencing


| Phase | Scope                                                 | Effort |
| ----- | ----------------------------------------------------- | ------ |
| 6.3a  | Hide broken import UI + add chat-driven shortcut path | Small  |
| 6.3b  | B3 ThunderdomePanel + B5 FinalReport prompt polish    | Medium |
| 6.3c  | B4 SynthesisPanel realtime cards + cost surfacing     | Medium |
| 6.3d  | B6 motion/a11y pass                                   | Small  |


All four fit in this session if you want to push through, or we can stop after 6.3b for a checkpoint.

### One question before I start

**Import UI:** prefer (a) hide the toggle entirely until there's a real API, or (b) leave it visible but add a "Beta — paste context manually" badge so you can still test it?  B. Add Beta badge.  Keep existing functionality mostly intact but with cleanup specs above.  We'LL come back to testing it via chat after v6 is done.