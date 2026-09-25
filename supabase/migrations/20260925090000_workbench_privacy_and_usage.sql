-- Additive workbench security upgrade. Apply only after staging verification.
-- Historical reports remain build/schema 1; report contents are never rewritten.
ALTER TABLE public.idea_reports
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'build',
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS general_report jsonb,
  ADD COLUMN IF NOT EXISTS sharing_enabled boolean NOT NULL DEFAULT false;

-- Permissive policies are ORed together: remove every old policy on these
-- report-owned tables, including policies left behind by historical migrations.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('idea_reports', 'idea_perspectives', 'idea_stack_items', 'agent_events', 'simulator_captures')
  LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename); END LOOP;
END $$;

ALTER TABLE public.idea_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY report_owner ON public.idea_reports FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND (NOT sharing_enabled OR auth.jwt()->>'is_anonymous' = 'false'));
CREATE POLICY capture_owner ON public.simulator_captures FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY perspective_owner ON public.idea_perspectives FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.idea_reports r WHERE r.id = report_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.idea_reports r WHERE r.id = report_id AND r.user_id = auth.uid()));
CREATE POLICY stack_owner ON public.idea_stack_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.idea_reports r WHERE r.id = report_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.idea_reports r WHERE r.id = report_id AND r.user_id = auth.uid()));
CREATE POLICY events_owner_read ON public.agent_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.idea_reports r WHERE r.id = report_id AND r.user_id = auth.uid()));
REVOKE ALL ON public.agent_events FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.agent_events FROM authenticated;

