## Plan: SpeedTimeline Fix, Persistent Download, Lovable Prompt Generator

### 1. SpeedTimeline — Fix Left Cutoff & Normalize Cost Bars

**Problem**: First cost bar is cut off on the left because bar X position starts at `chartPadding.left + 0` minus half the bar width (negative). Cost values go from 100 down to 3 — the first bar dwarfs the rest, making the decline invisible.

**Fixes in `SpeedTimeline.tsx**`:

- Add `chartPadding.left = 30` to prevent left cutoff
- **Normalize cost bars** so they're visually readable (not to literal scale). Instead of using raw `costValue` directly, compress the range so even the lower bars are visible. Use a logarithmic or clamped scale: e.g. map `[100, 70, 45, 20, 3]` → `[100, 75, 55, 35, 12]` so the declining slope is clear and the last two eras still show visible red bars
- Ensure bar X positions don't go negative — distribute bars evenly within the padded chart area

### 2. Persistent Download After Email Unlock

**Problem**: If user enters email during rounds 1-2, the download button only appears on the final report page. It should be available throughout the session once unlocked.

**Fixes in `SimulatorShell.tsx**`:

- Add a persistent floating "Download PDF" button that appears once `unlocked === true`, visible in both `brief` and `final` phases
- The button calls `generateStructuredPDF` with the latest round's brief data

**Fixes in `FinalReport.tsx**`:

- Export `generateStructuredPDF` so it can be called from the shell
- When `unlocked` is true, skip the email gate and show the report + download immediately

### 3. Lovable Prompt Generator — New Output

**Concept**: After the final report, generate a polished, copy-pasteable Lovable prompt that could one-shot create a landing page for the user's idea. This is a proof-of-concept — user copies the prompt manually for now but only going to be temporary and should be very subtle.  ie I can find it but not the main draw of the user attention if that makes sense. They should be focused on the downloadable output and the rest of UX.   Importantly for this prompt generator and all of the rest of the day intake as well at the store down in a database that is accessible.... be honest even if user doesn't enter email or session gets lost we should still save it down into table or wherever we're storing it as an unknown username or something.

**Implementation**:

- **Edge function update** (`simulate-idea/index.ts`): Add a new field `lovable_prompt` to the tool schema for the final round only. The prompt instructs the AI to generate a comprehensive, ready-to-paste Lovable prompt that describes the product, its features, target audience, and visual direction — essentially a creative brief for building a landing page
- **Add to `SimulatorShell` types**: Extend `BriefData` (or add a sibling field on the response) with `lovable_prompt?: string`
- **FinalReport UI**: Add a "Copy Lovable Prompt" section at the bottom of the unlocked report — a styled code block with a copy button. Label: "One-shot prompt — paste this into Lovable to build your landing page"
- **PDF**: Include the prompt as the last page of the PDF export

### Files Modified


| File                                          | Change                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `src/components/SpeedTimeline.tsx`            | Add left padding, normalize cost bar heights                             |
| `src/components/simulator/SimulatorShell.tsx` | Persistent download button when unlocked                                 |
| `src/components/simulator/FinalReport.tsx`    | Export PDF function, skip gate when unlocked, add Lovable prompt section |
| `supabase/functions/simulate-idea/index.ts`   | Add `lovable_prompt` field to final round tool schema                    |
