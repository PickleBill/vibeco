

## Plan: Report UX Overhaul — Readability, Highlights, Email Flow, Share Fix

### Summary

Five changes: improve global readability, kill "Build in Lovable" button, fix share/PDF buttons, restructure the email unlock to sit at the top of the final report (showing real content below), and add clickable section-level "This resonates" toggles on the final report that append selected sections to the prompt for easy copy.

### 1. Readability Improvements

**`src/index.css`:**
- Increase `--foreground` lightness from 88.6% → 93% (near-white for body text)
- Increase `--muted-foreground` from 55% → 65% (secondary text readable)
- Body font-size base bump: add `font-size: 15px` to body

**`src/components/simulator/FinalReport.tsx`:**
- Section body text: `text-sm text-foreground/80` → `text-base text-foreground/90`
- Deep dive text: `text-xs text-foreground/70` → `text-sm text-foreground/80`
- Prompt preview: `text-[11px]` → `text-sm`
- Various `text-[10px]` labels → `text-xs`
- Same readability pass on `text-[8px]` and `text-[9px]` elements → minimum `text-[10px]`

**`src/pages/Report.tsx`:** Same readability adjustments as FinalReport.

### 2. Remove "Build in Lovable" Button

- **FinalReport.tsx**: Remove the `Build My Site in Lovable` button (lines 733-746) and `ExternalLink` import
- **Report.tsx**: Remove the same button (lines 197-210) and related imports

### 3. Restructure Email Unlock — Email at Top, Real Report Below

Current flow: teaser → email → full report. New flow: email banner at top → real report sections visible below (no blur/teaser). The email captures the lead while the user reads, rather than gating the content.

**FinalReport.tsx:**
- Remove the entire teaser block (lines 407-495 — the blurred image, locked overlay, fake preview)
- Always show the full report content (the current `showReport` branch)
- Add an email capture banner at the very top of the report (above the sections), styled as a slim callout: "Save your report & get the prompt" with email input + button
- Once submitted, the banner collapses and the Lovable Prompt section + share/PDF buttons become visible
- `showReport` state now controls prompt visibility, not report visibility

### 4. Fix Share Link + Keep PDF

The share button works but depends on `reportId` which only gets set after email unlock + DB insert. With the new flow:
- Insert into `idea_reports` happens when the final phase is reached (in `callSimulator` when `is_final: true`) — this already exists
- If `reportId` is null at share time (e.g. the insert hadn't completed), show a loading state
- Share button copies `${origin}/report/${reportId}` — keep as-is
- PDF download button — keep as-is, ensure it's always visible

**Button layout after email unlock:**
- "Share Report" (copies link) — secondary style
- "Download PDF" — secondary style  
- "Simulate Another Idea" + "Back to Home" — tertiary

### 5. "This Resonates" on Final Report Sections → Append to Prompt

Currently highlights only show as passive badges on the final report. Make them interactive:

**FinalReport.tsx:**
- Accept `onToggleHighlight` prop (already passed from SimulatorShell? No — need to add)
- Each section gets the same sparkle toggle button as IdeaBrief
- Below the prompt, add a "Highlighted sections" summary that lists the highlighted section text snippets
- Add a "Copy prompt + highlights" button that concatenates the lovable prompt with a footer section listing the user's highlighted areas and their full text, so they can paste everything into Lovable at once

**SimulatorShell.tsx:**
- Pass `onToggleHighlight={toggleHighlight}` to `FinalReport`

### Files Modified

| File | Change |
|---|---|
| `src/index.css` | Increase foreground/muted lightness, body font-size |
| `src/components/simulator/FinalReport.tsx` | Remove "Build in Lovable", restructure email to top banner, add highlight toggles on sections, improve text sizes, enhanced copy with highlights |
| `src/components/simulator/SimulatorShell.tsx` | Pass `onToggleHighlight` to FinalReport |
| `src/pages/Report.tsx` | Remove "Build in Lovable" button, improve text readability |

