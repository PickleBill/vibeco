// Beyond the territory: from one seed account's motion, line and stack, the
// model names a handful of real companies in a region that may look like it
// and aren't in the territory yet. Each one is a hypothesis to check, never a
// fact. Code then drops anything the territory already has, malformed or
// repeated domains, list and news sites, any reason with a digit or a funding
// or headcount claim, and any domain that doesn't answer over HTTPS.
import { LLMError } from "../error-handler.ts";
import { callLLMWithTool } from "../llm-client.ts";
import { modelChain } from "../model-router.ts";
import { isAggregator, parseCompany, squash } from "../match.ts";
import type { AccountSuggestion, SuggestAccountsInput, SuggestAccountsResult, SuggestMotion, SuggestSeed } from "../types.ts";

const MOTIONS: SuggestMotion[] = ["Internal", "Embedded", "Both"];
const DEFAULT_REGION = "Southeast US";
const DEFAULT_COUNT = 6;
const MAX_COUNT = 8;
/** The model is asked for a few extra, since some won't survive the checks. */
const EXTRA = 4;
const MAX_EXCLUDE = 200;
const MAX_TOOLS = 12;
const MAX_WHY = 160;

export class SuggestInputError extends Error {}

/** One line of plain text: fence delimiters and markdown emphasis off, whitespace collapsed, capped. */
function plain(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v
    .replace(/<{2,}|>{2,}/g, " ")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

/** An array, including one a model sent as a JSON string; [] otherwise. */
function list(v: unknown): unknown[] {
  if (typeof v === "string" && /^\s*\[/.test(v)) {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  return Array.isArray(v) ? v : [];
}

const HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

/** "https://www.Example.com/" -> "example.com"; "" when it isn't a plain domain (paths, spaces, IPs). */
export function bareDomain(v: unknown): string {
  if (typeof v !== "string") return "";
  const host = v
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .replace(/\.$/, "");
  return HOST.test(host) ? host : "";
}

// Profiles, directories and news are pages about a company, not its own site.
const NOT_A_COMPANY_SITE =
  /(^|\.)(linkedin|crunchbase|wikipedia|bloomberg|zoominfo|pitchbook|glassdoor|indeed|facebook|twitter|x|instagram|youtube|github|medium|forbes|techcrunch|builtin|owler|craft|dnb|g2|capterra|apollo|rocketreach|google|bizjournals)\.[a-z.]+$/;

/** Check and bound what the page sends. Throws SuggestInputError on bad input. */
export function readSuggestInput(raw: unknown): SuggestAccountsInput {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const s = (body.seed && typeof body.seed === "object" ? body.seed : {}) as Record<string, unknown>;
  const name = plain(s.name, 120);
  if (!name) throw new SuggestInputError("Send a seed account with a name.");
  const motion = [...MOTIONS, "Unclear"].includes(s.motion as string) ? (s.motion as SuggestSeed["motion"]) : "Unclear";
  const domain = bareDomain(s.domain) || undefined;
  const tools = list(s.tools)
    .map((t) => plain(t, 40))
    .filter(Boolean)
    .slice(0, MAX_TOOLS);
  if (body.exclude !== undefined && !Array.isArray(body.exclude)) throw new SuggestInputError("exclude must be a list of names and domains.");
  const exclude = list(body.exclude)
    .map((e) => plain(e, 120))
    .filter(Boolean)
    .slice(0, MAX_EXCLUDE);
  const region = plain(body.region, 60) || DEFAULT_REGION;
  const n = Number(body.count);
  const count = Number.isFinite(n) && n >= 1 ? Math.min(MAX_COUNT, Math.floor(n)) : DEFAULT_COUNT;
  return { seed: { name, domain, motion, line: plain(s.line, 300), tools }, exclude, region, count };
}

// ─── Prompt ───

export const suggestToolSchema = {
  type: "function" as const,
  function: {
    name: "suggest_accounts",
    description: "Name real companies that may look like the seed account, for a seller to research next.",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "The company's usual name." },
              domain: { type: "string", description: "Its own main website as a bare domain, like example.com. No protocol, no path." },
              hq: { type: "string", description: "City and state of its headquarters or its office in the region, like \"Atlanta, GA\". Empty if unsure." },
              why: {
                type: "string",
                description: "One short sentence, at most 20 words, phrased as a hypothesis to check (\"May ship customer-facing reporting in its fleet software.\"). No numbers, dates, funding or headcount.",
              },
              motion_guess: { type: "string", enum: [...MOTIONS], description: "Your guess at its analytics motion." },
            },
            required: ["name", "domain", "hq", "why", "motion_guess"],
            additionalProperties: false,
          },
        },
      },
      required: ["suggestions"],
      additionalProperties: false,
    },
  },
};

