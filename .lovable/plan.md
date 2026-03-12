

## Plan: Fix Broken Features + Session Persistence + Hybrid Save

Three problems to solve: (1) Share Report and Copy Prompt don't work, (2) all state is lost on refresh/navigation, (3) no way to resume or access past sessions.

### Root Cause Analysis

**Share Report broken**: The `reportId` is only set when `callSimulator` inserts into `idea_reports` during the final phase OR when `handleUnlock` inserts a second time. Race conditions and duplicate inserts mean the ID may not propagate correctly. Also, the `handleEmailSubmit` in `FinalReport.tsx` does its own DB save to `simulator_captures` but does NOT set `reportId` — it's disconnected from the `idea_reports` table entirely.

**Copy Prompt broken**: `handleCopyPromptWithHighlights` calls `navigator.clipboard.writeText()` — this likely fails in the iframe preview because the Clipboard API requires a secure context + user gesture within the same frame. Need a fallback.

**State lost on refresh**: All state lives in React `useState` in `SimulatorShell`. On refresh, everything resets to defaults.

### Solution

#### 1. Fix Share Report — Single Source of Truth for `reportId`

- Move the `idea_reports` insert to happen ONCE: when the final phase is reached in `callSimulator` (already partially there). Remove the duplicate insert from `handleUnlock`.
- After insert, store `reportId` in both React state AND `localStorage`.
- In `FinalReport`, the share button reads from `reportId` prop. If null, show "Saving..." disabled state.
- On the `handleEmailSubmit` in FinalReport: update the existing `idea_reports` row (if reportId exists) to ensure lovable_prompt is current, rather than inserting a new one.

#### 2. Fix Copy Prompt — Clipboard Fallback

- Add a fallback for `navigator.clipboard.writeText`: use a hidden textarea + `document.execCommand('copy')` when the Clipboard API fails.
- Apply this to both `handleCopyPromptWithHighlights` in FinalReport and `handleCopyPrompt` in Report.tsx.

#### 3. Session Persistence via localStorage — Auto-Resume

Save the full simulator state to `localStorage` on every meaningful state change:
- Key: `vibeco_simulator_draft`
- Value: `{ phase, idea, rounds, currentRound, highlights, conceptImage, logoImage, lovablePrompt, unlocked, unlockEmail, reportId, sessionId, savedAt }`
- On mount in `SimulatorShell`, check localStorage for a draft. If found and less than 24 hours old, auto-restore all state immediately.
- On `handleRestart`, clear localStorage.
- This gives instant recovery on refresh/navigation with zero UI friction.

#### 4. Hybrid Account Sync (leveraging existing auth)

Auth already exists at `/auth`. Add a lightweight sync layer:
- When a user is logged in (check `supabase.auth.getSession()`), also save drafts to `simulator_captures` with their `user_id`.
- On mount, if logged in AND no localStorage draft, check `simulator_captures` for the user's most recent session and offer to resume.
- This means: anonymous users get localStorage recovery; logged-in users get cross-device recovery too.
- No new tables needed — `simulator_captures` already has all the fields. Just add an optional `user_id` column.

### Database Change

Add `user_id` column to `simulator_captures`:

```sql
ALTER TABLE public.simulator_captures 
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
```

### Files Modified

| File | Change |
|---|---|
| Migration SQL | Add `user_id` to `simulator_captures` |
| `SimulatorShell.tsx` | Add localStorage save/restore, fix reportId flow, remove duplicate insert from handleUnlock, add auth-based sync |
| `FinalReport.tsx` | Fix clipboard with fallback, update existing report on email submit instead of creating new one |
| `Report.tsx` | Fix clipboard with fallback |

### Clipboard Fallback Helper

```typescript
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
}
```

### localStorage Save/Restore Pattern

```typescript
// Save (debounced, on every state change)
const DRAFT_KEY = "vibeco_simulator_draft";
useEffect(() => {
  if (phase === "input" && rounds.length === 0) return;
  const draft = { phase, idea, rounds, currentRound, highlights: [...highlights], 
    conceptImage, logoImage, lovablePrompt, unlocked, unlockEmail, reportId, sessionId,
    savedAt: Date.now() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}, [phase, rounds, highlights, lovablePrompt, unlocked, reportId]);

// Restore on mount
useEffect(() => {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;
  const draft = JSON.parse(raw);
  if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
    localStorage.removeItem(DRAFT_KEY);
    return;
  }
  // Restore all state...
}, []);
```

