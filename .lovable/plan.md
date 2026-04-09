## Simulator Flow Redesign — Progress

### ✅ Sprint A: Complete
- **ActionHub** (`src/components/simulator/ActionHub.tsx`) — post-report "What's Next?" panel with 5 contextual actions:
  - Build in Lovable (copy prompt)
  - Research Prompt (ChatGPT/Claude via `generate-alt-prompt` edge function)
  - Design Brief (Impeccable-style UI spec)
  - Landing Page Test (validation-focused prompt)
  - Iterate on This (re-enter simulator with context)
- **IdeaInput** redesigned — stage-style textarea, fluid heading, cleaner metadata, removed banned patterns
- **FinalReport** integrated — ActionHub replaces dead-end "Simulate Another Idea" buttons
- **PerspectivesPanel** — added response fields for challenge questions with save functionality
- **ExpandContractPanel** — "Explore this variation" now forks with full context (parent brief, highlights, anti-highlights); Distill mode has "Rebuild with this scope" button
- **Database** — added `forked_context` and `alt_prompts` columns to `idea_reports`
- **Edge function** — `generate-alt-prompt` deployed (research, design brief, landing page prompts)

### 🔲 Sprint B: Iteration Loop Polish
- Wire `forkedFrom` badge in SimulatorShell when resuming forked ideas
- "Re-analyze with your answers" button in PerspectivesPanel (feeds responses back to simulator)

### 🔲 Sprint C: Dashboard Upgrade
- Idea lineage tree in MySimulations
- Side-by-side comparison
- Quick actions on cards
- Progress indicators

### 🔲 Sprint D: Ecosystem Routing
- NextStepsRouter component
- Partner directory concept
- Platform-appropriate routing based on scale assessment

### 🔲 Sprint E: Full Bolder Pass
- Visual differentiation across simulator sections
- Break card-grid monoculture in FinalReport
- Distinct Deep Dive mode visual treatment
