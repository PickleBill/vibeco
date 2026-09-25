import { guardedEndpoint } from "../_shared/request-guard.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { collectSignals, CollectionInputError } from "../_shared/signal-collection.ts";

/**
 * Signal Mine — Stage 1: Collect (topic-driven, multi-source).
 *
 * Open-minded by design: pass a `topic` (an industry, niche, or idea) and the
 * collector expands it into pain-oriented search phrases, then mines real public
 * discussions for customer frustration. No hardcoded vertical.
 *
 * Sources:
 *   - Hacker News via Algolia  — keyless, founder/builder/operator pain.
 *   - Firecrawl (web + Reddit) — proxy-scraped real web (Reddit `.json` and Apple
 *     RSS block datacenter IPs, so Reddit is reached via Firecrawl `site:reddit.com`).
 *
 * Reddit API note: self-serve app creation closed Nov 2025 (Responsible Builder
 * Policy). We do NOT use the Reddit API. Public content comes via Firecrawl.
 *
 * Body: {
 *   product?: string,        // tag to namespace this scan, default 'general'
 *   topic?: string,          // industry/idea to expand into pain queries
 *   queries?: string[],      // explicit pain phrases (overrides topic expansion)
 *   sites?: string[],        // domains to scope Firecrawl to, default ['reddit.com']
 *   useHN?: boolean,         // include Hacker News (Algolia), default true
 *   useFirecrawl?: boolean,  // include Firecrawl, default true
 *   limit?: number,          // results per query, default 6 (max 10)
 *   persist?: boolean,       // write to signal_raw (needs service role)
 *   scrape?: boolean         // pull full page markdown via Firecrawl (default true)
 * }
 */

serve(guardedEndpoint("signal-collect", async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const collection = await collectSignals(body, { firecrawlApiKey: Deno.env.get("FIRECRAWL_API_KEY") });
    if (collection.status !== 200) return jsonResponse(collection.result, collection.status);
    const { product, topic, items, partial, warnings, sources } = collection.result;
    const useHN = body.useHN !== false;
    const useFirecrawl = body.useFirecrawl !== false;

    let persisted = 0;
    if (body.persist && items.length > 0) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from("signal_raw")
          .upsert(items, { onConflict: "source_url", ignoreDuplicates: true })
          .select("id");
        if (error) return jsonResponse({ code: "SCAN_SAVE_FAILED", error: "Sources were collected but could not be saved. Run a transient scan to inspect them.", collected: items.length, persisted: 0 }, 500);
        persisted = data?.length ?? 0;
      }
    }

    // Best-effort: log this run to the shared connector sync timeline so the Org
    // Knowledge Hub (and v2 / other apps) can show real, recent connector activity.
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (body.persist && supabaseUrl && supabaseKey) {
        const logClient = createClient(supabaseUrl, supabaseKey);
        await logClient.from("connector_sync_events").insert({
          connector_key: useHN && useFirecrawl ? "multi" : useHN ? "hackernews" : "firecrawl",
          project: "vibeco",
          status: partial ? "partial" : "ok",
          items_collected: items.length,
          message: `signal-collect: ${items.length} items for "${topic || product}" (${persisted} persisted)`,
        });
      }
    } catch (logErr) {
      console.error("connector_sync_events log error:", (logErr as Error).message);
    }

    return jsonResponse({
      product,
      topic: topic ?? null,
      collected: items.length,
      persisted,
      sources,
      partial,
      warnings,
      items: body.persist ? undefined : items,
    });
  } catch (e) {
    if (e instanceof CollectionInputError) return jsonResponse({ code: "INVALID_COLLECTION_REQUEST", error: e.message }, 400);
    return handleFunctionError("signal-collect", e);
  }
}));
