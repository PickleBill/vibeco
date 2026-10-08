// Exa web search for company pages. One search returns real company sites
// with the facts Exa's index carries for them (where they're headquartered,
// roughly how many people work there, the tools its company data lists), so a
// suggestion starts from a page that exists instead of a model's memory.
// Needs EXA_API_KEY; without it the caller falls back to the model alone.

import { STACK_TOOLS, type StackCategory } from "./stack-tools.ts";

const EXA_URL = "https://api.exa.ai/search";
const EXA_TIMEOUT_MS = 12_000;

/** One company page Exa found, read into the few facts the checks use. */
export interface ExaCompany {
  /** The company's name as its page gives it ("Glew"). */
  name: string;
  /** The page Exa found. */
  url: string;
  /** Bare domain of that page ("glew.io"). */
  domain: string;
  /** "Charlotte, NC" when the page's company data names a headquarters. */
  hq?: string;
  /** Headcount when the company data gives one ("employs 98 people"). */
  employees?: number;
  /** What the page says the company does, trimmed; no people, emails or phone numbers. */
  about: string;
  /** Data tools (warehouse, transformation, BI) the company data's tech-stack list names, in catalog order. */
  tools: string[];
}

export const exaConfigured = () => !!Deno.env.get("EXA_API_KEY");

const STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE",
  "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

const title = (w: string) => w.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/**
 * The headquarters in a company page's data, as "City, ST" (US only):
 * "Headquartered in Raleigh, North Carolina, United States" or
 * "Headquarters: charlotte, north carolina, united states (US)".
 */
