import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { createRateLimiter } from "../_shared/rate-limit.ts";
import { DealRoomInputError, loadPublicReport, readDealRoomInput, runDealRoom, type DealRoomStore } from "../_shared/agents/deal-room.ts";

/**
 * Deal Room: the account answers a shared brief claim by claim (right, fix,
 * not sure); the seller's view reads the answers back. Public, rate-limited, no model.
 * Input: { report_id, claim_id, answer, text?, note? } -> { ok, deal_room }; { report_id, read: true } -> { deal_room };
 * { report_id, brief: true } -> { report } with the prospect-safe part of the brief only.
 * { ping: true } returns 204 (warm-up).
 */
const limited = createRateLimiter(30);

/** The saved runs table, through the service role (the page can't write a shared run itself). */
function reportsStore(): DealRoomStore {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Deal Room storage isn't configured.");
  const db = createClient(url, key);
  return {
    async load(id) {
      const { data, error } = await db.from("idea_reports").select("idea, created_at, brief, auto_analysis").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    async save(id, autoAnalysis) {
      const { error } = await db.from("idea_reports").update({ auto_analysis: autoAnalysis }).eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.ping === true) return new Response(null, { status: 204, headers: corsHeaders });
    if (limited(req)) return jsonResponse({ error: "Too many answers. Try again in a minute." }, 429);
    const input = readDealRoomInput(body);
    const store = reportsStore();
    return jsonResponse(input.kind === "brief" ? await loadPublicReport(input.report_id, store) : await runDealRoom(input, store));
  } catch (e) {
    if (e instanceof DealRoomInputError) return jsonResponse({ error: e.message }, e.status);
    return handleFunctionError("deal-room", e);
  }
});
