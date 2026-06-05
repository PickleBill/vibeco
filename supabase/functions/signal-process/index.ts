import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { runSignalMine, type RawItem } from "../_shared/agents/signal-mine.ts";

/**
 * Signal Mine — Stages 2-4: Classify → Cluster → Synthesize.
 *
 * Reads raw items (from the body, or unprocessed rows in signal_raw) and runs
 * them through the agent mesh to produce ranked feature candidates. Optionally
 * persists clusters + candidates and marks raw rows processed.
 *
 * Body: {
 *   product?: string,            // default 'niceace'
 *   product_context?: string,    // what the product is (improves relevance)
 *   items?: RawItem[],           // process these directly (skips DB load)
 *   limit?: number,              // when loading from DB, max rows (default 80)
 *   persist?: boolean,           // write clusters + feature_candidates
 *   mode?: 'fast' | 'deep'
 * }
 */

const DEFAULT_CONTEXT =
  "NiceAce is a single-hole, QR-activated, winner-takes-all hole-in-one jackpot for golfers: scan a QR on a Par 3, pay ~$10, and win the whole pot if you ace it. Relevant pains: on-course betting/side-games, scoring disputes, settle-up friction, proving a hole-in-one, golf app UX complaints, payout trust.";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const product = body.product || "niceace";
    const productContext = body.product_context || DEFAULT_CONTEXT;
    const limit = Math.min(body.limit || 80, 200);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

    // Source items: explicit body.items, else unprocessed rows from signal_raw.
    let items: RawItem[] = body.items;
    let loadedRows: { id: string }[] = [];
    if (!items) {
      if (!supabase) return jsonResponse({ error: "No items provided and DB not configured. Pass items[] or set service role env." }, 400);
      const { data, error } = await supabase
        .from("signal_raw")
        .select("id, source, source_url, title, body")
        .eq("product_tag", product)
        .eq("processed", false)
        .limit(limit);
      if (error) throw new Error(error.message);
      loadedRows = (data ?? []).map((r: Record<string, any>) => ({ id: r.id }));
      items = (data ?? []).map((r: Record<string, any>) => ({
        id: r.id, source: r.source, source_url: r.source_url, title: r.title, body: r.body,
      }));
    }

    if (!items.length) return jsonResponse({ product, counts: { collected: 0, pain: 0, clusters: 0, candidates: 0 }, candidates: [] });

    const result = await runSignalMine({ items, product, product_context: productContext, mode: body.mode });

    // Persist clusters + candidates (Stage 4 output) and mark raw processed.
    if (body.persist && supabase) {
      for (const c of result.candidates) {
        const { data: cluster, error: cErr } = await supabase
          .from("signal_clusters")
          .insert({ product_tag: product, theme: c.cluster_theme, pain_score: c.pain_score, member_count: c.evidence.member_count })
          .select("id").single();
        if (cErr) { console.error("cluster insert:", cErr.message); continue; }
        const { error: fErr } = await supabase.from("feature_candidates").insert({
          cluster_id: cluster.id, product_tag: product,
          problem: c.problem, proposed_solution: c.proposed_solution,
          representative_quotes: c.representative_quotes, evidence: c.evidence,
          pain_score: c.pain_score, confidence: c.confidence, effort: c.effort, status: "open",
        });
        if (fErr) console.error("candidate insert:", fErr.message);
      }
      if (loadedRows.length) {
        const ids = loadedRows.map((r) => r.id);
        const { error } = await supabase.from("signal_raw").update({ processed: true }).in("id", ids);
        if (error) console.error("mark processed:", error.message);
      }
    }

    return jsonResponse(result);
  } catch (e) {
    return handleFunctionError("signal-process", e);
  }
});
