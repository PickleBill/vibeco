import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";

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

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const HN_ALGOLIA = "https://hn.algolia.com/api/v1/search";

// djb2 — cheap, non-cryptographic; we only need to avoid storing raw handles.
function hashAuthor(name: string): string {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) | 0;
  return "a_" + (h >>> 0).toString(36);
}

// Derive a coarse source label from the result URL.
function sourceFor(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("news.ycombinator.com")) return "hackernews";
  if (u.includes("reddit.com")) return "reddit";
  if (u.includes("apps.apple.com") || u.includes("itunes.apple.com")) return "appstore_review";
  if (u.includes("play.google.com")) return "playstore_review";
  return "web";
}

// Expand a topic into pain-oriented search phrases. Open-minded: works for any
// industry, niche, or idea — no vertical baked in.
function expandTopic(topic: string): string[] {
  const t = topic.trim();
  return [
    `${t} frustrating`,
    `${t} i wish there was`,
    `${t} hate that`,
    `${t} manual process workaround`,
    `${t} too expensive`,
    `${t} anyone else struggle with`,
    `${t} wasting time on`,
  ];
}

interface Item {
  source: string; source_url?: string; author_hash?: string;
  title?: string; body: string; product_tag: string; raw: Record<string, unknown>;
}

interface FcResult { url?: string; title?: string; description?: string; markdown?: string; }

async function firecrawlSearch(
  apiKey: string, query: string, limit: number, scrape: boolean,
): Promise<FcResult[]> {
  const res = await fetch(`${FIRECRAWL_V2}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit,
      ...(scrape ? { scrapeOptions: { formats: ["markdown"], onlyMainContent: true } } : {}),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`firecrawl "${query}" -> ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
    if (res.status === 402) throw new Error("Firecrawl: insufficient credits (402)");
    return [];
  }
  const data = (json as Record<string, any>).data;
  const list: FcResult[] = Array.isArray(data) ? data : (data?.web ?? data?.results ?? []);
  return list ?? [];
}

// Hacker News via Algolia — keyless. Mines stories + comments matching the query.
async function hnSearch(query: string, limit: number): Promise<Item[]> {
  const url = `${HN_ALGOLIA}?query=${encodeURIComponent(query)}&tags=(story,comment)&hitsPerPage=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": "vibeco-signal/1.0" } });
  if (!res.ok) {
    console.error(`hn "${query}" -> ${res.status}`);
    return [];
  }
  const json = await res.json().catch(() => ({ hits: [] }));
  const hits: any[] = json.hits ?? [];
  return hits.map((h): Item => {
    const objectId = h.objectID ?? "";
    const text = (h.comment_text || h.story_text || h.title || "").replace(/<[^>]+>/g, " ").trim();
    return {
      source: "hackernews",
      source_url: objectId ? `https://news.ycombinator.com/item?id=${objectId}` : undefined,
      author_hash: h.author ? hashAuthor(String(h.author)) : undefined,
      title: h.title ?? h.story_title ?? undefined,
      body: String(text).slice(0, 4000),
      product_tag: "",
      raw: { points: h.points, num_comments: h.num_comments, created_at: h.created_at },
    };
  }).filter((it) => it.body && it.body.length > 24);
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const product = body.product || "general";
    const topic: string | undefined = body.topic;
    const sites: string[] = body.sites || ["reddit.com"];
    const scrape = body.scrape !== false;
    const useHN = body.useHN !== false;
    const useFirecrawl = body.useFirecrawl !== false;
    const limit = Math.min(body.limit || 6, 10);

    const queries: string[] = body.queries
      || (topic ? expandTopic(topic) : [
        "small business manual process frustrating",
        "operations spreadsheet workaround hate",
        "i wish there was an app for my business",
        "customers complain about scheduling quoting",
        "wasting hours on admin work",
      ]);

    const status: { source: string; query?: string; collected: number }[] = [];
    let items: Item[] = [];

    // --- Hacker News (keyless) ---
    if (useHN) {
      const hnSettled = await Promise.allSettled(queries.map((q) => hnSearch(q, limit)));
      for (let i = 0; i < hnSettled.length; i++) {
        const r = hnSettled[i];
        const got = r.status === "fulfilled" ? r.value : [];
        status.push({ source: "hackernews", query: queries[i], collected: got.length });
        items.push(...got.map((it) => ({ ...it, product_tag: product })));
      }
    }

    // --- Firecrawl (web + Reddit) ---
    if (useFirecrawl) {
      const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (apiKey) {
        const phrases: string[] = [];
        for (const q of queries) {
          if (sites.length) for (const s of sites) phrases.push(`site:${s} ${q}`);
          else phrases.push(q);
        }
        const settled = await Promise.allSettled(
          phrases.map((p) => firecrawlSearch(apiKey, p, limit, scrape)),
        );
        const hardError = settled.find(
          (r) => r.status === "rejected" && String((r as PromiseRejectedResult).reason?.message || "").includes("402"),
        );
        if (hardError) {
          return jsonResponse({ error: (hardError as PromiseRejectedResult).reason.message }, 402);
        }
        for (let i = 0; i < settled.length; i++) {
          const r = settled[i];
          const list = r.status === "fulfilled" ? r.value : [];
          const mapped = list.map((res): Item => {
            const url = res.url || "";
            const text = (res.markdown && res.markdown.trim()) ? res.markdown : (res.description || res.title || "");
            return {
              source: sourceFor(url),
              source_url: url || undefined,
              title: res.title,
              body: String(text).slice(0, 4000),
              product_tag: product,
              raw: { description: res.description?.slice(0, 500) },
            };
          }).filter((it) => it.body && it.body.length > 24);
          status.push({ source: "firecrawl", query: phrases[i], collected: mapped.length });
          items.push(...mapped);
        }
      } else {
        status.push({ source: "firecrawl", collected: 0 });
        console.warn("FIRECRAWL_API_KEY not set — skipping Firecrawl, HN only.");
      }
    }

    // de-dupe within this run by source_url / body prefix
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
        const { data, error } = await supabase
          .from("signal_raw")
          .upsert(items, { onConflict: "source_url", ignoreDuplicates: true })
          .select("id");
        if (error) console.error("signal_raw upsert error:", error.message);
        else persisted = data?.length ?? 0;
      }
    }

    // Best-effort: log this run to the shared connector sync timeline so the Org
    // Knowledge Hub (and v2 / other apps) can show real, recent connector activity.
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseKey) {
        const logClient = createClient(supabaseUrl, supabaseKey);
        await logClient.from("connector_sync_events").insert({
          connector_key: useHN && useFirecrawl ? "multi" : useHN ? "hackernews" : "firecrawl",
          project: "vibeco",
          status: "ok",
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
      sources: { sites, queries, status, via: [useHN && "hackernews", useFirecrawl && "firecrawl"].filter(Boolean) },
      items: body.persist ? undefined : items,
    });
  } catch (e) {
    return handleFunctionError("signal-collect", e);
  }
});