export function readHq(text: string): string | undefined {
  const m =
    /Headquartered in ([A-Za-z .'-]+?), ([A-Za-z ]+?), United States/i.exec(text) ??
    /Headquarters:\s*([A-Za-z .'-]+?), ([A-Za-z ]+?), united states/i.exec(text);
  if (!m) return undefined;
  const code = STATES[m[2].trim().toLowerCase()];
  return code ? `${title(m[1].trim().toLowerCase())}, ${code}` : undefined;
}

/** "employs 1,240 people" -> 1240. */
export function readEmployees(text: string): number | undefined {
  const m = /employs ([\d,]+) people/i.exec(text);
  const n = m ? Number(m[1].replace(/,/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const bare = (url: string) => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** The company's own site: the data's "Homepage:" when it's a bare domain, else the page itself when it's a home page. */
export function homeDomain(url: string, text: string): string {
  const home = /Homepage:\s*([a-z0-9.-]+\.[a-z]{2,})(\/\S*)?/i.exec(text);
  if (home && !home[2]?.replace(/\/$/, "")) return home[1].toLowerCase().replace(/^www\./, "");
  if (home) return "";
  try {
    const u = new URL(url);
    return u.pathname.replace(/\/$/, "") === "" ? bare(url) : "";
  } catch {
    return "";
  }
}

const LISTED: StackCategory[] = ["Warehouse", "Transformation", "BI tools"];
// Too generic to say anything about an analytics team, or the seller itself.
const NOT_LISTED = new Set(["PostgreSQL", "Omni", "Apache Spark", "Presto", "Trino"]);
const strip = (v: string) => v.trim().toLowerCase().replace(/^(?:microsoft|google|amazon|aws|azure|apache)\s+/, "").replace(/\s+(?:data warehouse|cloud|desktop|server|online)$/, "").trim();
const CATALOG = STACK_TOOLS.filter((t) => LISTED.includes(t.category) && !t.signal && !NOT_LISTED.has(t.name));

/** "Tech Stack (showing 50 of 105): asana, power bi, snowflake" -> ["Snowflake", "Power BI"]. */
export function readListedTools(text: string): string[] {
  const m = /Tech Stack[^:\n]*:\s*([^\n]+)/i.exec(text);
  if (!m) return [];
  const items = new Set(m[1].split(",").map((x) => strip(x.replace(/\.{3}.*$/, ""))).filter(Boolean));
  return CATALOG.filter((t) => items.has(strip(t.name)) || items.has(t.name.toLowerCase())).map((t) => t.name);
}

/** The company's own description: the first passage before the data lists, with no people, emails or phone numbers. */
export function readAbout(passages: string[]): string {
  const first = passages.find((p) => p.trim() && !/^\s*-\s/.test(p)) ?? "";
  return first
    .split(/\n\s*-\s/)[0]
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "")
    .replace(/\+?\d[\d ().-]{7,}\d/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

/** "Entrinsik, Inc." -> "Entrinsik"; "Glew | Commerce Data Cloud" -> "Glew". */
export function companyName(pageTitle: string): string {
  return pageTitle
    .split(/\s[|–—-]\s|:\s/)[0]
    .replace(/[\s,]+(?:inc|llc|ltd|corp|corporation|co)\.?$/i, "")
    .trim();
}

/** Exa's raw results read into company rows; pages without a usable domain or name are dropped. */
export function readExaResults(data: unknown): ExaCompany[] {
  const results = (data as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];
  return results.flatMap((r) => {
    const x = (r ?? {}) as Record<string, unknown>;
    const url = typeof x.url === "string" ? x.url : "";
    const name = companyName(typeof x.title === "string" ? x.title : "");
    const highlights = Array.isArray(x.highlights) ? x.highlights.filter((h): h is string => typeof h === "string") : [];
    const passages = [typeof x.summary === "string" ? x.summary : "", ...highlights, typeof x.text === "string" ? x.text : ""];
    const text = passages.join("\n");
    // A subpage (a parent company's portfolio page, a link-in-bio page) isn't the company's own site.
    const domain = homeDomain(url, text);
    if (!domain || !name) return [];
    const home = `https://${domain}/`;
    return [{ name, url: bare(url) === domain ? url : home, domain, hq: readHq(text), employees: readEmployees(text), about: readAbout(passages), tools: readListedTools(text) }];
  });
}

/** Company pages for a plain-language description. Throws on a failed call (the caller falls back). */
export async function exaCompanies(query: string, numResults = 25, fetchImpl: typeof fetch = fetch): Promise<ExaCompany[]> {
  const key = Deno.env.get("EXA_API_KEY");
  if (!key) throw new Error("EXA_API_KEY is not set");
  const res = await fetchImpl(EXA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({
      query,
      type: "auto",
      category: "company",
      numResults,
      userLocation: "US",
      contents: {
        highlights: { query: "what the company sells and to whom, where it is headquartered, how many people it employs, its homepage and its tech stack", maxCharacters: 2500 },
      },
    }),
    signal: AbortSignal.timeout(EXA_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Exa search failed: ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return readExaResults(await res.json());
}

/** One web page Exa found, with the passages that answer the search's own question. */
export interface ExaPage {
  title: string;
  url: string;
  domain: string;
  /** "2026-09-14" when Exa knows when it was published. */
  published?: string;
  /** The highlights, joined; what the checks and the model read. */
  text: string;
}

/** Exa's raw results read into pages; a page without a URL or any text is dropped. */
export function readExaPages(data: unknown): ExaPage[] {
  const results = (data as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];
  return results.flatMap((r) => {
    const x = (r ?? {}) as Record<string, unknown>;
    const url = typeof x.url === "string" ? x.url : "";
    const domain = bare(url);
    const highlights = Array.isArray(x.highlights) ? x.highlights.filter((h): h is string => typeof h === "string") : [];
    const text = [typeof x.summary === "string" ? x.summary : "", ...highlights].join("\n").replace(/[ \t]+/g, " ").trim();
    if (!domain || !text) return [];
    const title = (typeof x.title === "string" ? x.title : "").trim() || domain;
    const published = typeof x.publishedDate === "string" ? x.publishedDate.slice(0, 10) : undefined;
    return [{ title: title.slice(0, 160), url, domain, ...(published ? { published } : {}), text: text.slice(0, 2400) }];
  });
}

/**
 * Pages for a plain-language description, each with the passages that answer
 * `highlight` (defaults to the query). `domains` keeps the search on the
 * company's own site. Throws on a failed call (the caller carries on without).
 */
export async function exaPages(
  query: string,
  opts: { numResults?: number; domains?: string[]; highlight?: string; timeoutMs?: number } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ExaPage[]> {
  const key = Deno.env.get("EXA_API_KEY");
  if (!key) throw new Error("EXA_API_KEY is not set");
  const res = await fetchImpl(EXA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({
      query,
      type: "auto",
      numResults: opts.numResults ?? 5,
      userLocation: "US",
      ...(opts.domains?.length ? { includeDomains: opts.domains } : {}),
      contents: { highlights: { query: opts.highlight ?? query, maxCharacters: 1600 } },
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? EXA_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Exa search failed: ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return readExaPages(await res.json());
}
