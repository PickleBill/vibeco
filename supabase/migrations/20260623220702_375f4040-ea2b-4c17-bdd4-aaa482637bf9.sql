-- 1. Additive columns for previously in-memory-only outputs
ALTER TABLE public.idea_reports
  ADD COLUMN IF NOT EXISTS auto_analysis jsonb,
  ADD COLUMN IF NOT EXISTS landing_page_html text;

-- 2. Lock down idea_reports to owner-scoped access (anonymous sessions get a uid)
DROP POLICY IF EXISTS "Public read by id" ON public.idea_reports;
DROP POLICY IF EXISTS "Anon insert" ON public.idea_reports;
DROP POLICY IF EXISTS "Update ownerless or own reports" ON public.idea_reports;

CREATE POLICY "Owners read own reports"
  ON public.idea_reports FOR SELECT
  TO anon, authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners insert own reports"
  ON public.idea_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners update own reports"
  ON public.idea_reports FOR UPDATE
  TO anon, authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Owner-scope idea_perspectives via parent report
DROP POLICY IF EXISTS "Read perspectives for ownerless or own reports" ON public.idea_perspectives;
DROP POLICY IF EXISTS "Insert perspectives for ownerless or own reports" ON public.idea_perspectives;
DROP POLICY IF EXISTS "Update perspectives for ownerless or own reports" ON public.idea_perspectives;

CREATE POLICY "Read perspectives for own reports"
  ON public.idea_perspectives FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.idea_reports r
    WHERE r.id = idea_perspectives.report_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Insert perspectives for own reports"
  ON public.idea_perspectives FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.idea_reports r
    WHERE r.id = idea_perspectives.report_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Update perspectives for own reports"
  ON public.idea_perspectives FOR UPDATE
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.idea_reports r
    WHERE r.id = idea_perspectives.report_id AND r.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.idea_reports r
    WHERE r.id = idea_perspectives.report_id AND r.user_id = auth.uid()
  ));

-- 4. Capability-based public sharing: read-only, non-PII, by unguessable report id
CREATE OR REPLACE FUNCTION public.get_shared_report(_report_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', id,
    'idea', idea,
    'title', title,
    'brief', brief,
    'lovable_prompt', lovable_prompt,
    'concept_image_url', concept_image_url,
    'logo_image_url', logo_image_url,
    'highlights', highlights,
    'thesis_statement', thesis_statement,
    'expanded_ideas', expanded_ideas,
    'alt_prompts', alt_prompts,
    'auto_analysis', auto_analysis,
    'landing_page_html', landing_page_html,
    'created_at', created_at
  )
  FROM public.idea_reports
  WHERE id = _report_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_report(uuid) TO anon, authenticated;