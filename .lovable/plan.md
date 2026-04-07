

## Plan: User Dashboard and Idea Management UX Overhaul

### The Problem

Right now, the user experience has several rough edges:

1. **Two disconnected data stores**: `simulator_captures` stores session data (linked to users), `idea_reports` stores the public report (no user link). There's no FK between them, so the "My Simulations" page can't show Thunderdome status, thesis statements, or prompt versions.

2. **My Simulations is a flat list**: It shows idea text + date + "Complete" badge. No status progression, no Thunderdome indicators, no way to see what stage an idea is at.

3. **Resume flow is fragile**: It reconstructs state into localStorage and navigates to `/simulate`, which feels like starting over. There's no sense of "returning to your workspace."

4. **The prompt section says "One-shot prompt"**: But with Thunderdome refinement, perspectives, and distillation, it's now an evolving artifact. The UI doesn't reflect that.

5. **No connection between ideas**: Expand mode generates variations, but there's no way to see the lineage or navigate between related ideas.

### Phased Approach

#### Phase A: Data Foundation (database + linking)

Add `user_id` and `report_id` columns to connect the data model:

**Migration:**
- Add `report_id UUID REFERENCES idea_reports(id)` to `simulator_captures` (nullable, for linking)
- Add `user_id UUID` to `idea_reports` (nullable, so public sharing still works)
- Add `status TEXT DEFAULT 'in-progress'` to `idea_reports` with values: `in-progress`, `brief-complete`, `thunderdome-active`, `prompt-ready`
- Add `parent_idea_id UUID REFERENCES idea_reports(id)` to `idea_reports` (nullable, for expand-mode lineage)

**SimulatorShell.tsx:**
- When creating an `idea_reports` row, also store `user_id` from the current session
- When creating/updating `simulator_captures`, store `report_id` to link them
- Update the status field as the user progresses through phases

#### Phase B: My Simulations becomes an Idea Dashboard

Replace the current flat list with a proper dashboard at `/my-simulations` (or rename to `/dashboard`):

**Layout:**
- Header with user greeting and "New Simulation" CTA
- Ideas displayed as cards with richer metadata:
  - Logo/concept image thumbnail
  - Idea name (first line or extracted product name from brief)
  - Status badge: `Analyzing` / `Brief Ready` / `Thunderdome` / `Prompt Ready`
  - Builder intent badge (experiment, venture, etc.)
  - Last modified date
  - Perspectives count (e.g., "3/5 personas consulted")
  - Thesis statement preview (if distilled)
- Sort by: Recent / Status / Intent
- Each card clicks through to `/simulate` with that idea loaded

**Empty state:** Keep current but improve copy — "Your ideas live here. Run your first simulation to get started."

#### Phase C: Resume Flow Cleanup

Instead of dumping state into localStorage and navigating:

**SimulatorShell.tsx changes:**
- Accept a `resumeId` URL parameter (e.g., `/simulate?id=abc-123`)
- When `resumeId` is present, load state from `idea_reports` + `simulator_captures` directly instead of localStorage
- Show a subtle "Resuming..." toast instead of reconstructing drafts
- The simulator becomes stateful around the report ID — all saves go to the DB, localStorage is just a crash-recovery backup

**Navigation:**
- Dashboard cards link to `/simulate?id={report_id}` 
- Direct report links (`/report/:id`) remain read-only for sharing

#### Phase D: Progressive Disclosure in FinalReport

Reorganize the post-brief experience to feel less overwhelming:

**Collapsible sections approach:**
- The brief sections grid stays as-is (it works well)
- Below the brief, show a clear "What's Next" progression instead of dumping everything:
  1. **Your Lovable Prompt** — always visible first, with "Refine with Thunderdome" teaser if not yet explored
  2. **Stress Test** (Thunderdome) — collapsed by default, expands inline. Shows a progress indicator: "0/5 perspectives · Not yet distilled"
  3. **Refined Prompt** — appears after any Thunderdome activity, showing version diff

**Prompt section rename:**
- Change "One-shot prompt" to "Your Lovable Prompt" 
- Add version indicator when multiple versions exist (v1, v2, etc.)
- Add a "Refine Prompt" button that calls `refine-prompt` after Thunderdome exploration

#### Phase E: Navbar Polish

- When logged in, change "My Simulations" to "Dashboard" in nav
- Add a subtle idea count badge (e.g., "Dashboard (4)")
- On `/simulate` page, show breadcrumb: Dashboard > [Idea Name] if resuming

### Files Modified

| File | Changes |
|---|---|
| Database migration | Add user_id/report_id/status/parent_idea_id columns |
| `src/pages/MySimulations.tsx` | Full rewrite as idea dashboard with status cards |
| `src/components/simulator/SimulatorShell.tsx` | Accept resumeId param, DB-first state loading, status tracking |
| `src/components/simulator/FinalReport.tsx` | Progressive disclosure, prompt versioning, "Refine" button |
| `src/components/Navbar.tsx` | Dashboard rename, breadcrumbs |
| `src/pages/Report.tsx` | Show Thunderdome status on shared reports (read-only) |

### What This Does NOT Change
- The Thunderdome components themselves (Perspectives, Expand, Distill) — they work, we're just wrapping them better
- The edge functions — no changes needed
- The public report sharing flow — stays the same
- The simulator flow itself (input → questions → brief → final) — unchanged

### Recommended Build Order
1. Phase A first (data foundation) — everything else depends on linked data
2. Phase C next (resume flow) — this unblocks the dashboard
3. Phase B (dashboard) — now cards can link to resumable simulations
4. Phase D (progressive disclosure) — polish the post-brief experience
5. Phase E (nav) — final touches

This is a meaningful refactor but each phase is self-contained and testable. Want me to start with Phase A, or would you like to adjust the scope?

