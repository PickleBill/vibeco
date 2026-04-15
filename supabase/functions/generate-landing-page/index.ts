import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { generateLandingPage } from "../_shared/agents/landing-page.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const input = await req.json();

    if (!input.prompt || typeof input.prompt !== "string") {
      return jsonResponse({ error: "Missing prompt" }, 400);
    }

    const result = await generateLandingPage(input);
    return jsonResponse(result);
  } catch (e) {
    return handleFunctionError("generate-landing-page", e);
  }
});
