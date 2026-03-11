

## Plan: Progressive Simulator Flow with Optional Questions, Early Report Generation & Bold Navbar CTA

### Core Changes

**1. Questions become fully optional with "Generate Report Now" at every step**

Currently questions are mandatory (all must be answered to proceed). We'll change this:

- Remove the `allAnswered` gate entirely from `FollowUpQuestions.tsx`
- Add a prominent **"Generate My Report →"** button that's always enabled, regardless of whether any questions are answered
- Keep the question cards but label them clearly as "Optional — help us refine your analysis"
- When user types free text into a question, that becomes the answer (replacing any option selection for that question)
- Free text input gets upgraded from a tiny input to a proper textarea with placeholder like "Write your own answer..."
- Reduce to **2 questions on round 1, 3 on round 2** — this means updating the edge function prompt to request fewer questions in the initial round

**2. SimulatorShell: Always generate lovable_prompt + force final on skip**

- Add a new `handleSkipToFinal` callback passed to `FollowUpQuestions` — this calls `callSimulator("refine", ..., 3)` forcing the final round regardless of current round
- Partial answers (whatever the user filled in, even nothing) get saved to the current round before triggering final generation
- The edge function already handles `round >= 3` as final, so passing `round: 3` forces lovable_prompt generation and `is_final: true`
- Auto-save continues to capture data at every state change

**3. Edge function: Support 2 questions on round 1**

- Update `simulate-idea/index.ts` system prompt for `type === "initial"` to request "2 strategic follow-up questions" instead of "3-4"
- Update the refine prompt (non-final) to request "3 follow-up questions"
- Add instruction: "Generate lovable_prompt even on early final requests" — already handled since `round >= 3` triggers it

**4. Navbar: Much bolder Simulator CTA**

- Replace the small pill with a **full solid button** — `bg-primary text-primary-foreground` with larger text, padding, glow animation
- Text: "Simulate Your Idea" with Sparkles icon
- Make it significantly larger than other nav items (px-5 py-2.5, text-sm font-bold)
- Mobile: same treatment — bold full-width CTA at top of mobile menu

**5. FollowUpQuestions UX overhaul**

- Header becomes: "Refine your analysis (optional)" with subtitle "Answer any questions below, or skip straight to your report"
- Remove the progress bar (no longer meaningful when optional)
- Two buttons at the bottom:
  - Secondary: **"Refine My Brief →"** (only enabled if at least 1 question answered)
  - Primary/glowing: **"Generate Report Now ✨"** (always enabled)
- Free text input: upgrade to `textarea` with 2 rows, more prominent styling, placeholder "Type your own answer..."
- When free text is entered and no option selected, the free text IS the answer

### Files Modified

| File | Change |
|---|---|
| `src/components/simulator/FollowUpQuestions.tsx` | Remove mandatory gate, add "Generate Report Now" button, optional labels, bigger free text, remove progress bar |
| `src/components/simulator/SimulatorShell.tsx` | Add `handleSkipToFinal` that forces round=3, pass as prop to FollowUpQuestions |
| `supabase/functions/simulate-idea/index.ts` | Initial round: 2 questions. Refine round: 3 questions. Prompt tweaks. |
| `src/components/Navbar.tsx` | Bold solid CTA button replacing small pill, larger text + glow |

