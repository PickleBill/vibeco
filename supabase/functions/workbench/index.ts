import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse } from "../_shared/cors.ts";
import { guardRequest } from "../_shared/request-guard.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { runWorkbench } from "../_shared/agents/workbench.ts";
import { WorkbenchValidationError } from "../_shared/workbench-types.ts";

serve((req) => guardRequest(req, "workbench", async (body) => {
  try { return jsonResponse({ report: await runWorkbench(body) }); }
  catch (error) {
    if (error instanceof WorkbenchValidationError) return jsonResponse({ error: error.message }, 400);
    return handleFunctionError("workbench", error);
  }
}));
