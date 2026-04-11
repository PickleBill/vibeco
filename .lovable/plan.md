

## VibeCo Ecosystem Strategy: From Simulator to Flywheel

### What You're Asking (Distilled)

You have 65+ Lovable projects spanning Courtana/pickleball, VibeCo, personal experiments, and client work. You want:
1. A way to **feed existing Lovable projects INTO the simulator** for analysis
2. A **global workspace** organized by category (partners, internal dev, future dev, fun)
3. A **flywheel loop** where VibeCo's simulator becomes your own product development tool
4. Focus on **Courtana Pulse** (Pickle DaaS Explorer) as the priority build
5. Better **knowledge portability** (like Impeccable Style) across projects

### Answers to Your Direct Questions

**"Why can't I see all 35+ projects when I type @?"** — The @ mention dropdown currently caps at a limited set. This is a Lovable platform limitation, not something we can fix in your project code. You can work around it by typing more of the project name to filter.

**"Can I upload a Lovable project into Simulate?"** — Yes, and this is a genuinely good idea. Not the full codebase, but a **project manifest** — the knowledge files, component tree, route structure, and description. The simulator already takes free-text ideas; we'd add a "Import from Lovable" input mode that pulls project context via the cross-project tools and formats it as a structured brief for the AI.

**"Should I have a global workspace organized by category?"** — Absolutely. Your 65 projects break down into clear clusters. We can build this as a **Portfolio Command Center** right here in VibeCo.

---

### The Flywheel Architecture

```text
┌─────────────────────────────────────────────────┐
│                 VibeCo Hub                       │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐ │
│  │ Portfolio  │  │ Simulator │  │  Action Hub  │ │
│  │ Command    │→ │ (Analyze  │→ │ (Build/Fork/ │ │
│  │ Center     │  │  /Expand/ │  │  Route/Ship) │ │
│  │            │  │  Distill) │  │              │ │
│  └─────┬─────┘  └─────┬─────┘  └──────┬──────┘ │
│        │              │               │         │
│        └──────────────┼───────────────┘         │
│                       ▼                         │
│              Lovable Projects                   │
│         (65+ apps in workspace)                 │
└─────────────────────────────────────────────────┘
```

---

### Plan: Two Focused Builds

#### Build 1: Portfolio Command Center (`/portfolio`)

A new page in VibeCo that organizes ALL your projects into a strategic dashboard.

**Data Model**: New `project_registry` table:
- `id`, `user_id`, `lovable_project_id`, `name`, `description`
- `category` enum: `partner`, `internal_dev`, `future_dev`, `fun`, `client`, `experiment`
- `status` enum: `active`, `paused`, `shipped`, `archived`
- `parent_brand` (e.g., "Courtana", "VibeCo", "Personal")
- `report_id` (links to simulator analysis if one exists)
- `notes`, `priority`, `last_touched`

**Features**:
- Filterable grid by category, brand, and status
- Quick-action to "Analyze in Simulator" (pre-fills the simulator with project context)
- Link simulator reports back to projects (bidirectional)
- Drag-and-drop priority ordering within categories

**Your Courtana cluster would look like**:
- **Partner**: Venue Launchpad, CONCORD, Courtana Venue
- **Internal Dev**: Pickle DaaS Explorer (Courtana Pulse), CourtSense AI, courtana-live
- **Future Dev**: Courtana Coach Pro, courtana-match-replay-hub
- **Fun/Experiment**: shotgenius, pickleprime, picklerickroll, WallBall Connect

#### Build 2: "Import Project" Mode for the Simulator

Add a second input mode to the IdeaInput component:

**How it works**:
1. User clicks "Import from Project" toggle
2. Selects a project from a searchable dropdown of their registered projects
3. System pulls the project's description, route structure, and key components
4. Formats this into a structured idea brief automatically
5. Simulator runs its full analysis on the **existing project** — identifying gaps, expansion opportunities, and distillation targets

This turns the simulator from "analyze hypothetical ideas" into "stress-test and evolve real projects."

---

### Knowledge Portability (Impeccable Style + More)

The generated file at `/mnt/documents/impeccable-style-v2.1-complete.md` is the right artifact, but the right **delivery mechanism** is:

1. **Project Knowledge settings**: For each new Lovable project, paste the core principles into Settings > Knowledge. This is the fastest path.
2. **Root-level SKILL files**: For projects where you need the full framework, copy the individual `.md` files to the project root (use `@VibeCo Labs` cross-project reference to pull them).
3. **Template project**: Create a "Courtana Starter" template with all SKILL files pre-loaded. Remix it for every new Courtana build.

**Recommendation**: Create a dedicated **"Courtana Design System"** knowledge file that combines Impeccable Style with Courtana-specific brand tokens (colors, fonts, component patterns from Pickle DaaS Explorer). This becomes your standard for all Courtana projects.

---

### Courtana Pulse Focus

For the immediate priority — [Pickle DaaS Explorer](/projects/e56b8988-ae4f-48fb-a2dc-6d081b70fb6f) (Courtana Pulse):

The simulator can generate a fresh analysis of where Courtana Pulse stands today. We'd:
1. Register it in the Portfolio Command Center as `internal_dev` / `Courtana` brand
2. Run it through the simulator's Expand + Distill cycle
3. Use the resulting Lovable Prompt as the next iteration spec

This creates the flywheel: **Build → Simulate → Expand/Distill → Build again**.

---

### Files Changed

| File | Action |
|---|---|
| `src/pages/Portfolio.tsx` | Create — Command Center dashboard |
| `src/components/portfolio/ProjectCard.tsx` | Create — project cards with category badges |
| `src/components/portfolio/CategoryFilter.tsx` | Create — filter/sort controls |
| `src/components/simulator/IdeaInput.tsx` | Modify — add "Import from Project" toggle |
| `src/components/simulator/ProjectImporter.tsx` | Create — project selector + context extractor |
| `src/App.tsx` | Modify — add `/portfolio` route |
| Migration | Create `project_registry` table with RLS |

### Sequencing

1. Database migration for `project_registry`
2. Portfolio Command Center page (register + categorize projects)
3. Simulator "Import Project" mode
4. Bidirectional linking (reports ↔ projects)

