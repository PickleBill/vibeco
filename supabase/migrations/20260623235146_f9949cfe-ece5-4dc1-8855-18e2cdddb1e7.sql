-- ── Phase 1: premium role ──
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'premium';

-- ── Phase 2: org_decisions ──
CREATE TABLE public.org_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL DEFAULT 'unknown',
  project text NOT NULL DEFAULT 'general',
  category text NOT NULL DEFAULT 'insight',
  title text NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_decisions TO authenticated;
GRANT ALL ON public.org_decisions TO service_role;

ALTER TABLE public.org_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read org decisions"
  ON public.org_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert org decisions"
  ON public.org_decisions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role manages org decisions"
  ON public.org_decisions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_org_decisions_updated_at
  BEFORE UPDATE ON public.org_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- semantic match helper (mirrors match_signal_raw)
CREATE OR REPLACE FUNCTION public.match_decisions(
  query_embedding vector,
  match_count integer DEFAULT 10,
  filter_project text DEFAULT NULL,
  filter_category text DEFAULT NULL
)
RETURNS TABLE(id uuid, project text, category text, title text, content text, similarity double precision)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT id, project, category, title, content, 1 - (embedding <=> query_embedding) AS similarity
  FROM public.org_decisions
  WHERE embedding IS NOT NULL
    AND (filter_project IS NULL OR project = filter_project)
    AND (filter_category IS NULL OR category = filter_category)
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ── Phase 2: connector_registry ──
CREATE TABLE public.connector_registry (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  project text NOT NULL DEFAULT 'vibeco',
  status text NOT NULL DEFAULT 'dormant',
  auth_kind text NOT NULL DEFAULT 'secret',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.connector_registry TO authenticated;
GRANT ALL ON public.connector_registry TO service_role;

ALTER TABLE public.connector_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read connector registry"
  ON public.connector_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages connector registry"
  ON public.connector_registry FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_connector_registry_updated_at
  BEFORE UPDATE ON public.connector_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Phase 2: connector_sync_events ──
CREATE TABLE public.connector_sync_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connector_key text NOT NULL,
  project text NOT NULL DEFAULT 'vibeco',
  status text NOT NULL DEFAULT 'ok',
  items_collected integer NOT NULL DEFAULT 0,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.connector_sync_events TO authenticated;
GRANT ALL ON public.connector_sync_events TO service_role;

ALTER TABLE public.connector_sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read connector sync events"
  ON public.connector_sync_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages connector sync events"
  ON public.connector_sync_events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_connector_sync_events_key_created
  ON public.connector_sync_events (connector_key, created_at DESC);

-- ── Seed connector_registry ──
INSERT INTO public.connector_registry (key, display_name, project, status, auth_kind, config) VALUES
  ('firecrawl', 'Firecrawl', 'vibeco', 'active', 'secret', '{"note": "Live web scraping for signal-collect"}'::jsonb),
  ('hackernews', 'Hacker News', 'vibeco', 'active', 'keyless', '{"note": "Keyless public API"}'::jsonb),
  ('reddit', 'Reddit', 'vibeco', 'dormant', 'secret', '{"note": "Public search blocks datacenter IPs; routed via Firecrawl"}'::jsonb),
  ('perplexity_sonar', 'Perplexity Sonar', 'vibeco', 'dormant', 'workspace', '{"note": "Add via Perplexity connector at workspace level"}'::jsonb),
  ('anthropic_web_search', 'Anthropic Web Search', 'vibeco', 'dormant', 'secret', '{"note": "Dormant adapter; reads ANTHROPIC_API_KEY"}'::jsonb)
ON CONFLICT (key) DO NOTHING;