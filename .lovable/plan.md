

## Plan: Dashboard Data Fix, Admin Mode, Case Studies, and Dual-Speed AI

Four distinct workstreams addressing immediate bugs and feature requests.

### Problem 1: Dashboard Shows Empty

The root cause is clear from the data: **all 20 `idea_reports` rows have `user_id = NULL`**. The `user_id` column was added in the last migration, but no existing rows were backfilled, and the SimulatorShell code that sets `user_id` on new reports was only just added. The dashboard queries `WHERE user_id = session.user.id`, so it returns nothing.

**Fix:**
- Run a data migration (UPDATE via insert tool) to backfill `user_id` on existing `idea_reports` by matching them to `simulator_captures` via the `idea` text or email
- Specifically for bricker3@gmail.com (user_id `916a9f29-9766-4810-8198-efebe365960f`), match their `simulator_captures` emails to `idea_reports` by idea text overlap
- Also backfill `simulator_captures.user_id` where email matches known accounts
- Verify the SimulatorShell code actually sets `user_id` on new report inserts going forward

### Problem 2: Admin Account

Create an admin view so bill@courtana.com (user_id `d1153300-9217-4a10-9b43-7c5e4cd5506b`) can see ALL ideas, not just their own.

**Approach:**
- Create a `user_roles` table with the standard enum pattern (admin/moderator/user)
- Insert admin role for bill@courtana.com's user_id
- Create a `has_role` security definer function
- In `MySimulations.tsx`, check if user has admin role; if so, fetch ALL idea_reports (no user_id filter) with a visual indicator showing whose idea it is
- Add a toggle: "Show all ideas" / "Show my ideas" for admin users

### Problem 3: Case Studies Update

The ProjectShowcase already has 14 projects. The user wants to update with recent builds.

**Approach:** Since I can't browse external sites in plan mode, I'll need the user to tell me which new Lovable projects to add (URLs and descriptions), OR I can look at their other Lovable projects. For now, I'll note this as a step that needs user input on which specific new builds to add.

### Problem 4: Dual-Speed AI (Fast vs Deep Thinking)

Currently ALL edge functions use `google/gemini-2.5-pro` (slow, expensive, highest quality). The user wants:
- **Fast mode (default):** `google/gemini-3-flash-preview` for initial simulation rounds and standard Thunderdome features
- **Deep mode (opt-in):** `google/gemini-2.5-pro` for when users want higher quality, with a clear UI indicator of longer wait times

**Implementation:**

**Edge functions** (`simulate-idea`, `persona-perspective`, `expand-idea`, `distill-idea`, `refine-prompt`):
- Accept a `mode` parameter: `"fast"` (default) or `"deep"`
- Map to models: fast → `google/gemini-3-flash-preview`, deep → `google/gemini-2.5-pro`

**SimulatorShell.tsx:**
- Add a `thinkingMode` state: `"fast" | "deep"`, default `"fast"`
- Pass mode to all edge function calls
- Show a toggle in the UI — a small pill/switch near the analysis area:
  - Fast: "⚡ Quick mode" 
  - Deep: "🧠 Deep thinking" with a note like "Better answers, longer wait (~60s)"
- When in deep mode, show enhanced loading messages indicating the deeper analysis

**FollowUpQuestions / FinalReport:**
- Show which mode was used for the current analysis
- Allow switching modes at any point — the next API call uses the new mode
- "Refine with deep thinking" as an explicit CTA after seeing fast results

### Files Modified

| File | Changes |
|---|---|
| Data backfill (insert tool) | UPDATE idea_reports SET user_id where matching captures exist |
| Database migration | Create user_roles table, has_role function |
| `src/pages/MySimulations.tsx` | Admin toggle, fetch all ideas when admin |
| `supabase/functions/simulate-idea/index.ts` | Accept mode param, select model accordingly |
| `supabase/functions/persona-perspective/index.ts` | Accept mode param |
| `supabase/functions/expand-idea/index.ts` | Accept mode param |
| `supabase/functions/distill-idea/index.ts` | Accept mode param |
| `supabase/functions/refine-prompt/index.ts` | Accept mode param |
| `src/components/simulator/SimulatorShell.tsx` | thinkingMode state, toggle UI, pass to all calls |
| `src/components/simulator/FollowUpQuestions.tsx` | Show mode indicator |

### Build Order
1. Data backfill (fixes dashboard immediately)
2. Admin role setup
3. Dual-speed AI (edge functions + UI)
4. Case studies (needs user input on which new builds)