const MOTION_HINT: Record<SuggestSeed["motion"], string> = {
  Internal: "The seed's motion is Internal: look for companies whose own teams run on a data warehouse and BI (a data team, analysts, dashboards for the business).",
  Embedded: "The seed's motion is Embedded: look for software companies that ship customer-facing dashboards, analytics or reporting inside their product.",
  Both: "The seed's motion is Both: look for software companies that ship customer-facing dashboards or reporting in their product and also run a data team on a warehouse and BI internally.",
  Unclear: "The seed's motion is unclear from its sources: match its industry, business model and data maturity instead.",
};

export function suggestPrompt(input: SuggestAccountsInput): { system: string; user: string } {
  const { seed, region, count, exclude } = input;
  const ask = Math.min(count + EXTRA, MAX_COUNT + EXTRA);
  const system = `You help a seller of an analytics and BI platform find accounts to research next. Given one seed account, you name real companies that may look like it.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

Rules:
1. Only real companies operating today, headquartered in ${region} or with a major office there. If you aren't sure a company exists, still operates, or is in the region, leave it out. Fewer is better than one invented.
2. Similar to the seed in analytics motion and data maturity. ${MOTION_HINT[seed.motion]}
3. Never name the seed, a company on the EXCLUDE list, or one of their brands or subsidiaries.
4. domain: the company's own main website as a bare domain (example.com). Not a LinkedIn, Crunchbase, directory or news page.
5. why: one short sentence, at most 20 words, phrased as a hypothesis to check, starting with "May" or "Might". Example: "May ship customer-facing reporting in its property management software."
6. In why: no numbers, no dates, no funding, revenue, valuation or headcount claims, no customer names. You haven't researched these companies; don't write as if you had.
7. hq: "City, ST" when you know it, else "".
8. motion_guess: Internal, Embedded or Both.
9. Name up to ${ask} companies, the closest matches first.`;

  const seedText = [
    `Name: ${seed.name}${seed.domain ? ` (${seed.domain})` : ""}`,
    `Motion: ${seed.motion}`,
    seed.line ? `In one line: ${seed.line}` : "",
    seed.tools.length ? `Data tools its sources confirm: ${seed.tools.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const user = `SEED ACCOUNT
<<<SEED
${seedText}
SEED>>>

REGION: ${region}

EXCLUDE (already in the territory; never suggest these)
<<<EXCLUDE
${exclude.length ? exclude.join("\n") : "(none)"}
EXCLUDE>>>

Answer with suggest_accounts.`;
  return { system, user };
}

// ─── Checks in code ───

const LEGAL_SUFFIX = /[\s,]+(?:inc|llc|ltd|limited|corp|corporation|co|company|plc|holdings)\.?$/i;
const nameKey = (name: string) => squash(name.replace(LEGAL_SUFFIX, ""));
// Funding and headcount are facts nobody checked; a reason that states them goes.
const UNCHECKED_CLAIM = /\b(?:raised|funding|funded|series [a-f]|valuation|valued at|unicorn|ipo|employees|headcount|staff of)\b/i;

/** Names and bare domains to keep out: "Relay (relaypro.com)", "Relay" and "relaypro.com" all count. */
export function excludeKeys(exclude: string[], seed?: Pick<SuggestSeed, "name" | "domain">): { names: Set<string>; domains: Set<string> } {
  const names = new Set<string>();
  const domains = new Set<string>();
  for (const raw of [...exclude, ...(seed ? [seed.name, seed.domain ?? ""] : [])]) {
    if (!raw) continue;
    const { name, domain } = parseCompany(raw);
    const d = bareDomain(domain ?? raw);
    if (d) domains.add(d);
    if (!d || name !== raw) {
      const k = nameKey(name);
      if (k.length >= 2) names.add(k);
    }
  }
  return { names, domains };
}

/**
 * The model's list, checked without the network: well-formed, outside the
 * territory and the seed, no repeats, reasons without digits or funding or
 * headcount claims. Not capped; the HTTPS check comes next.
 */
export function cleanSuggestions(raw: unknown, input: Pick<SuggestAccountsInput, "exclude" | "seed">): AccountSuggestion[] {
  const { names, domains } = excludeKeys(input.exclude, input.seed);
  const seenNames = new Set<string>();
  const seenDomains = new Set<string>();
  const fallback: SuggestMotion = MOTIONS.includes(input.seed.motion as SuggestMotion) ? (input.seed.motion as SuggestMotion) : "Internal";
  const out: AccountSuggestion[] = [];
  const items = list(raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>).suggestions : raw);
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    const name = plain(s.name, 80);
    const domain = bareDomain(s.domain);
    const why = plain(s.why, MAX_WHY);
    const key = nameKey(name);
    if (!name || key.length < 2 || !domain || !why) continue;
    if (NOT_A_COMPANY_SITE.test(domain) || isAggregator(`https://${domain}`)) continue;
    if (names.has(key) || domains.has(domain)) continue;
    if (seenNames.has(key) || seenDomains.has(domain)) continue;
    if (/\d/.test(why) || UNCHECKED_CLAIM.test(why)) continue;
    seenNames.add(key);
    seenDomains.add(domain);
    const hq = plain(s.hq, 60);
    const motion_guess = MOTIONS.includes(s.motion_guess as SuggestMotion) ? (s.motion_guess as SuggestMotion) : fallback;
    out.push({ name, domain, ...(hq && !/\d/.test(hq) ? { hq } : {}), why, motion_guess });
  }
  return out;
}

