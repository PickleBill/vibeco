import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { createRateLimiter } from "../_shared/rate-limit.ts";
import { readSuggestInput, SuggestInputError, suggestAccounts } from "../_shared/agents/suggest-accounts.ts";

/**
 * Beyond the territory: real companies that may look like a seed account and
 * aren't in the territory yet, each an unresearched hypothesis. Public and
 * rate-limited. Nothing is stored.
 * Input: { seed: { name, domain?, motion, line, tools }, exclude: string[], region?: string, count?: number }
 * Output: { suggestions: [{ name, domain, hq?, why, motion_guess }], model, latencyMs }; an empty list
 * when nothing survives the checks. { ping: true } returns 204 (warm-up).
 */
const limited = createRateLimiter(10);

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.ping === true) return new Response(null, { status: 204, headers: corsHeaders });
    if (limited(req)) return jsonResponse({ error: "Too many requests. Try again in a minute." }, 429);
    return jsonResponse(await suggestAccounts(readSuggestInput(body)));
  } catch (e) {
    if (e instanceof SuggestInputError) return jsonResponse({ error: e.message }, 400);
    return handleFunctionError("suggest-accounts", e);
  }
});
