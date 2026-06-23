DROP POLICY IF EXISTS "Agent events are insertable by everyone" ON public.agent_events;

REVOKE INSERT ON public.agent_events FROM authenticated;