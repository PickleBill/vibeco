// Target-account lens ("account"): an express, one-round brief written for a
// seller. The model fills structured fields; this module then checks the
// evidence in code and assembles the First-call plan, so tags, citations and
// the customer-list sentence are exact rather than left to the model.
import { LENS_SPECS } from "../lens.ts";
import type { Research } from "../research.ts";
import {
  customerListSentence,
  sellerPromptBlock,
  type CustomerListResult,
  type SellerProfile,
} from "../sellers/index.ts";

const SPEC = LENS_SPECS.account;
export const STACK_CATEGORIES = ["Warehouse", "Transformation", "BI tools", "AI", "Embedded analytics"] as const;
const STATUSES = ["Confirmed", "Inferred", "Not found"] as const;
type Status = (typeof STATUSES)[number];

export interface StackLine {
  name: string;
  tool: string;
  status: Status;
  sources: number[];
  description: string;
  /** The sentence in the cited source that names the tool (Confirmed only). */
  evidence?: string;
  /** True when the model said Confirmed but no cited source named the tool at this company. */
  downgraded?: boolean;
}

// ─── Tool schema ───

export function accountToolSchema() {
  const str = (description: string) => ({ type: "string", description });
  return {
    type: "function" as const,
    function: {
      // Same name as the base analysis tool, so toolChoice and parsing are shared.
      name: "generate_idea_analysis",
      description: "Write a target-account brief for a seller, grounded in the live sources.",
      parameters: {
        type: "object",
        properties: {
          brief: {
            type: "object",
            properties: {
              problem: str(SPEC.slots.problem),
              target_customer: str(SPEC.slots.target_customer),
              core_features: {
                type: "array",
                description: `${SPEC.slots.core_features} One tool per line; a category with nothing in the sources gets one line with status "Not found".`,
                items: {
                  type: "object",
                  properties: {
                    name: str(`Category: one of ${STACK_CATEGORIES.join(", ")}.`),
                    tool: str("The single named product at this company (e.g. 'Snowflake'), or '' when Not found."),
                    status: { type: "string", enum: [...STATUSES], description: "Confirmed only when a cited source names this tool at this company." },
                    sources: { type: "array", items: { type: "integer" }, description: "Numbers of the sources that name this tool. Required for Confirmed." },
                    description: str("One short line, under 15 words: what the source shows, or why it's likely."),
                  },
                  required: ["name", "tool", "status", "sources", "description"],
                  additionalProperties: false,
                },
              },
              revenue_model: str(`${SPEC.slots.revenue_model} At most four events, under 70 words.`),
              industry_trends: str(SPEC.slots.industry_trends),
              investor_perspective: str(`${SPEC.slots.investor_perspective} Under 60 words.`),
              customer_perspective: str(SPEC.slots.customer_perspective),
              account_line: str("The account in one line: who they are and why they matter to this seller now. Under 30 words."),
              people: {
                type: "array",
                description: "People at this company that a source names (for example the head of data), with that source's number. Empty when no source names anyone. Never guess a name.",
                items: {
                  type: "object",
                  properties: {
                    name: str("The person's name exactly as the source writes it."),
                    role: str("Their role as the source gives it."),
                    source: { type: "integer", description: "The number of the source that names them." },
                  },
                  required: ["name", "role", "source"],
                  additionalProperties: false,
                },
              },
              start_with: {
                type: "object",
                properties: {
                  role: str("Who to start with: a role (put any sourced name in 'people', not here)."),
                  why: str("Why this person first, in 1-2 sentences, with [n] citations where a source supports it."),
                },
                required: ["role", "why"],
                additionalProperties: false,
              },
              discovery_questions: {
                type: "array",
                items: { type: "string" },
                description: "Exactly seven discovery questions for the first call, specific to this account and its stack, each under 20 words.",
              },
              migration_objection: {
                type: "object",
                properties: {
                  objection: str("The objection their data team would most likely raise about switching from what they run today."),
                  honest_answer: str("An honest answer in 2-3 sentences, including what is genuinely hard."),
                },
                required: ["objection", "honest_answer"],
                additionalProperties: false,
              },
              fit: {
                type: "object",
                properties: {
                  grade: { type: "string", enum: ["A", "B", "C"] },
                  reason: str("Why this grade, in 1-2 sentences, citing the signals."),
                },
                required: ["grade", "reason"],
                additionalProperties: false,
              },
            },
            required: [
              "problem", "target_customer", "core_features", "revenue_model", "industry_trends",
              "investor_perspective", "customer_perspective", "account_line", "people", "start_with",
              "discovery_questions", "migration_objection", "fit",
            ],
            additionalProperties: false,
          },
          is_final: { type: "boolean", description: "Always true: this lens answers in one round." },
        },
        required: ["brief", "is_final"],
        additionalProperties: false,
      },
    },
  };
}

