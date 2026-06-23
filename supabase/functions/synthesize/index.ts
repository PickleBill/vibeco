import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { synthesize } from "../_shared/agents/synthesize.ts";
import { resolvePremium } from "../_shared/premium.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const input = await req.json();
    // Honor premium only for role-verified callers (admin/premium).
    input.premium = await resolvePremium(req, input?.premium);
    const result = await synthesize(input);
    return jsonResponse(result);
  } catch (e) {
    return handleFunctionError("synthesize", e);
  }
});
