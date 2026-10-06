import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { cleanCompany, runAccountResearch, runDeepDive, runSimulation } from "../_shared/agents/simulate.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json();

    // Deep dive is a separate code path
    if (body.type === "deep_dive") {
      const result = await runDeepDive({
        section: body.section,
        section_label: body.section_label,
        brief: body.brief,
        idea: body.idea,
        mode: body.mode,
      });
      return jsonResponse(result);
    }

    // Account lens: research and analysis need a company name or domain.
    if (body.lens === "account" && !cleanCompany(body.idea)) {
      return jsonResponse({ error: "Enter a company name or domain." }, 400);
    }

    // Account lens, sources first: search only, so the UI can show sources early.
    if (body.type === "research") {
      if (body.lens !== "account") return jsonResponse({ error: "research is only available for the account lens" }, 400);
      return jsonResponse(await runAccountResearch(cleanCompany(body.idea)));
    }

    // Standard analysis (initial, refine, final; account answers in one round)
    const result = await runSimulation({
      type: body.type,
      idea: body.idea,
      mode: body.mode,
      lens: body.lens,
      seller: body.seller,
      research: body.research,
      excerpts: body.excerpts,
      history: body.history,
      round: body.round,
    });
    return jsonResponse(result);
  } catch (e) {
    return handleFunctionError("simulate-idea", e);
  }
});
