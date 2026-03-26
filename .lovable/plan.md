

## Plan: VibeCo Thunderdome — Phase 2 Feature Suite

A major post-brief experience adding persona perspectives, idea expansion/distillation, and prompt refinement. The user's spec is truncated (Prompt 4 code is cut off, Prompts 5-7 are missing), so this plan covers Prompts 1-4 fully and stubs the remaining tabs for future prompts.

### Important Note
The spec message is truncated mid-way through Prompt 4's `ExpandContractPanel.tsx` code, and Prompts 5-7 (LivingBrief, Workspace, Multi-Prompt) are not included. This plan implements Prompts 1-4 completely and leaves clean extension points for the rest.

### Step 1: Database Schema Updates

**Migration SQL:**
- Create `idea_perspectives` table with columns: id, report_id (FK to idea_reports), persona (text with CHECK constraint), perspective, challenge_questions (JSONB), user_responses (JSONB), created_at, UNIQUE(report_id, persona)
- Enable RLS with permissive SELECT/INSERT/UPDATE policies for anon+authenticated
- Add 5 columns to `idea_reports`: `thunderdome_unlocked` (boolean, default false), `thesis_statement` (text), `prompt_versions` (JSONB, default []), `annotations` (JSONB, default []), `expanded_ideas` (JSONB, default [])

### Step 2: Create 4 Edge Functions

All use `google/gemini-2.5-pro` via Lovable AI gateway with tool calling for structured output.

| Function | Purpose | Input | Output |
|---|---|---|---|
| `persona-perspective` | Generate one of 5 persona takes (skeptic, champion, competitor, customer, builder) | persona, brief, idea, builder_intent | perspective (markdown), challenge_questions, headline |
| `expand-idea` | Generate 3 orthogonal idea variations | brief, idea | core_insight, 3 expansions with idea_text |
| `distill-idea` | Force idea to core thesis | brief, idea, highlights, antiHighlights | one_feature, one_customer, one_revenue, thesis_statement, what_to_cut, mvp_scope |
| `refine-prompt` | Regenerate lovable_prompt with Thunderdome context | brief, idea, original_prompt, perspectives, distillation, annotations, highlights | refined lovable_prompt, version_label, changes list |

Deploy all 4 after creation.

### Step 3: Create PerspectivesPanel Component

New file: `src/components/simulator/PerspectivesPanel.tsx`
- 5 persona cards (Skeptic/red, Champion/green, Competitor/amber, Customer/pink, Builder/blue)
- Click to generate and display that persona's perspective via edge function
- Shows loading state, markdown-rendered perspective, challenge questions
- Saves to `idea_perspectives` table when reportId exists
- Green dot indicator on already-generated personas

### Step 4: Create ExpandContractPanel Component

New file: `src/components/simulator/ExpandContractPanel.tsx`
- **Expand mode**: Calls `expand-idea`, displays core_insight + 3 variation cards with title, pitch, potential badge, and "Explore this variation" button that navigates to /simulate with pre-filled idea
- **Distill mode**: Calls `distill-idea`, displays thesis statement prominently, one_feature/one_customer/one_revenue cards, what_to_cut list with strikethrough, and MVP scope
- Both modes have generate button + loading state + result display

### Step 5: Create ThunderdomePanel Container

New file: `src/components/simulator/ThunderdomePanel.tsx`
- Tab navigation: Perspectives | Expand | Distill
- Wraps PerspectivesPanel and ExpandContractPanel
- Header with lightning bolt icon and "The Thunderdome" title
- Receives brief, idea, reportId, highlights, antiHighlights as props

### Step 6: Integrate into FinalReport

**Modified file: `src/components/simulator/FinalReport.tsx`**
- Import ThunderdomePanel
- Insert it between the brief sections grid (line ~769) and the Lovable prompt section (line ~772)
- Only renders when `showPrompt` is true (email unlocked)
- Pass brief, idea, reportId, highlights, antiHighlights

### Files Summary

| File | Action |
|---|---|
| Database migration | New table + alter existing |
| `supabase/functions/persona-perspective/index.ts` | Create |
| `supabase/functions/expand-idea/index.ts` | Create |
| `supabase/functions/distill-idea/index.ts` | Create |
| `supabase/functions/refine-prompt/index.ts` | Create |
| `src/components/simulator/PerspectivesPanel.tsx` | Create |
| `src/components/simulator/ExpandContractPanel.tsx` | Create |
| `src/components/simulator/ThunderdomePanel.tsx` | Create |
| `src/components/simulator/FinalReport.tsx` | Modify (add ThunderdomePanel) |

### What's Deferred (Prompts 5-7)
- LivingBrief interactive markup layer
- IdeaWorkspace persistent dashboard page
- Multi-prompt generation with version history
- These will build on the infrastructure created here