-- Internal organizational state is not public research data. Public scanners
-- operate transiently; persisted organization intelligence is admin/service only.
DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['org_decisions', 'mcp_usage_log', 'mcp_improvement_log',
    'signal_raw', 'signal_clusters', 'signal_themes', 'feature_candidates',
    'connector_registry', 'connector_sync_events']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
      LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t); END LOOP;
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
      EXECUTE format('CREATE POLICY internal_admin ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::public.app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::public.app_role))', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    END IF;
  END LOOP;
END $$;

-- Security-definer search helpers must not bypass the new organizational RLS.
-- Administrators use table access through RLS; internal callers retain RPC use.
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('match_decisions', 'match_signal_raw')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.set_report_sharing(_report_id uuid, _enabled boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.jwt()->>'is_anonymous' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'Sign in to manage sharing' USING ERRCODE = '42501'; END IF;
  UPDATE public.idea_reports SET sharing_enabled = _enabled WHERE id = _report_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found or not owned' USING ERRCODE = '42501'; END IF;
  RETURN _enabled;
END $$;
REVOKE ALL ON FUNCTION public.set_report_sharing(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_report_sharing(uuid, boolean) TO authenticated;

-- Preserve the existing report URL/RPC contract, but sharing must be explicit.
CREATE OR REPLACE FUNCTION public.get_shared_report(_report_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', id, 'idea', idea, 'title', title, 'brief', brief,
    'lovable_prompt', lovable_prompt, 'concept_image_url', concept_image_url,
    'logo_image_url', logo_image_url, 'highlights', highlights,
    'thesis_statement', thesis_statement, 'expanded_ideas', expanded_ideas,
    'alt_prompts', alt_prompts, 'auto_analysis', auto_analysis,
    'landing_page_html', landing_page_html, 'created_at', created_at,
    'purpose', purpose, 'schema_version', schema_version, 'general_report', general_report
  ) FROM public.idea_reports WHERE id = _report_id AND sharing_enabled = true;
$$;
REVOKE ALL ON FUNCTION public.get_shared_report(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_report(uuid) TO anon, authenticated;

-- Only the server can reserve usage. Browser clients cannot invent quotas or
-- caller identities. Row locking serializes reservations across edge instances.
CREATE TABLE IF NOT EXISTS public.ai_usage_subjects (
  subject text PRIMARY KEY,
  guest_trial_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ai_request_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL REFERENCES public.ai_usage_subjects(subject) ON DELETE CASCADE,
  endpoint text NOT NULL,
  fingerprint text NOT NULL,
  cost integer NOT NULL CHECK (cost > 0),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','complete','failed','expired')),
  response jsonb,
  response_status integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS ai_request_subject_created ON public.ai_request_reservations(subject, created_at);
ALTER TABLE public.ai_usage_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_request_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage_subjects, public.ai_request_reservations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_usage_subjects, public.ai_request_reservations TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_ai_request(
  _subject text, _endpoint text, _fingerprint text, _cost integer,
  _is_guest boolean, _trial_key text, _daily_limit integer, _guest_limit integer, _concurrency integer, _global_daily_limit integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.ai_usage_subjects; r public.ai_request_reservations; used integer; running integer; global_used integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
  IF _subject IS NULL OR length(_subject) > 100 OR _cost NOT BETWEEN 1 AND 40
    OR _daily_limit NOT BETWEEN 1 AND 2000 OR _guest_limit NOT BETWEEN 1 AND 50
    OR _concurrency NOT BETWEEN 1 AND 8 OR _global_daily_limit NOT BETWEEN 1 AND 10000 OR length(_fingerprint) <> 64
  THEN RAISE EXCEPTION 'Invalid usage reservation'; END IF;
  -- One global lock makes the circuit breaker effective even if a caller creates
  -- many anonymous UIDs. Do not trust client-supplied IP headers for identity.
  INSERT INTO public.ai_usage_subjects(subject) VALUES ('__global__') ON CONFLICT DO NOTHING;
  PERFORM 1 FROM public.ai_usage_subjects WHERE subject='__global__' FOR UPDATE;
  UPDATE public.ai_request_reservations SET response=NULL
    WHERE response IS NOT NULL AND created_at < now()-interval '10 minutes';
  INSERT INTO public.ai_usage_subjects(subject) VALUES (_subject) ON CONFLICT DO NOTHING;
  SELECT * INTO s FROM public.ai_usage_subjects WHERE subject = _subject FOR UPDATE;
  UPDATE public.ai_request_reservations SET status='expired', finished_at=now()
    WHERE subject=_subject AND status='running' AND created_at < now()-interval '5 minutes';
  SELECT * INTO r FROM public.ai_request_reservations
    WHERE subject=_subject AND endpoint=_endpoint AND fingerprint=_fingerprint
      AND status IN ('running','complete') AND created_at > now()-interval '10 minutes'
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    IF r.status='complete' AND r.response IS NOT NULL THEN
      RETURN jsonb_build_object('state','replay','response',r.response,'status',r.response_status);
    END IF;
    RETURN jsonb_build_object('state','duplicate','code',CASE WHEN r.status='running' THEN 'REQUEST_RUNNING' ELSE 'REQUEST_COMPLETED' END);
  END IF;
  SELECT coalesce(sum(cost),0) INTO global_used FROM public.ai_request_reservations
    WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  IF global_used+_cost > _global_daily_limit THEN
    RETURN jsonb_build_object('state','limited','code','GLOBAL_LIMIT');
  END IF;
  IF _is_guest AND (s.created_at < now()-interval '24 hours' OR
    (_trial_key IS NOT NULL AND s.guest_trial_key IS NOT NULL AND s.guest_trial_key <> _trial_key)) THEN
    RETURN jsonb_build_object('state','limited','code','GUEST_TRIAL_USED');
  END IF;
  SELECT coalesce(sum(cost),0) INTO used
    FROM public.ai_request_reservations WHERE subject=_subject
      AND (_is_guest OR created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC');
  IF used+_cost > (CASE WHEN _is_guest THEN _guest_limit ELSE _daily_limit END) THEN
    RETURN jsonb_build_object('state','limited','code',CASE WHEN _is_guest THEN 'GUEST_TRIAL_USED' ELSE 'DAILY_LIMIT' END);
  END IF;
  SELECT count(*) INTO running FROM public.ai_request_reservations WHERE subject=_subject AND status='running';
  IF running >= _concurrency THEN RETURN jsonb_build_object('state','busy','code','CONCURRENCY_LIMIT'); END IF;
  IF _is_guest AND s.guest_trial_key IS NULL AND _trial_key IS NOT NULL THEN
    UPDATE public.ai_usage_subjects SET guest_trial_key=_trial_key WHERE subject=_subject;
  END IF;
  INSERT INTO public.ai_request_reservations(subject,endpoint,fingerprint,cost)
    VALUES (_subject,_endpoint,_fingerprint,_cost) RETURNING * INTO r;
  RETURN jsonb_build_object('state','reserved','id',r.id);
END $$;

CREATE OR REPLACE FUNCTION public.finish_ai_request(_id uuid, _status integer, _response jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
  UPDATE public.ai_request_reservations SET
    status=CASE WHEN _status BETWEEN 200 AND 299 THEN 'complete' ELSE 'failed' END,
    response_status=_status,
    response=CASE WHEN pg_column_size(_response) <= 1048576 THEN _response ELSE NULL END,
    finished_at=now()
  WHERE id=_id AND status='running';
END $$;
REVOKE ALL ON FUNCTION public.reserve_ai_request(text,text,text,integer,boolean,text,integer,integer,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_ai_request(uuid,integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_request(text,text,text,integer,boolean,text,integer,integer,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_ai_request(uuid,integer,jsonb) TO service_role;
