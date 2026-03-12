

## Plan: "This Resonates" Highlighting System

### The Idea

Add a simple, elegant way for users to mark sections and question-answers that resonate with them throughout the flow. These highlights get collected and injected into the final Lovable prompt, making it prioritize the areas the user cares about most. Same highlights also serve as entry points for deep dives.

### UX: A Single Interaction — The Star/Spark Button

**During the refinement flow (IdeaBrief.tsx):**
- Each of the 7 brief sections gets a small ✦ "This resonates" toggle button (top-right of each card)
- Clicking it highlights the card with a subtle primary glow and marks that section key as "resonated"
- One tap on, one tap off. No friction.

**During follow-up questions (FollowUpQuestions.tsx):**
- After a user selects an answer, a small "✦ This is key" chip appears next to their selection
- Clicking it marks that specific Q&A pair as resonated

**On the final report (FinalReport.tsx):**
- Sections that were previously starred show a ✦ badge
- The Lovable prompt section gets a visible callout: "Your prompt has been personalized based on 3 areas you highlighted"
- Deep dive buttons on starred sections get promoted: "Deep dive (highlighted)" with a slightly more prominent style

### Data Flow

```text
User stars "Revenue Model" in IdeaBrief (round 1)
User stars Q2 answer in FollowUpQuestions (round 1)
User stars "Industry & Competitors" in IdeaBrief (round 2)
         │
         ▼
SimulatorShell holds: highlights = Set<string>
  e.g. {"revenue_model", "q1-round1-answer", "industry_trends"}
         │
         ▼
When generating final round, buildHistory() appends:
  "USER HIGHLIGHTS (prioritize these in the Lovable prompt):
   - Revenue Model
   - Industry & Competitors"
         │
         ▼
simulate-idea edge function already reads history →
  lovable_prompt naturally emphasizes highlighted areas
         │
         ▼
FinalReport shows highlights badge + enhanced prompt
```

### Changes

**`src/components/simulator/SimulatorShell.tsx`**
- Add `highlights` state: `Set<string>` — stores keys like `"revenue_model"`, `"industry_trends"`, `"q0-round1"`
- `toggleHighlight(key: string)` function passed down to IdeaBrief and FollowUpQuestions
- `buildHistory()` appends a "USER HIGHLIGHTS" section listing highlighted section labels before sending to the edge function
- Pass `highlights` and `toggleHighlight` to IdeaBrief, FollowUpQuestions, and FinalReport
- Save highlights in the upsert to `simulator_captures` (inside the existing `rounds` JSONB — no schema change needed)

**`src/components/simulator/IdeaBrief.tsx`**
- Accept new props: `highlights: Set<string>`, `onToggleHighlight: (key: string) => void`
- Each section card gets a small sparkle toggle button (top-right corner)
- When highlighted: card border becomes `border-primary/40`, subtle glow, sparkle icon fills

**`src/components/simulator/FollowUpQuestions.tsx`**
- Accept new props: `highlights: Set<string>`, `onToggleHighlight: (key: string) => void`, `round: number` (already has round)
- After a user selects an answer option, a small "✦ Key insight" chip appears
- Clicking it calls `onToggleHighlight(`q${qIndex}-round${round}`)` 

**`src/components/simulator/FinalReport.tsx`**
- Accept new prop: `highlights: Set<string>`
- Highlighted sections show a ✦ badge next to the section label
- Deep dive buttons on highlighted sections get a subtle "recommended" treatment
- Above the Lovable prompt: if highlights exist, show "Personalized based on N areas you highlighted"

**`supabase/functions/simulate-idea/index.ts`**
- No changes needed — the highlights get injected into the `history` string that's already sent as context. The existing system prompt already says "incorporate the user's specific choices." The Lovable prompt generation will naturally prioritize highlighted areas.

### What This Does NOT Do
- No new edge function calls
- No new database columns
- No new API requests during highlighting (it's purely client-side state until the final generation)
- No complex UI — just a sparkle toggle per section

