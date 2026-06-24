-- ── Phase 1: tighten RLS on internal tables ──

-- connector_registry: admin-only read (was: any authenticated)
DROP POLICY IF EXISTS "Authenticated can read connector registry" ON public.connector_registry;
CREATE POLICY "Admins can read connector registry"
  ON public.connector_registry FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- connector_sync_events: admin-only read (was: any authenticated)
DROP POLICY IF EXISTS "Authenticated can read connector sync events" ON public.connector_sync_events;
CREATE POLICY "Admins can read connector sync events"
  ON public.connector_sync_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- signal_raw: authenticated-only read (was: public/anon)
DROP POLICY IF EXISTS "signal_raw readable by everyone" ON public.signal_raw;
CREATE POLICY "signal_raw readable by authenticated"
  ON public.signal_raw FOR SELECT TO authenticated
  USING (true);

-- ── Phase 2: mcp_improvement_log (the MCP self-improvement loop expects this) ──

CREATE TABLE public.mcp_improvement_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text,
  category text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mcp_improvement_log TO authenticated;
GRANT ALL ON public.mcp_improvement_log TO service_role;

ALTER TABLE public.mcp_improvement_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read mcp improvement log"
  ON public.mcp_improvement_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages mcp improvement log"
  ON public.mcp_improvement_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_mcp_improvement_log_updated_at
  BEFORE UPDATE ON public.mcp_improvement_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();