// ─── Prompt ───

export function accountPrompts(
  company: string,
  seller: SellerProfile | undefined,
  match: CustomerListResult | undefined,
  sourcesBlock: string,
) {
  const today = new Date().toISOString().slice(0, 10);
  const systemPrompt = `You are VibeCo's account researcher. A seller is preparing a first call with ${company}. Write a target-account brief from the LIVE SOURCES. Today is ${today}.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

Rules:
1. Every fact about ${company} must come from a live source and carry its citation [n]. If the sources don't show something, say so. Never present a guess as a fact; label reasoning as Inferred.
2. Stack read (core_features): cover ${STACK_CATEGORIES.join(", ")}, in that order, one line per named tool (several tools in a category means several lines).
   - Confirmed: a cited source names this tool at ${company}. Put that source's number in "sources".
   - Inferred: likely, but no source names it at ${company}. Say why in the description.
   - Not found: nothing in the sources. Leave "tool" empty.
   Code checks every Confirmed line against the cited source and downgrades it if the source doesn't name the tool and the company.
3. People: use roles everywhere. If a source names a person at ${company}, list them in "people" with that source's number; code drops any name the source doesn't show. Never put a person's name in any other field.
4. Why now: only dated events from the last 12 months that a source shows.
5. customer_perspective is synthetic: start it with "Synthetic:".
6. Never write outreach emails, LinkedIn messages or any message to send.
7. Fit grade: A = a clear trigger now, a stack the seller works with, and a matching buying motion. B = plausible, but missing a trigger or evidence. C = weak fit or poor timing.
8. Exactly seven discovery questions.
${seller && match ? sellerPromptBlock(seller, company, match) : "\nNo seller profile was given: grade fit for a modern governed BI and AI analytics platform, and skip any customer-list statement."}`;

  const userContent = `Target account: "${company}"${sourcesBlock}`;
  return { systemPrompt, userContent };
}

// ─── Evidence checks ───

/** Lowercase letters and digits only, accents folded ("Café" -> "cafe"). */
const squash = (s: string) => fold(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Word-bounded, with optional spaces, dots or hyphens between letters: "powerbi" matches "Power BI". */
const looseWord = (key: string) => new RegExp(`\\b${key.split("").map(escapeRe).join("[\\s.\\-&']?")}\\b`, "i");

// Tool names that are also everyday words need a stricter pattern.
const STRICT_TOOL_PATTERNS: Record<string, RegExp[]> = {
  strategy: [/microstrategy/i, /\bstrategy (one|mosaic)\b/i],
  sigma: [/sigma computing/i, /(?<![Ss]ix )\bSigma\b/],
  hex: [/\bHex\b/, /hex\.tech/i],
  mode: [/mode analytics/i],
  fabric: [/microsoft fabric/i],
  domo: [/\bDomo\b/],
};

// "Google BigQuery" should match a source that just says "BigQuery".
const VENDOR_PREFIX = /^(google|amazon|aws|microsoft|azure|salesforce|sap)\s+/i;

function toolPatterns(tool: string): RegExp[] {
  const name = tool.replace(/\(.*?\)/g, "").trim();
  const strict = STRICT_TOOL_PATTERNS[squash(name)] ?? STRICT_TOOL_PATTERNS[squash(name.replace(VENDOR_PREFIX, ""))];
  if (strict) return strict;
  const keys = [...new Set([squash(name), squash(name.replace(VENDOR_PREFIX, ""))])].filter((k) => k.length >= 2);
  // "Power BI" / "PowerBI" / "Power-BI" all match.
  return keys.map(looseWord);
}

/** First place a source names the tool, if any. */
export function findTool(text: string, tool: string): number {
  for (const re of toolPatterns(tool)) {
    const m = re.exec(fold(text));
    if (m) return m.index;
  }
  return -1;
}

/** "Tableau / Power BI" is two tools; a source must name each of them. */
function toolsIn(tool: string): string[] {
  return tool.split(/\s*(?:\/|,|&|\band\b)\s*/i).map((t) => t.trim()).filter(Boolean);
}

const LEGAL_SUFFIX = /[\s,]+(?:inc|llc|ltd|limited|corp|corporation|co|company|plc|gmbh)\.?$/i;

/** "Guitar Center", "guitarcenter.com" and "incident.io" as whole words, not inside other names. */
export function mentionsCompany(text: string, company: string): boolean {
  const host = company.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  const names = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? [host, host.split(".")[0]] : [company.trim().replace(LEGAL_SUFFIX, "")];
  const folded = fold(text);
  return names.map(squash).filter((k) => k.length >= 2).some((k) => looseWord(k).test(folded));
}

/** The source writes this person's name (any spacing or case). */
function mentionsName(text: string, name: string): boolean {
  const words = fold(name).split(/\s+/).filter(Boolean).map(escapeRe);
  return words.length > 0 && new RegExp(`\\b${words.join("\\s+")}\\b`, "i").test(fold(text));
}

function quoteAround(text: string, at: number): string {
  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, at - 140)));
  const endSpace = text.indexOf(" ", Math.min(text.length, at + 140));
  const end = endSpace === -1 ? text.length : endSpace;
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

