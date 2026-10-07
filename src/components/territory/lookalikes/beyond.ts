// Beyond the territory: the suggest-accounts call and the shapes around it.
// The function names real companies that may look like the seed and aren't
// in the territory; every one is an unresearched hypothesis. Nothing is stored.
import { supabase } from "@/integrations/supabase/client";
import type { MotionLabel } from "@/components/account/AccountViews";
import type { TerritoryRow } from "../model";

export type MotionGuess = "Internal" | "Embedded" | "Both";
const GUESSES: MotionGuess[] = ["Internal", "Embedded", "Both"];

/** The account the suggestions should look like. */
export interface BeyondSeed {
  name: string;
  domain?: string;
  motion: MotionLabel;
  /** One plain line on the account. */
  line: string;
  /** Data tools its sources confirm. */
  tools: string[];
}

export interface Suggestion {
  name: string;
  domain: string;
  hq?: string;
  why: string;
  motion_guess: MotionGuess;
  /** Headcount from the page's company data (web search only). */
  employees?: number;
  /** The page the web search found it on. */
  source?: { url: string; title: string };
  /** Data tools the page's company data lists (third-party, not checked). */
  listedTools?: string[];
}

/** What one search returned: the list, and for a web search what each step kept. */
export interface SuggestResult {
  list: Suggestion[];
  /** Found on the web, then picked; otherwise named by the model alone. */
  grounded: boolean;
  funnel?: { found: number; inRegion: number; kept: number };
}

/** A saved run as a seed: its confirmed tools only, each once. */
export function seedFromRow(row: TerritoryRow): BeyondSeed {
  const tools = [...new Set(row.stack.filter((s) => s.status === "Confirmed").map((s) => s.tool.trim()))].filter(Boolean).slice(0, 12);
  return { name: row.name, domain: row.domain, motion: row.motion, line: row.line, tools };
}

const isRow = (v: TerritoryRow | BeyondSeed): v is TerritoryRow => Array.isArray((v as TerritoryRow).stack);
export const asSeed = (v: TerritoryRow | BeyondSeed): BeyondSeed => (isRow(v) ? seedFromRow(v) : v);

/** Every name and domain already in the territory (and the seed), once each. */
export function excludeFrom(rows: Pick<TerritoryRow, "name" | "domain">[], seed?: Pick<BeyondSeed, "name" | "domain">): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...rows.flatMap((r) => [r.name, r.domain]), seed?.name, seed?.domain]) {
    const t = v?.trim();
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push(t);
    }
  }
  return out;
}

/** "Run an account" with the company typed in: /for/omni/account?run=Name%20(domain). */
export const researchHref = (seller: string, s: Pick<Suggestion, "name" | "domain">) => `/for/${seller}/account?run=${encodeURIComponent(`${s.name} (${s.domain})`)}`;

/** The function's answer, checked again here: well-formed rows only. */
export function readSuggestions(data: unknown): Suggestion[] {
  const list = (data as { suggestions?: unknown } | null)?.suggestions;
  if (!Array.isArray(list)) return [];
  return list.flatMap((x) => {
    const s = (x ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const name = str(s.name);
    const domain = str(s.domain).toLowerCase();
    const why = str(s.why);
    if (!name || !why || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return [];
    const motion_guess = GUESSES.includes(s.motion_guess as MotionGuess) ? (s.motion_guess as MotionGuess) : undefined;
    if (!motion_guess) return [];
    const hq = str(s.hq);
    const employees = typeof s.employees === "number" && s.employees > 0 ? Math.round(s.employees) : undefined;
    const src = (s.source ?? {}) as Record<string, unknown>;
    const source = /^https:\/\//.test(str(src.url)) ? { url: str(src.url), title: str(src.title) || name } : undefined;
    const listedTools = Array.isArray(s.listedTools) ? s.listedTools.map(str).filter(Boolean).slice(0, 4) : [];
    return [
      { name, domain, why, motion_guess, ...(hq ? { hq } : {}), ...(employees ? { employees } : {}), ...(source ? { source } : {}), ...(listedTools.length ? { listedTools } : {}) },
    ];
  });
}

export class SuggestError extends Error {
  constructor(
    message: string,
    readonly rateLimited = false,
  ) {
    super(message);
  }
}

/** The search's own counts, when it was a web search. */
export function readFunnel(data: unknown): SuggestResult["funnel"] {
  const f = (data as { funnel?: Record<string, unknown> } | null)?.funnel;
  const n = (v: unknown) => (typeof v === "number" && v >= 0 ? Math.round(v) : NaN);
  if (!f) return undefined;
  const funnel = { found: n(f.found), inRegion: n(f.inRegion), kept: n(f.kept) };
  return Object.values(funnel).every(Number.isFinite) ? funnel : undefined;
}

/** Ask for companies like the seed. Resolves to the checked list (possibly empty); throws SuggestError. */
export async function fetchSuggestions(body: { seed: BeyondSeed; exclude: string[]; region?: string; count?: number }, signal: AbortSignal): Promise<SuggestResult> {
  const { data, error } = await supabase.functions.invoke("suggest-accounts", { body, signal });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const status = ctx && typeof ctx.status === "number" ? ctx.status : 0;
    let message = "";
    if (ctx && typeof ctx.json === "function") {
      try {
        const j = await ctx.json();
        if (j?.error) message = String(j.error);
      } catch {
        // no JSON body
      }
    }
    if (status === 429) throw new SuggestError("Too many requests from this connection just now. Wait a minute, then try again.", true);
    if (status >= 400 && status < 500 && status !== 404 && message) throw new SuggestError(message);
    throw new SuggestError(status >= 500 ? "The suggestions didn’t finish on our side." : "Suggestions aren’t available right now.");
  }
  if ((data as { error?: string } | null)?.error) throw new SuggestError(String((data as { error: string }).error));
  const grounded = (data as { grounded?: unknown } | null)?.grounded === true;
  return { list: readSuggestions(data), grounded, funnel: grounded ? readFunnel(data) : undefined };
}
