

## Fix All Three P0 Issues

### P0-1: Cancel Button During Analysis

Add an `AbortController` to the `callSimulator` function so the API call can be cancelled. Show a "Cancel" button below the analyzing spinner. On cancel, abort the fetch, reset phase to previous state (input if round 0, brief if mid-flow), and show a toast confirming cancellation.

**Changes in `SimulatorShell.tsx`:**
- Add `abortControllerRef = useRef<AbortController | null>(null)` 
- Pass `AbortController.signal` into the `supabase.functions.invoke` call
- Add `handleCancelAnalysis()` that calls `abortControllerRef.current?.abort()`, resets phase, shows toast
- In the `phase === "analyzing"` render block, add a cancel button below the time estimate text

### P0-2: Restart Confirmation Dialog

Replace the direct `handleRestart` call with an `AlertDialog` confirmation. "Start over? This will clear your entire session." with Cancel / Confirm buttons.

**Changes in `SimulatorShell.tsx`:**
- Import `AlertDialog` components
- Add `showRestartConfirm` state
- Wrap the restart trigger (in `FinalReport` or wherever it's called) to set `showRestartConfirm = true`
- Render `AlertDialog` at the bottom of the component

### P0-3: Visible Input Validation Feedback

Show a real-time validation hint when the user has typed something but hasn't hit the 10-character minimum. The char count turns red/amber with a message like "At least 10 characters needed" that disappears once they cross the threshold.

**Changes in `IdeaInput.tsx`:**
- Add a `showHint` condition: `text.length > 0 && text.trim().length < 10`
- Render a small red/amber hint below the textarea or next to the char count
- Char count text gets `text-destructive` class when under minimum
- On failed Enter press, briefly shake the textarea (framer-motion `x` keyframes)

### Files

| File | Action |
|---|---|
| `src/components/simulator/SimulatorShell.tsx` | Modify — add cancel button, restart confirmation |
| `src/components/simulator/IdeaInput.tsx` | Modify — add validation feedback + shake |

No backend changes. No migrations.