function canonicalCategory(name: string): string {
  const n = name.toLowerCase();
  if (/embed|customer[- ]facing/.test(n)) return "Embedded analytics";
  if (/\bai\b|\bml\b|llm|machine learning|genai|generative/.test(n)) return "AI";
  if (/\bbi\b|business intelligence|dashboard|reporting|visuali/.test(n)) return "BI tools";
  if (/transform|dbt|elt|etl|pipeline|orchestr/.test(n)) return "Transformation";
  if (/warehouse|lakehouse|database|platform/.test(n)) return "Warehouse";
  return name.trim() || "Other";
}

/** Keep [n] citations that point at real sources; drop the rest. */
export function sanitizeCitations(text: string, valid: Set<number>): string {
  return String(text ?? "").replace(/\s?\[(\s*\d+(?:\s*[,–-]\s*\d+)*\s*)\]/g, (_m, inner: string) => {
    const kept = inner.split(/[,–-]/).map((n) => parseInt(n.trim(), 10)).filter((n) => valid.has(n));
    return kept.length ? ` [${[...new Set(kept)].join(", ")}]` : "";
  });
}

export function verifyStack(
  raw: unknown,
  company: string,
  sourceText: Map<number, string>,
): StackLine[] {
  const valid = new Set(sourceText.keys());
  const items = Array.isArray(raw) ? raw : [];
  const lines: StackLine[] = items.map((r) => {
    const item = (r ?? {}) as Partial<StackLine>;
    const tool = String(item.tool ?? "").trim();
    let status: Status = STATUSES.includes(item.status as Status) ? (item.status as Status) : "Inferred";
    let sources = (Array.isArray(item.sources) ? item.sources : []).map(Number).filter((n) => valid.has(n));
    let description = sanitizeCitations(String(item.description ?? ""), valid).trim();
    let evidence: string | undefined;
    let downgraded = false;
    if (status === "Not found") sources = [];
    if (status === "Confirmed") {
      // Supported = the source names every listed tool AND the company.
      const named = toolsIn(tool);
      const supporting = sources.filter((id) => {
        const text = sourceText.get(id) ?? "";
        return named.length > 0 && named.every((t) => findTool(text, t) !== -1) && mentionsCompany(text, company);
      });
      if (supporting.length) {
        sources = supporting;
        const text = sourceText.get(supporting[0]) ?? "";
        evidence = quoteAround(text, findTool(text, named[0]));
      } else {
        status = "Inferred";
        downgraded = true;
        description = `${description}${description ? " " : ""}(No cited source names ${tool || "it"} at ${company}, so this is marked Inferred.)`;
      }
    }
    return {
      name: canonicalCategory(String(item.name ?? "")),
      tool,
      status,
      sources,
      description,
      ...(evidence ? { evidence } : {}),
      ...(downgraded ? { downgraded } : {}),
    };
  });
  // Every category appears at least once, in a fixed order.
  for (const cat of STACK_CATEGORIES) {
    if (!lines.some((l) => l.name === cat)) {
      lines.push({ name: cat, tool: "", status: "Not found", sources: [], description: "Nothing in the sources." });
    }
  }
  const order = (n: string) => {
    const i = (STACK_CATEGORIES as readonly string[]).indexOf(n);
    return i === -1 ? STACK_CATEGORIES.length : i;
  };
  return lines.sort((a, b) => order(a.name) - order(b.name));
}

