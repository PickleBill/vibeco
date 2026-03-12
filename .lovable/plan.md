

## Plan: Shareable Reports + "Build in Lovable" Button

### 1. New `idea_reports` Table

```sql
CREATE TABLE public.idea_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea text NOT NULL,
  brief jsonb NOT NULL,
  rounds jsonb NOT NULL DEFAULT '[]',
  lovable_prompt text,
  concept_image_url text,
  logo_image_url text,
  highlights text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.idea_reports ENABLE ROW LEVEL SECURITY;

-- Anyone with the UUID link can read
CREATE POLICY "Public read by id" ON public.idea_reports
  FOR SELECT TO anon, authenticated USING (true);

-- Anyone can insert (no auth required, like simulator_captures)
CREATE POLICY "Anon insert" ON public.idea_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);
```

Note: The table is publicly readable by design — that's the point of shareable links. It contains no PII (no email column). The email stays in `simulator_captures` only.

### 2. Save Report on Unlock + Get Shareable ID

**`SimulatorShell.tsx`:**
- Add `reportId` state (`string | null`)
- After the user unlocks the report (in `handleUnlock`), insert into `idea_reports` with the brief, rounds, lovable_prompt, images, and highlights
- Store the returned UUID as `reportId`
- Pass `reportId` down to `FinalReport`

### 3. Two New Buttons in FinalReport

**After the Lovable Prompt section, replace the existing CTA buttons area (lines 728-749):**

**"Build My Site in Lovable" button:**
- Primary, prominent, with sparkle icon
- On click: `window.open(`https://lovable.dev/projects/create#prompt=${encodeURIComponent(lovablePrompt)}`, '_blank')`
- Only shown when `lovablePrompt` exists

**"Share Report" button:**
- Secondary style, with share/link icon
- On click: copies `${window.location.origin}/report/${reportId}` to clipboard
- Shows "Copied!" feedback (reuses the copied pattern already in the component)
- Only shown when `reportId` exists

Keep the existing "Simulate Another Idea" and "Back to Home" buttons.

### 4. Public `/report/[uuid]` Route

**New file: `src/pages/Report.tsx`**
- Reads UUID from `useParams()`
- Fetches from `idea_reports` by ID
- Renders a read-only version of the report: idea title, concept image, all 7 sections, lovable prompt (with copy button)
- Includes the "Build My Site in Lovable" button
- Shows a "Try the simulator yourself →" CTA linking to `/simulate`
- Loading and not-found states

**`App.tsx`:**
- Add route: `<Route path="/report/:id" element={<Report />} />`

### Files Modified

| File | Change |
|---|---|
| Migration SQL | Create `idea_reports` table with RLS |
| `src/components/simulator/SimulatorShell.tsx` | Add `reportId` state, insert into `idea_reports` on unlock |
| `src/components/simulator/FinalReport.tsx` | Add "Build in Lovable" + "Share Report" buttons, accept `reportId` prop |
| `src/pages/Report.tsx` | New public report page |
| `src/App.tsx` | Add `/report/:id` route |