export type DomainCheck = (domain: string) => Promise<boolean>;

const CHECK_TIMEOUT_MS = 4_000;

async function answers(url: string, method: "HEAD" | "GET"): Promise<boolean> {
  try {
    const res = await fetch(url, { method, redirect: "manual", signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
    await res.body?.cancel().catch(() => undefined);
    return res.status < 500;
  } catch {
    return false;
  }
}

/** The domain answers over HTTPS: HEAD, then GET when HEAD fails; 4s each; any status below 500 counts. */
export const httpsAnswers: DomainCheck = async (domain) => (await answers(`https://${domain}/`, "HEAD")) || (await answers(`https://${domain}/`, "GET"));

/** Keep the suggestions whose domain answers (checked in parallel), in order, at most `count`. */
export async function verifySuggestions(items: AccountSuggestion[], count: number, check: DomainCheck = httpsAnswers): Promise<AccountSuggestion[]> {
  const ok = await Promise.all(items.map((s) => check(s.domain).catch(() => false)));
  return items.filter((_, i) => ok[i]).slice(0, count);
}

// ─── Running it ───

/** Per-model time limits: Claude gets 25s; the Flash fallback 15s. */
const TIMEOUTS = [25_000, 15_000];

export async function suggestAccounts(input: SuggestAccountsInput, check: DomainCheck = httpsAnswers): Promise<SuggestAccountsResult> {
  const { system, user } = suggestPrompt(input);
  let lastError: unknown;
  let answered = "";
  for (const [i, model] of modelChain("suggest-accounts").entries()) {
    const started = Date.now();
    try {
      const raw = await callLLMWithTool<Record<string, unknown>>({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [suggestToolSchema],
        toolChoice: { type: "function", function: { name: "suggest_accounts" } },
        timeoutMs: TIMEOUTS[i] ?? 15_000,
      });
      answered = model;
      const clean = cleanSuggestions(raw, input);
      // Nothing usable (all excluded, malformed or claims): the next model tries.
      if (!clean.length) {
        console.warn(`[suggest-accounts] ${model} answered with nothing usable`);
        continue;
      }
      return { suggestions: await verifySuggestions(clean, input.count, check), model, latencyMs: Date.now() - started };
    } catch (e) {
      lastError = e;
      console.error(`[suggest-accounts] ${model} failed after ${Date.now() - started}ms:`, e instanceof Error ? e.message : e);
    }
  }
  // A model answered but nothing survived: an empty list, not an error.
  if (answered) return { suggestions: [], model: answered, latencyMs: 0 };
  // Keep gateway errors (429, 402) so the endpoint maps them; anything else gets a plain message.
  throw lastError instanceof LLMError ? lastError : new Error("No suggestions came back. Try again in a moment.");
}