// ─── Assembly ───

export interface SourcedPerson {
  name: string;
  role: string;
  source: number;
}

interface AccountBrief extends Record<string, unknown> {
  core_features: StackLine[];
  people?: SourcedPerson[];
  account_line?: string;
  start_with?: { role?: string; why?: string };
  discovery_questions?: string[];
  migration_objection?: { objection?: string; honest_answer?: string };
  fit?: { grade?: string; reason?: string };
}

const TEXT_FIELDS = [
  "problem", "target_customer", "revenue_model", "industry_trends",
  "investor_perspective", "customer_perspective", "account_line",
];

/**
 * Check and tidy the model's brief in place: verified stack, citations that
 * point at real sources, a labeled synthetic voice, and the seller's
 * customer-list wording. Returns the brief and the composed First-call plan.
 */
export function finalizeAccount(
  rawBrief: Record<string, unknown>,
  ctx: {
    company: string;
    research: Research;
    excerpts: string[];
    seller?: SellerProfile;
    match?: CustomerListResult;
  },
): { brief: AccountBrief; plan: string } {
  const { company, research, excerpts, seller, match } = ctx;
  const sourceText = new Map<number, string>();
  research.sources.forEach((s, i) => sourceText.set(s.id, `${s.title}\n${s.snippet}\n${excerpts[i] ?? ""}`));
  const valid = new Set(sourceText.keys());

  const listWording = (t: string) => (seller ? customerListWording(t, seller.name) : t);
  const tidy = (t: unknown) => listWording(sanitizeCitations(String(t ?? ""), valid)).trim();

  const brief = { ...rawBrief } as AccountBrief;
  for (const k of TEXT_FIELDS) brief[k] = tidy(brief[k]);
  brief.core_features = verifyStack(rawBrief.core_features, company, sourceText);
  for (const line of brief.core_features) line.description = listWording(line.description);

  // Keep a named person only when the cited source shows that name.
  brief.people = (Array.isArray(rawBrief.people) ? rawBrief.people : [])
    .map((p) => (p ?? {}) as Partial<SourcedPerson>)
    .map((p) => ({ name: String(p.name ?? "").trim(), role: tidy(p.role), source: Number(p.source) }))
    .filter((p) => p.name.length > 2 && valid.has(p.source) && mentionsName(sourceText.get(p.source) ?? "", p.name))
    .slice(0, 6);

  const startWith = (rawBrief.start_with ?? {}) as { role?: string; why?: string };
  brief.start_with = { role: tidy(startWith.role), why: tidy(startWith.why) };
  brief.discovery_questions = (Array.isArray(rawBrief.discovery_questions) ? rawBrief.discovery_questions : [])
    .map(tidy)
    .filter(Boolean)
    .slice(0, 7);
  const objection = (rawBrief.migration_objection ?? {}) as { objection?: string; honest_answer?: string };
  brief.migration_objection = { objection: tidy(objection.objection), honest_answer: tidy(objection.honest_answer) };
  const fit = (rawBrief.fit ?? {}) as { grade?: string; reason?: string };
  brief.fit = { grade: ["A", "B", "C"].includes(String(fit.grade)) ? String(fit.grade) : "B", reason: tidy(fit.reason) };

  if (!/^\s*synthetic/i.test(String(brief.customer_perspective))) {
    brief.customer_perspective = `Synthetic: ${brief.customer_perspective}`;
  }
  const noSources = research.sources.length === 0;
  if (noSources && !/no live sources were checked/i.test(String(brief.problem))) {
    brief.problem = `No live sources were checked for this run. ${brief.problem}`;
  }
  brief.company = company;
  if (seller && match) {
    brief.customer_list = {
      on_list: match.onList,
      ...(match.name ? { listed_as: match.name } : {}),
      ...(match.source ? { source: match.source } : {}),
      ...(match.ambiguous ? { ambiguous: true } : {}),
      sentence: customerListSentence(seller, company, match),
    };
  }
  return { brief, plan: composePlan(company, brief, noSources) };
}

/**
 * "not a customer" must never appear; the list wording is decided by code.
 * "isn't an Omni customer" -> "isn't on Omni's public customer list". Leaves
 * "customer-facing" and "a customer of <another vendor>" alone.
 */
