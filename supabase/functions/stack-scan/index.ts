import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { createRateLimiter } from "../_shared/rate-limit.ts";
import { parseCompany } from "../_shared/match.ts";
import { scanJobBoards } from "../_shared/stack-scan.ts";

/**
 * Stack scan: reads a company's public Greenhouse, Lever or Ashby job board, or
 * its Workday board when it's a known one, and returns the data tools its posts
 * name (plainly, or as one option among several). The account lens runs the
 * same scan inside simulate-idea's research step; this endpoint exposes it on
 * its own.
 *
 * Input:  { company: "Chime" | "chime.com" | "Bandwidth (bandwidth.com)", domain?: "bandwidth.com" }
 * Output: { found, ats, board_url, company_name, total_jobs, scanned_jobs, tools[], posts[], ms, tried[] }
 */
const limited = createRateLimiter(20);

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    if (limited(req)) return jsonResponse({ error: "Too many scans. Try again in a minute." }, 429);
    const body = await req.json().catch(() => ({}));
    const typed = String(body?.company ?? "").replace(/["“”]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!typed) return jsonResponse({ error: "Enter a company name or domain." }, 400);
    const { name, domain } = parseCompany(typed);
    const extra = typeof body?.domain === "string" ? parseCompany(body.domain.slice(0, 120)).domain : undefined;
    const scan = await scanJobBoards(name, undefined, domain ?? extra);
    // Post text stays server-side; the excerpts that matter travel as sources.
    return jsonResponse({ ...scan, posts: scan.posts.map(({ excerpt: _excerpt, ...p }) => p) });
  } catch (e) {
    return handleFunctionError("stack-scan", e);
  }
});
