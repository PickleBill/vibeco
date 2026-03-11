

## Plan: SpeedTimeline Overhaul, Simulator Flow Fix, Progressive Email Unlock, PDF Polish

### 1. SpeedTimeline — Dual Curves + Custom Thumb

**Current problem**: Single "time to launch" curve, unstyled native range thumb.

**Changes to `SpeedTimeline.tsx`**:
- **Custom thumb styling**: Add CSS for `input[type=range]::-webkit-slider-thumb` and `::-moz-range-slider-thumb` with primary color, rounded, shadow, hover scale effect
- **Replace single curve with three data layers**:
  1. **Cost bars** (red/destructive tone) — bar chart that drops dramatically era-by-era. Tall bars on the left (millions), tiny on the right ($0). Renders as SVG `<rect>` elements
  2. **Time to market line** (muted/secondary) — the existing inverse exponential curve, slightly subdued
  3. **Market opportunity / revenue potential line** (primary/green, bold) — an *ascending* exponential curve that dominates visually, going up and to the right. This is the hero takeaway: "the opportunity is exploding"
- **Y-axis labels**: Left side "Cost ↓" in red, Right side "Opportunity ↑" in green/primary
- **Legend**: Small inline legend below the chart showing the three series
- Era data gets numeric values for all three metrics to drive the visuals

### 2. Simulator Flow — Fix Skipping to Final

**Root cause**: Two bugs working together:
1. **Race condition**: `handleIdeaSubmit` calls `setIdea(text)` then immediately `callSimulator("initial")`, but React state hasn't flushed yet — `idea` is still `""` when the edge function is called
2. **Edge function**: The AI model sets `is_final: true` on its own even for initial rounds. The function doesn't enforce `is_final: false` for round 1

**Fixes**:
- **`SimulatorShell.tsx`**: Pass `text` directly to `callSimulator` instead of reading stale `idea` state. Change `callSimulator` signature to accept idea text for initial calls
- **`simulate-idea/index.ts`**: After parsing the AI response, **force** `is_final = false` if `type === "initial"` or `round < 3`. Only allow `is_final = true` on round 3+. This prevents the AI from short-circuiting the flow

### 3. Progressive Email Unlock Throughout Flow

**Concept**: Let users unlock the full report at any point after round 1, with increasing urgency/visual appeal as they progress.

**Changes to `SimulatorShell.tsx`**:
- Add `unlocked` and `email` state at the shell level
- Pass `unlocked`, `email`, `onUnlock` callback down to `FollowUpQuestions` and `IdeaBrief`

**New `EmailUnlockBanner` component** (inline in SimulatorShell or separate small file):
- Compact banner shown below the brief in rounds 1-2: "Enter your email to save your report and unlock the full analysis"
- **Progressive intensity**: Round 1 = subtle, small text link. Round 2 = more prominent card with teaser scores. Round 3/final = full blurred preview strip (existing FinalReport gate)
- Once email is entered at any point, mark `unlocked = true` and skip the gate on the final report
- Save to `simulator_captures` on unlock regardless of which round they're on

**Changes to `FinalReport.tsx`**:
- Accept `unlocked` prop — if already unlocked, skip straight to the full report
- Clean up the ref warning by ensuring proper component structure

### 4. Final Report — Relevant & Customized Content

**Edge function fix** (`simulate-idea/index.ts`):
- Strengthen the final round prompt: explicitly instruct the AI to synthesize ALL previous rounds' answers into the final brief, referencing specific choices by name
- Add instruction: "Your final brief must be dramatically different from Round 1. Every section must reflect the cumulative refinements."

### 5. PDF Export — Clean, Visual, Multi-Page

**Changes to `FinalReport.tsx` PDF generation**:
- Replace `html2canvas` screenshot approach with a **structured jsPDF build** that creates a properly formatted multi-page document:
  - Page 1: Cover page with VibeCo branding, idea title, date, viability scores as colored circles
  - Page 2: Problem + Target Customer + Concept image
  - Page 3: Core Features with strength bars (drawn as PDF rectangles)
  - Page 4: Revenue Model + Industry & Competitors
  - Page 5: Investor Perspective + Customer Perspective
  - Page 6: Round-by-round summary of questions answered and how the analysis evolved
- Use jsPDF's built-in text wrapping and drawing APIs — no html2canvas dependency needed (remove it)
- Add VibeCo header/footer to each page with page numbers

### Files Modified/Created

| File | Change |
|---|---|
| `src/components/SpeedTimeline.tsx` | Dual curves, cost bars, custom thumb CSS |
| `src/components/simulator/SimulatorShell.tsx` | Fix race condition, add email unlock state, pass props |
| `src/components/simulator/FinalReport.tsx` | Accept `unlocked` prop, structured PDF export, ref fix |
| `src/components/simulator/IdeaBrief.tsx` | Add subtle email unlock banner for rounds 1-2 |
| `supabase/functions/simulate-idea/index.ts` | Force `is_final` logic, strengthen final round prompt |
| `src/index.css` | Add range thumb custom styles |

### Technical Notes
- The race condition fix is critical — passing `text` param directly avoids stale closure
- PDF uses jsPDF drawing APIs directly (addText, rect, addImage) for pixel-perfect control
- Progressive email unlock stores state at shell level so it persists across rounds
- Edge function change is server-side enforcement — AI can't skip rounds anymore

