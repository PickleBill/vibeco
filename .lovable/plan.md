

## Plan: VibeCo Layer 3 — All 5 Prompts

Five interconnected upgrades to the simulator: follow-up UX cleanup, feature drag-reorder, builder intent, scale stress test, and dynamic question depth.

### Prompt 1: Follow-Up Question UX Cleanup

**FollowUpQuestions.tsx**
- Fix `setFreeText` to preserve selected options (line 36-39): keep `prev[qIndex]?.selected` instead of clearing to `[]`
- Fix `buildFinalAnswers` (line 47-58): combine selected + freeText instead of replacing
- Fix `isSelected` check (line 146): remove `&& !hasFreeText` condition
- Update textarea placeholder and helper text copy
- Update subtitle copy for both single/multi select modes

**FinalReport.tsx**
- Add "Not quite" toggle button next to existing "This resonates" button (lines 512-524)
- New prop: `onToggleAntiHighlight`, `antiHighlights`
- Style: red/destructive for anti-highlights vs green/primary for positive

**IdeaBrief.tsx**
- Add same "Not quite" toggle alongside existing "This resonates" button
- New props: `antiHighlights`, `onToggleAntiHighlight`

**SimulatorShell.tsx**
- Add `antiHighlights` state (`Set<string>`)
- Add `toggleAntiHighlight` function (mutually exclusive with highlights)
- Update `toggleHighlight` to clear anti-highlights
- Add anti-highlights to `buildHistory` context string
- Add `antiHighlights` to draft save/restore
- Pass props to FinalReport, IdeaBrief, FollowUpQuestions

### Prompt 2: Feature Priority Drag-Reorder

**Dependencies**: Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**FinalReport.tsx**
- Import dnd-kit components and `GripVertical` icon
- Create `SortableFeature` component with drag handle
- Replace core_features rendering with `DndContext` + `SortableContext` wrapper
- Add sensors setup (PointerSensor, KeyboardSensor)
- New prop: `onReorderFeatures`

**SimulatorShell.tsx**
- Add `handleReorderFeatures` callback that updates last round's brief
- Pass to FinalReport
- Update `buildHistory` to include priority numbering in features

### Prompt 3: Builder Intent Question

**simulate-idea/index.ts**
- Add `builder_intent` to brief schema properties (experiment/community/lead-magnet/lifestyle/venture/fun)
- Add to required array
- Add rule 10 to initial round prompt about inferring intent
- Add rule 6 to refinement prompt about tone adaptation
- Add rule 9 to final round LOVABLE PROMPT ENGINEERING RULES about matching complexity to intent

**SimulatorShell.tsx**
- Add `builder_intent?: string` to `BriefData` interface

**IdeaBrief.tsx**
- Display intent badge above the brief when `brief.builder_intent` exists

### Prompt 4: Scale Stress Test

**simulate-idea/index.ts**
- Add `scale_assessment` object to brief schema (current_scale enum, fits_intent boolean, recommendation string) — NOT in required array
- Add rule 11 to initial prompt, rule 7 to refinement prompt

**SimulatorShell.tsx**
- Add `scale_assessment?` to `BriefData` interface

**IdeaBrief.tsx**
- Display scale assessment callout card when present (green for match, amber for mismatch)

### Prompt 5: Dynamic Question Depth + App Type Questions

**simulate-idea/index.ts**
- Add `depth_recommendation` top-level property to analysisToolSchema (enum: "ready" | "one-more-recommended")
- Add rule 12 to initial prompt, rule 8 to refinement prompt
- Update follow-up question instructions to allow app type and visual direction questions when ambiguous

**FollowUpQuestions.tsx**
- Add `depthRecommendation?: string` prop
- Update top CTA copy to reflect whether AI recommends generating now vs answering more

**SimulatorShell.tsx**
- Store `depthRecommendation` from API response
- Pass to FollowUpQuestions

### Files Modified

| File | Changes |
|---|---|
| `supabase/functions/simulate-idea/index.ts` | builder_intent, scale_assessment, depth_recommendation in schema; rules 6-12 in prompts |
| `src/components/simulator/SimulatorShell.tsx` | BriefData interface updates, antiHighlights state, reorder handler, depth recommendation state, draft save/restore |
| `src/components/simulator/FollowUpQuestions.tsx` | Free text + selection coexistence, updated copy, depthRecommendation prop |
| `src/components/simulator/FinalReport.tsx` | Anti-highlight toggles, drag-reorder features, new props |
| `src/components/simulator/IdeaBrief.tsx` | Anti-highlight toggles, intent badge, scale assessment card |
| `package.json` | Add @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities |

### Deployment
- Deploy updated edge function after schema changes
- All frontend changes are client-side only

