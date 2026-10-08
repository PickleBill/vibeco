import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { createRateLimiter } from "../_shared/rate-limit.ts";
import { partnerRiff, readRiffInput, RiffInputError, riffStore } from "../_shared/agents/partner-riff.ts";

/**
 * Whiteboard: a partnership riff on one company. How it could put the seller's
 * analytics inside its own product, what it could charge, roughly what that is
 * worth, and the internal play. Grounded in Exa; public and rate-limited.
 * Input: { company: "Dreamship" | "dreamship.com" | "Dreamship (dreamship.com)", seller?: "omni", fresh?: boolean }
 * Output: { riff, sources, model, latencyMs, cached?, savedAt?, reportId? }. A riff
 * of the same company from the last 14 days is served from idea_reports
 * (lens "partner") unless fresh is true. { ping: true } returns 204 (warm-up).
 */
const limited = createRateLimiter(10);
const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const store = url && key ? riffStore(createClient(url, key)) : null;

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.ping === true) return new Response(null, { status: 204, headers: corsHeaders });
    if (limited(req)) return jsonResponse({ error: "Too many requests. Try again in a minute." }, 429);
    return jsonResponse(await partnerRiff(readRiffInput(body), store));
  } catch (e) {
    if (e instanceof RiffInputError) return jsonResponse({ error: e.message }, 400);
    return handleFunctionError("partner-riff", e);
  }
});
