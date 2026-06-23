CREATE TABLE IF NOT EXISTS public.agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.idea_reports(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'completed',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_report ON public.agent_events(report_id);

GRANT SELECT ON public.agent_events TO anon;
GRANT SELECT, INSERT ON public.agent_events TO authenticated;
GRANT ALL ON public.agent_events TO service_role;

ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent events are viewable by everyone"
  ON public.agent_events FOR SELECT
  USING (true);

CREATE POLICY "Agent events are insertable by everyone"
  ON public.agent_events FOR INSERT
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_events;