export function customerListWording(text: string, sellerName: string): string {
  const name = escapeRe(sellerName);
  const re = new RegExp(
    `(\\bnot|n't)\\s+(?:(?:yet|currently|presently|already)\\s+)?(?:an?\\s+)?(?:(?:current|existing|paying)\\s+)?(?:${name}(?:'s)?\\s+)?customers?\\b(?!-)(?:\\s+of\\s+${name}\\b|(?!\\s+of\\s))`,
    "gi",
  );
  return text.replace(re, `$1 on ${sellerName}'s public customer list`);
}

function cites(ids: number[]): string {
  return ids.length ? ` [${ids.join(", ")}]` : "";
}

export const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
const PLAN_MAX_WORDS = 600;

/** The First-call plan, assembled from checked fields (300-600 words). */
export function composePlan(company: string, brief: AccountBrief, noSources: boolean): string {
  const full = buildPlan(company, brief, noSources, { stackNotes: true, short: false });
  if (wordCount(full) <= PLAN_MAX_WORDS) return full;
  // Too long: drop the Inferred notes (they stay in the brief), then shorten the free-text sections.
  const shorter = buildPlan(company, brief, noSources, { stackNotes: false, short: false });
  if (wordCount(shorter) <= PLAN_MAX_WORDS) return shorter;
  return buildPlan(company, brief, noSources, { stackNotes: false, short: true });
}

/** At most n words, cut at a line or sentence end when one fits. */
function capWords(text: string, n: number): string {
  if (wordCount(text) <= n) return text;
  const pieces = text.match(/[^\n.!?]+[.!?]*(?:\s*\[[\d, ]+\])?\n?/g) ?? [text];
  let out = "";
  for (const p of pieces) {
    if (wordCount(out + p) > n) break;
    out += p;
  }
  return out.trim() || `${text.split(/\s+/).slice(0, n).join(" ")}…`;
}

function buildPlan(
  company: string,
  brief: AccountBrief,
  noSources: boolean,
  opts: { stackNotes: boolean; short: boolean },
): string {
  // Short mode caps every free-text section so the plan fits in 600 words.
  const cap = (t: unknown, n: number) => (opts.short ? capWords(String(t ?? ""), n) : String(t ?? ""));
  const out: string[] = [`FIRST-CALL PLAN: ${company}`];
  if (noSources) {
    out.push("", "No live sources were checked for this run. Everything below is general knowledge, so verify it before the call.");
  }
  out.push("", "ACCOUNT IN ONE LINE", cap(brief.account_line, 30));
  out.push("", "STACK READ");
  for (const l of brief.core_features) {
    if (l.status === "Not found") out.push(`- ${l.name}: Not found`);
    else if (l.status === "Confirmed") out.push(`- ${l.name}: ${l.tool} (Confirmed${cites(l.sources)})`);
    else out.push(`- ${l.name}: ${l.tool || "tool not named"} (Inferred${cites(l.sources)})${opts.stackNotes && l.description ? `. ${l.description}` : ""}`);
  }
  out.push("", "WHY NOW", cap(brief.revenue_model, 70));
  const role = cap(brief.start_with?.role, 10).replace(/[.\s]+$/, "");
  out.push("", "WHO TO START WITH", [role, cap(brief.start_with?.why, 40)].filter(Boolean).join(". "));
  const people = brief.people ?? [];
  if (people.length) out.push(`Named in the sources: ${people.map((p) => `${p.name}, ${p.role} [${p.source}]`).join("; ")}.`);
  const questions = brief.discovery_questions ?? [];
  out.push(
    "",
    questions.length === 7 ? "SEVEN DISCOVERY QUESTIONS" : `${questions.length} DISCOVERY QUESTIONS`,
    ...questions.map((q, i) => `${i + 1}. ${cap(q, 20)}`),
  );
  out.push(
    "",
    "THE MIGRATION OBJECTION",
    `"${cap(brief.migration_objection?.objection, 25)}"`,
    `Honest answer: ${cap(brief.migration_objection?.honest_answer, 60)}`,
  );
  out.push("", "WHAT TO VERIFY BEFORE THE CALL", cap(brief.investor_perspective, 60));
  out.push("", `FIT GRADE: ${brief.fit?.grade ?? "B"}`, cap(brief.fit?.reason, 40));
  const list = brief.customer_list as { sentence?: string } | undefined;
  if (list?.sentence) out.push("", "CUSTOMER LIST", list.sentence);
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
