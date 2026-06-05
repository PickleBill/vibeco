import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";

/**
 * Signal Mine — Stage 1: Collect.
 *
 * Pulls customer pain-point candidates from COMPLIANT, public, no-key sources:
 *   - Reddit public search JSON  (https://www.reddit.com/r/<sub>/search.json)
 *   - Apple App Store reviews RSS (https://itunes.apple.com/.../customerreviews)
 *
 * No unofficial scraping, no auth-walled content. Stores provenance (source +
 * url + hashed author), de-dupes on source_url. Classification/clustering is
 * Stage 2+ (signal-process).
 *
 * Body: {
 *   product?: string,            // default 'niceace'
 *   subreddits?: string[],       // default ['golf','golfclubs']
 *   queries?: string[],          // default golf-betting / hole-in-one terms
 *   appstore_ids?: string[],     // optional iTunes app ids (competitor reviews)
 *   appstore_country?: string,   // default 'us'
 *   limit?: number,              // per source, default 25
 *   persist?: boolean            // write to signal_raw (needs service role)
 * }
 */

const UA = "NiceAceSignalMine/0.1 (Courtana; contact bill@courtana.com)";

// djb2 — cheap, non-cryptographic; we only need to avoid storing raw handles.
function hashAuthor(name: string): string {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) | 0;
  return "a_" + (h >>> 0).toString(36);
}

interface Item {
  source: string; source_url?: string; author_hash?: string;
  title?: string; body: string; product_tag: string; raw: Record<string, unknown>;
}

async function fetchReddit(sub: string, query: string, limit: number, product: string): Promise<Item[]> {
  const url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) { console.error(`reddit ${sub} "${query}" -> ${res.status}`); return []; }
  const json = await res.json();
  const children = json?.data?.children ?? [];
  return children.map((c: Record<string, any>) => {
    const d = c.data ?? {};
    const body = (d.selftext && d.selftext.trim()) ? d.selftext : (d.title ?? "");
    return {
      source: "reddit",
      source_url: d.permalink ? `https://www.reddit.com${d.permalink}` : undefined,
      author_hash: d.author ? hashAuthor(String(d.author)) : undefined,
      title: d.title,
      body: String(body).slice(0, 4000),
      product_tag: product,
      raw: { subreddit: sub, query, score: d.score, num_comments: d.num_comments, created_utc: d.created_utc },
    } as Item;
  }).filter((it: Item) => it.body && it.body.length > 12);
}

async function fetchAppStore(appId: string, country: string, product: string): Promise<Item[]> {
  const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${encodeURIComponent(appId)}/sortBy=mostRecent/json`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) { console.error(`appstore ${appId} -> ${res.status}`); return []; }
  const json = await res.json();
  const entries = json?.feed?.entry ?? [];
  // First entry is app metadata, not a review — skip anything without im:rating.
  return entries
    .filter((e: Record<string, any>) => e?.["im:rating"]?.label)
    .map((e: Record<string, any>) => ({
      source: "appstore_review",
      source_url: e?.id?.label,
      author_hash: e?.author?.name?.label ? hashAuthor(String(e.author.name.label)) : undefined,
      title: e?.title?.label,
      body: String(e?.content?.label ?? "").slice(0, 4000),
      product_tag: product,
      raw: { app_id: appId, rating: e?.["im:rating"]?.label, version: e?.["im:version"]?.label },
    } as Item))
    .filter((it: Item) => it.body && it.body.length > 8);
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const product = body.product || "niceace";
    const subreddits: string[] = body.subreddits || ["golf", "golfclubs"];
    const queries: string[] = body.queries || ["hole in one", "golf betting app", "18birdies", "skins app golf"];
    const appstoreIds: string[] = body.appstore_ids || [];
    const country = body.appstore_country || "us";
    const limit = Math.min(body.limit || 25, 50);

    // Fan out compliant collection jobs in parallel.
    const jobs: Promise<Item[]>[] = [];
    for (const sub of subreddits) for (const q of queries) jobs.push(fetchReddit(sub, q, limit, product));
    for (const id of appstoreIds) jobs.push(fetchAppStore(id, country, product));

    const settled = await Promise.allSettled(jobs);
    let items = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    // de-dupe within this run by source_url/body
    const seen = new Set<string>();
    items = items.filter((it) => {
      const key = it.source_url || it.body.slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });

    let persisted = 0;
    if (body.persist) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        // upsert on source_url (unique) — ignore dupes already collected
        const { data, error } = await supabase
          .from("signal_raw")
          .upsert(items, { onConflict: "source_url", ignoreDuplicates: true })
          .select("id");
        if (error) console.error("signal_raw upsert error:", error.message);
        else persisted = data?.length ?? 0;
      }
    }

    return jsonResponse({
      product,
      collected: items.length,
      persisted,
      sources: { subreddits, queries, appstore_ids: appstoreIds },
      items: body.persist ? undefined : items, // when not persisting, return the items for direct processing
    });
  } catch (e) {
    return handleFunctionError("signal-collect", e);
  }
});
