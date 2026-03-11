

## AI Idea Simulator — Build Plan

### What We're Building

A full-page interactive experience at `/simulate` where a user types their idea, an AI generates a structured brief, then guides them through a progressive "choose your own adventure" refinement flow. Each round deepens the analysis until a final consolidated report is generated — gated behind an email capture.

### User Journey

```text
1. LANDING → Big textarea: "Describe your wildest idea"
   ↓
2. INITIAL BRIEF → AI generates structured report:
   - Problem / Opportunity
   - Target Customer
   - Core Features (3-5)
   - Revenue Model
   - Industry Trends / Competitors
   - What Investors Would Ask
   - What Customers Would Say
   ↓
3. FOLLOW-UP ROUND 1 → AI asks 3-4 multiple-choice questions
   based on the specific idea (e.g. "Who's your first customer?",
   "What's your distribution edge?"). User picks one or more +
   optional free-text.
   ↓
4. UPDATED BRIEF → Report updates with deeper analysis based
   on their answers. Another round of questions.
   ↓
5. ROUND 2-3 → Same loop. Questions get more specific and
   strategic. Each round the brief gets richer.
   ↓
6. FINAL REPORT → Consolidated "Breakout Idea Summary" with
   all sections refined. CTA: "Enter your email to get the
   full report" or "Talk to us about building this."
```

### Architecture

**Backend: Lovable Cloud Edge Function** (`supabase/functions/simulate-idea/index.ts`)
- Uses Lovable AI gateway (`google/gemini-3-flash-preview`)
- Two modes via a `type` field in the request body:
  - `"initial"` — takes raw idea text, returns structured brief + first set of follow-up questions via tool calling
  - `"refine"` — takes conversation history + user's selected answers, returns updated brief + next questions (or final summary if round >= 3)
- Uses **tool calling** to extract structured JSON (brief sections, questions with multiple-choice options, final report flag)
- Non-streaming for structured output (we need the full JSON to render the interactive UI)

**Frontend: New components**
- `src/pages/Simulate.tsx` — the page route
- `src/components/simulator/IdeaInput.tsx` — initial idea textarea with animated submit
- `src/components/simulator/IdeaBrief.tsx` — renders the structured brief as polished cards with staggered Framer Motion reveals
- `src/components/simulator/FollowUpQuestions.tsx` — renders multiple-choice questions as selectable chips/cards, with optional free-text per question
- `src/components/simulator/FinalReport.tsx` — consolidated summary with email gate CTA
- `src/components/simulator/SimulatorShell.tsx` — orchestrates the progressive flow, manages state (rounds, history, current brief)

**Routing:** Add `/simulate` route in `App.tsx`

### UI/UX Design

- Dark theme consistent with existing site
- Each brief section rendered as a glassmorphic card with icon headers
- Questions rendered as selectable pill buttons with glow on selection
- Progressive animation: brief sections fade-up one by one, questions slide in after brief is fully rendered
- Loading state: animated "thinking" visualization (reuse the glow orb concept from Hero)
- Round indicator: subtle step dots showing progress through rounds
- Final report has a polished "summary card" feel with a glowing border

### Edge Function Tool Schema

The tool calling extracts:
```text
{
  brief: {
    problem, target_customer, core_features[],
    revenue_model, industry_trends, investor_perspective,
    customer_perspective
  },
  follow_up_questions: [
    { question, options: [{ label, description }], allow_multiple }
  ],
  is_final: boolean
}
```

### Files to Create/Modify

| File | Action |
|---|---|
| `supabase/functions/simulate-idea/index.ts` | Create — edge function with Lovable AI |
| `supabase/config.toml` | Create — register function, verify_jwt = false |
| `src/pages/Simulate.tsx` | Create — simulator page |
| `src/components/simulator/SimulatorShell.tsx` | Create — flow orchestrator |
| `src/components/simulator/IdeaInput.tsx` | Create — idea textarea |
| `src/components/simulator/IdeaBrief.tsx` | Create — brief renderer |
| `src/components/simulator/FollowUpQuestions.tsx` | Create — question cards |
| `src/components/simulator/FinalReport.tsx` | Create — final report + email gate |
| `src/App.tsx` | Modify — add `/simulate` route |
| `src/components/Hero.tsx` | Modify — add "Simulate Your Idea" CTA button linking to `/simulate` |
| `src/components/Navbar.tsx` | Modify — add Simulator nav link |

### Key Decisions

- **Non-streaming** for structured output (need full JSON for interactive UI rendering)
- **3 rounds max** — initial brief → 2 refinement rounds → final consolidated report
- **No database** initially — stateless, all conversation state in React state
- **Email gate only on final report** — low friction until they're invested
- **Tool calling** for reliable structured extraction from AI

