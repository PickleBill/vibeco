import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { createRateLimiter } from "../_shared/rate-limit.ts";
import { CommitteeInputError, reportStore, simulateCommittee } from "../_shared/agents/committee.ts";

/**
 * Simulate the buying committee: an account run's five critics sit at one
 * table and run the buying meeting in three rounds. Public and rate-limited.
 * Input: { report_id, what_if? } (a saved account run) or { brief, perspectives, what_if?, baseline? }.
 * Output: { seats, rounds, path_to_yes, main_blocker, outcome, what_if?, model, latencyMs, generated_at?, cached? }.
 * A saved run's plain simulation is stored at auto_analysis.committee and served
 * from there (cached: true); what-if runs start from it and are never stored.
 * { ping: true } returns 204 (warm-up).
 */
const limited = createRateLimiter(10);
const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const store = url && key ? reportStore(createClient(url, key)) : null;

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.ping === true) return new Response(null, { status: 204, headers: corsHeaders });
    if (limited(req)) return jsonResponse({ error: "Too many simulations. Try again in a minute." }, 429);
    return jsonResponse(await simulateCommittee(body, store));
  } catch (e) {
    if (e instanceof CommitteeInputError) return jsonResponse({ error: e.message }, e.status);
    return handleFunctionError("committee-sim", e);
  }
});
