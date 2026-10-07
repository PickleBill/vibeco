// Target-account lens ("account"): an express, one-round brief written for a
// seller. The model fills structured fields; this module then checks the
// evidence in code and assembles the First-call plan, so tags, citations and
// the customer-list sentence are exact rather than left to the model.
import { LENS_SPECS } from "../lens.ts";
import type { Research } from "../research.ts";
import { companyHits, escapeRe, fold, isAggregator, looseWord, mentionsCompany, squash } from "../match.ts";
import { ATS_LABEL, type ScanSummary } from "../stack-scan.ts";
import {
  mentionKind,
  OMNI_WORD,
  SENTENCE_END,
  SENTENCE_STOP,
  SIGMA_WORD,
  STACK_TOOLS,
  toolMentions,
  type Mention,
  type MentionKind,
} from "../stack-tools.ts";
import {
  buildMotion,
  embeddedEvidence,
  fitMotion,
  internalEvidence,
  signalLine,
  type MotionEvidence,
  type MotionRead,
} from "../motion.ts";
import {
  asSeller,
  customerListSentence,
  sellerPromptBlock,
  type CustomerListResult,
  type SellerProfile,
} from "../sellers/index.ts";

const SPEC = LENS_SPECS.account;
export const STACK_CATEGORIES = ["Warehouse", "Transformation", "BI tools", "AI", "Embedded analytics"] as const;
/** What the model may say; "Former" is decided in code. */
const STATUSES = ["Confirmed", "Inferred", "Not found"] as const;
type Status = (typeof STATUSES)[number] | "Former";

export interface StackLine {
  name: string;
  tool: string;
  status: Status;
  sources: number[];
  description: string;
  /** The sentence in the cited source that names the tool (Confirmed and Former). */
  evidence?: string;
  /** True when the model said Confirmed but no cited source named the tool at this company. */
  downgraded?: boolean;
}

/**
 * A tool named after the account ("Agilysys Analyze" at Agilysys) is its own
 * product: analytics it sells to its customers, never its internal stack. Moves
 * those lines to Embedded analytics (dropping that category's "Not found") and
 * returns them as embedded evidence.
 */
export function ownProductLines(lines: StackLine[], company: string): MotionEvidence[] {
  const out: MotionEvidence[] = [];
  for (const l of lines) {
    if (!l.tool || l.status === "Not found" || !companyHits(l.tool, company).length) continue;
    if (l.name !== "Embedded analytics") {
      l.name = "Embedded analytics";
      l.description = `${company}'s own analytics product, sold to its customers.`;
    }
    if (l.sources.length) out.push({ source: l.sources[0], signal: `${l.tool} (own product)`, quote: l.evidence || l.tool });
  }
  if (out.length) {
    const keep = lines.filter((l) => !(l.name === "Embedded analytics" && l.status === "Not found"));
    lines.splice(0, lines.length, ...keep);
  }
  return out;
}

// ─── Tool schema ───

const str = (description: string) => ({ type: "string", description });

function motionSide(what: string, usualClock: string) {
  return {
    type: "object",
    description: `The ${what} motion.`,
    properties: {
      clock: str(
        `The event that would set the timing for this motion here (usually ${usualClock}) and how to test it, under 25 words, with [n] where a source shows it. When no source shows a date, name that event as the thing to ask about; never invent a date.`,
      ),
      buyer: str(
        "The role to start with for this motion here, under 15 words, with [n] where a source supports it: a role that exists at the company today, never an open job posting. Roles only; sourced names go in 'people'.",
      ),
      question: str("One discovery question that tests whether this motion is live here, under 20 words."),
    },
    required: ["clock", "buyer", "question"],
    additionalProperties: false,
  };
}

export function accountToolSchema() {
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
              off_topic_sources: {
                type: "array",
                items: { type: "integer" },
                description:
                  "Decide this FIRST. Numbers of sources that are not about this company's own business: a different company or product with the same or a similar name, a person's own use of the product, or a page where the name appears only in passing. Never cite these. Empty when every source is about this company.",
              },
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
                  role: str("Who to start with: a role that exists at the company today, not an open job posting. Put any sourced name in 'people', not here."),
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
              motion: {
                type: "object",
                description:
                  "Which way the seller would sell here. Code decides Internal, Embedded, Both or Unclear from the evidence; you give the embedded evidence numbers and, for each motion, the clock to test, the buyer to start with and one discovery question.",
                properties: {
                  embedded_sources: {
                    type: "array",
                    items: { type: "integer" },
                    description:
                      "Numbers of the sources that show this company ships analytics, reporting, dashboards or insights inside its own product to its customers: product or pricing pages, release notes about reporting, job posts for engineers building customer-facing dashboards or reporting, data product manager roles, or an embedded analytics vendor named in its materials (Looker embedded, Sisense, GoodData, Power BI Embedded, Tableau embedded, Cube, Qrvey, Luzmo, Metabase embedded). Empty when none do. The seller's own marketing doesn't count.",
                  },
                  internal: motionSide("internal analytics (its own teams)", "a renewal with the current BI vendor"),
                  embedded: motionSide("embedded analytics (inside its product, for its customers)", "a customer-facing launch date"),
                },
                required: ["embedded_sources", "internal", "embedded"],
                additionalProperties: false,
              },
              fit: {
                type: "object",
                properties: {
                  grade: { type: "string", enum: ["A", "B", "C"] },
                  motion: {
                    type: "string",
                    enum: ["Internal", "Embedded"],
                    description: "The motion this grade is for: the one the sources support best.",
                  },
                  reason: str("Why this grade for that motion, in 1-2 sentences, citing the signals."),
                },
                required: ["grade", "motion", "reason"],
                additionalProperties: false,
              },
            },
            required: [
              "off_topic_sources", "problem", "target_customer", "core_features", "revenue_model", "industry_trends",
              "investor_perspective", "customer_perspective", "account_line", "people", "start_with",
              "discovery_questions", "migration_objection", "motion", "fit",
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
  noSources = false,
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
   Only data products count: warehouses and lakehouses, transformation, ingestion and orchestration, BI, AI and ML platforms, embedded analytics. General developer tools (Git, Jira, Python, Kubernetes) don't.
   Sources tagged as a greenhouse, lever, ashby or workday job post are ${company}'s own job posts from its public job board: the strongest evidence of what it runs. A tool a post lists only as one option among several ("Snowflake, BigQuery, or Redshift", "e.g. Looker or similar", "platforms (Airflow, Dagster, Prefect)") or as a nice-to-have ("Bonus experience: Looker") is Inferred, not Confirmed.
   A tool a source says ${company} moved off, replaced or shut down still gets its line (code marks it Former). Streaming tools (Kafka, Flink, Kinesis) aren't stack lines. Embedded analytics lines name a vendor (Looker embedded, Sisense, GoodData…), never a product feature or an API; analytics features in its own product go in motion.embedded_sources.
   First list in off_topic_sources any source about a different company with a similar name (for example another business called "${company}"), about someone's personal use of a product, or naming ${company} only in passing, and don't use those sources.
3. People: use roles everywhere. If a source names a person at ${company}, list them in "people" with that source's number; code drops any name the source doesn't show. Never put a person's name in any other field.
4. Why now: only dated events from the last 12 months that a source shows.
5. customer_perspective is synthetic: start it with "Synthetic:".
6. Never write outreach emails, LinkedIn messages or any message to send.
7. Fit grade: A = a clear trigger now, a stack the seller works with, and a matching buying motion. B = plausible, but missing a trigger or evidence. C = weak fit or poor timing. Grade one motion and name it in fit.motion.
8. Exactly seven discovery questions, plus one question per motion in "motion".
9. Motion: internal analytics (its own teams use the product) or embedded analytics (it ships analytics inside its own product to its customers). List in motion.embedded_sources only sources that show the embedded kind: a product or pricing page with analytics, reporting, insights or dashboard features for its customers; release notes about reporting; a job post for engineers building customer-facing dashboards or reporting; a data product manager role; an embedded analytics vendor in its materials. Code checks each one, and with no evidence either way the motion is Unclear: never guess. Write the clock and buyer for both motions; cite sources where they support it.${
    noSources
      ? `\n10. There are NO live sources for this run. Mark every stack line "Not found", name no tools or people at ${company}, state no facts about ${company}, and write what to find out instead.`
      : ""
  }${
    seller && match?.onList
      ? `\n11. ${company} is on ${seller.name}'s public customer list, so this is an existing customer: write the plan for an expansion call (wider use, adoption, renewal risk), not a first sale. In migration_objection, write the main risk to expanding (what would stop wider use), not a migration from another tool.`
      : ""
  }
${seller && match ? sellerPromptBlock(seller, company, match) : "\nNo seller profile was given: grade fit for a modern governed BI and AI analytics platform, and skip any customer-list statement."}`;

  const userContent = `Target account: "${company}"${sourcesBlock}`;
  return { systemPrompt, userContent };
}

// ─── Evidence checks ───

export { isAggregator, mentionsCompany };

// Tool names that are also everyday words need a stricter pattern.
const STRICT_TOOL_PATTERNS: Record<string, RegExp[]> = {
  strategy: [/microstrategy/i, /\bstrategy (one|mosaic)\b/i],
  // Not "Lean Six Sigma"; not "omni-channel".
  sigma: [/sigma computing/i, new RegExp(SIGMA_WORD)],
  omni: [/omni analytics/i, /\bomni\.co\b/i, new RegExp(`\\b${OMNI_WORD}\\b`, "i")],
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

/** Every place a source names the tool, in order. */
function toolHits(text: string, tool: string): { at: number; len: number }[] {
  const folded = fold(text);
  const hits = new Map<number, number>();
  for (const re of toolPatterns(tool)) {
    for (const m of folded.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`))) {
      hits.set(m.index ?? 0, Math.max(hits.get(m.index ?? 0) ?? 0, m[0].length));
    }
  }
  return [...hits].sort((a, b) => a[0] - b[0]).map(([at, len]) => ({ at, len }));
}

/** First place a source names the tool, if any. */
export function findTool(text: string, tool: string): number {
  return toolHits(text, tool)[0]?.at ?? -1;
}

/** "Tableau / Power BI" is two tools; a source must name each of them. A note in parentheses isn't a tool. */
function toolsIn(tool: string): string[] {
  return tool.replace(/\s*\(.*?\)/g, "").split(/\s*(?:\/|,|&|\band\b)\s*/i).map((t) => t.trim()).filter(Boolean);
}

const NEAR = 400;

// Categories and skills, not products: never Confirmed on their own.
const GENERIC_TOOLS = new Set([
  "ai", "genai", "generativeai", "artificialintelligence", "machinelearning", "ml", "llm", "llms", "deeplearning", "nlp",
  "datawarehouse", "datalake", "lakehouse", "etl", "elt", "bi", "businessintelligence", "analytics", "dashboards",
  "reporting", "cloud", "sql", "python", "r", "git", "github", "jira", "api", "apis", "datascience", "bigdata",
]);
export const isGenericTool = (tool: string) => GENERIC_TOOLS.has(squash(tool.replace(/\(.*?\)/g, "")));

// Site furniture: a tool named in a privacy notice, a sign-in prompt, a share
// bar or an event banner says nothing about the company.
const BOILERPLATE = new RegExp(
  [
    "privacy", "cookie", "terms of (use|service)", "©", "all rights reserved", "we['’]re updating", "sign in", "log in",
    "subscribe", "newsletter", "webinar", "virtual (session|event)", "live (virtual )?event", "register (now|today|here)",
    "save (your|a) (spot|seat)", "join us (on|for|live)", "on-demand", "read the recap", "big news",
    "follow (us|twitter|facebook|linkedin)", "email updates", "share (on|this)", "skip to (main )?content",
  ].join("|"),
  "i",
);

// A product page naming a tool as something it connects to ("push your data to
// Snowflake", "integrates with Looker") describes a connector the company sells,
// not its own stack.
const INTEGRATION =
  /\b(?:integrat(?:e|es|ed|ion|ions)\s+with|(?:native|built-in|out-of-the-box|pre-built)\s+(?:integrations?|connectors?)|connectors?\s+(?:for|to)|(?:push|send|sync|export|stream|pipe)\s+(?:your|their|all)\b[^.]{0,60}?\b(?:to|into)\b|(?:connect|sync)\s+(?:your|their)\b)/i;

/**
 * A run of menu or footer links ("Amazon QuickSight Amazon Redshift AWS Glue
 * Follow Twitter"), not a sentence: nearly every word around the tool is
 * capitalized. A source's title (its first line) is never a menu.
 */
function inMenuRun(text: string, at: number, len: number): boolean {
  const lineStart = text.lastIndexOf("\n", at) + 1;
  if (lineStart === 0) return false;
  const nextBreak = text.indexOf("\n", at + len);
  const wordsIn = (s: string) => s.split(/\s+/).map((w) => w.replace(/^\W+/, "")).filter((w) => /[A-Za-z]/.test(w));
  const words = [...wordsIn(text.slice(lineStart, at)).slice(-8), ...wordsIn(text.slice(at + len, nextBreak === -1 ? undefined : nextBreak)).slice(0, 8)];
  return words.length >= 10 && words.filter((w) => /^[A-Z0-9]/.test(w)).length / words.length >= 0.85;
}

/**
 * Where a page names the tool as evidence: outside boilerplate and menus, with
 * how it names it. Job posts (`menus` false) list tools in capitalized runs on purpose.
 */
function evidenceHits(text: string, tool: string, menus = true): { at: number; len: number; kind: MentionKind }[] {
  return toolHits(text, tool).flatMap((h) => {
    const span = sentenceSpan(text, h.at, h.len);
    const sentence = text.slice(span.start, span.end);
    if (BOILERPLATE.test(sentence) || (menus && inMenuRun(text, h.at, h.len))) return [];
    const kind = mentionKind(sentence, h.at - span.start, h.len);
    // Job posts describe the team's own work; elsewhere an integration is the product's, not the stack.
    return [{ ...h, kind: menus && kind === "firm" && INTEGRATION.test(sentence) ? ("option" as MentionKind) : kind }];
  });
}

/**
 * How a page supports "company uses tool": "firm" when it names every tool
 * plainly (not as an option or a nice-to-have), "former" when it says the
 * company moved off every one of them, else "none". The company must appear in
 * the title or within ~400 characters of the tool; `nearOnly` (job-board
 * aggregators) needs it near the tool.
 */
export function pageSupport(text: string, company: string, tools: string[], nearOnly = false): "firm" | "former" | "none" {
  if (!tools.length || tools.some(isGenericTool)) return "none";
  const companyAt = companyHits(text, company);
  if (!companyAt.length) return "none";
  const titleEnd = text.indexOf("\n");
  const inTitle = !nearOnly && companyAt.some((at) => titleEnd === -1 || at < titleEnd);
  const near = (at: number) => inTitle || companyAt.some((c) => Math.abs(c - at) <= NEAR);
  const kinds = tools.map((t) => new Set(evidenceHits(text, t).filter((h) => near(h.at)).map((h) => h.kind)));
  // A source that says the company moved off a tool outweighs one that names it.
  if (kinds.every((k) => k.has("former"))) return "former";
  return kinds.every((k) => k.has("firm")) ? "firm" : "none";
}

/** The page names every tool plainly at the company. */
export function supportsTool(text: string, company: string, tools: string[], nearOnly = false): boolean {
  return pageSupport(text, company, tools, nearOnly) === "firm";
}

/** The source writes this person's name (any spacing or case). */
function mentionsName(text: string, name: string): boolean {
  const words = fold(name).split(/\s+/).filter(Boolean).map(escapeRe);
  return words.length > 0 && new RegExp(`\\b${words.join("\\s+")}\\b`, "i").test(fold(text));
}

/**
 * The sentence around a match, on one line. Sentence ends, line breaks and the
 * " … " seams between excerpt windows are boundaries; a cut never splits a word.
 */
function sentenceSpan(text: string, at: number, len: number): { start: number; end: number; startClean: boolean; endClean: boolean } {
  const lo = Math.max(0, at - 220);
  const hi = Math.min(text.length, at + len + 220);
  let start = lo;
  let startClean = lo === 0;
  for (const m of text.slice(lo, at).matchAll(new RegExp(`${SENTENCE_END.source}|\\n|\\s…\\s`, "g"))) {
    start = lo + (m.index ?? 0) + m[0].length;
    startClean = !m[0].includes("…");
  }
  const em = new RegExp(`${SENTENCE_STOP.source}|\\n|\\s…\\s`).exec(text.slice(at + len, hi));
  const end = em ? at + len + em.index + (/[.!?]/.test(em[0]) ? 1 : 0) : hi;
  const endClean = em ? !em[0].includes("…") : hi === text.length;
  return { start, end, startClean, endClean };
}

function sentenceAround(text: string, at: number, len: number): { quote: string; whole: boolean } {
  let { start, end } = sentenceSpan(text, at, len);
  const { startClean, endClean } = sentenceSpan(text, at, len);
  if (!startClean) {
    const sp = text.indexOf(" ", start);
    if (sp !== -1 && sp < at) start = sp + 1; // drop a partial first word
  }
  if (!endClean) {
    const sp = text.lastIndexOf(" ", end - 1);
    if (sp > at + len) end = sp; // drop a partial last word
  }
  const quote = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (quote.length < 40) {
    // "Snowflake." alone says little: show the words around it instead.
    const a = text.lastIndexOf(" ", Math.max(0, at - 140));
    const b = text.indexOf(" ", Math.min(text.length, at + len + 140));
    const wide = text.slice(a === -1 ? 0 : a, b === -1 ? text.length : b).replace(/\s+/g, " ").trim();
    return { quote: `${a > 0 ? "…" : ""}${wide}${b !== -1 ? "…" : ""}`, whole: false };
  }
  return { quote: `${startClean ? "" : "…"}${quote}${endClean ? "" : "…"}`, whole: startClean && endClean };
}

/**
 * The clearest sentence naming the tool the way the line claims (`kind`):
 * prose over navigation text, whole sentences over cut ones, and a sentence
 * that names the company over one that doesn't.
 */
function bestQuote(texts: { text: string; post: boolean }[], tool: string, company: string, kind: MentionKind = "firm"): string | undefined {
  let best: { quote: string; score: number } | undefined;
  for (const { text, post } of texts) {
    for (const h of evidenceHits(text, tool, !post)) {
      if (h.kind !== kind) continue;
      const { quote, whole } = sentenceAround(text, h.at, h.len);
      const words = quote.split(/\s+/).filter(Boolean);
      const capitalized = words.filter((w) => /^[A-Z]/.test(w)).length / Math.max(1, words.length);
      const score =
        (/[.!?]$/.test(quote) ? 2 : 0) + (whole ? 1 : 0) + (capitalized < 0.4 ? 2 : 0) +
        (quote.length >= 40 && quote.length <= 320 ? 1 : 0) + (mentionsCompany(quote, company) ? 2 : 0);
      if (!best || score > best.score) best = { quote, score };
    }
  }
  return best?.quote;
}

/** The catalog entry for a product name ("Hex (agentic analytics)" -> Hex), signals excluded. */
function catalogTool(tool: string) {
  const key = toolKey(tool);
  return key ? STACK_TOOLS.find((t) => !t.signal && toolKey(t.name) === key) : undefined;
}

// Streaming moves events; it isn't a stack line for an analytics seller.
const STREAMING = /^(?:apache |confluent |amazon |aws )?(?:kafka|flink|kinesis|pulsar|rabbitmq|activemq|msk)\b/i;
// A product feature or an API ("Ramp MCP", "Insights API", "customer dashboards") isn't an embedded analytics vendor.
const NOT_A_VENDOR = /\b(?:mcp|apis?|sdk|dashboards?|reports?|reporting|insights?|portal|analytics|features?|modules?|platform|in-product|customer-facing)\b/i;

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

/** A line's tool name with streaming parts removed ("Airflow / Confluent Kafka" -> "Airflow"); "" when nothing is left. */
function withoutStreaming(tool: string): string {
  const parts = toolsIn(tool.replace(/\s*\(.*?\)/g, ""));
  const kept = parts.filter((t) => !STREAMING.test(t));
  return kept.length === parts.length ? tool : kept.join(" / ");
}

/** An Embedded analytics line that names a feature or an API, not a vendor. */
function notAVendor(tool: string): boolean {
  return NOT_A_VENDOR.test(tool) && !STACK_TOOLS.some((t) => t.category === "Embedded analytics" && !t.signal && t.re.test(tool));
}

const note = (description: string, text: string) => `${description}${description ? " " : ""}(${text})`;

export function verifyStack(
  raw: unknown,
  company: string,
  sourceText: Map<number, string>,
  nearOnly: Set<number> = new Set(),
  /** Job-post sources: how each post names each catalog tool. */
  boardMentions: Map<number, Mention[]> = new Map(),
): StackLine[] {
  const valid = new Set(sourceText.keys());
  const items = Array.isArray(raw) ? raw : [];
  const lines: StackLine[] = items.flatMap((r) => {
    const item = (r ?? {}) as Partial<StackLine>;
    const typed = String(item.tool ?? "").trim();
    const tool = withoutStreaming(typed);
    if (typed && !tool) return [];
    let name = canonicalCategory(String(item.name ?? ""));
    if (name === "Embedded analytics" && tool && notAVendor(tool)) return [];
    // A known product sits in its own category ("Hex" is BI, wherever the model put it).
    const known = toolsIn(tool).length === 1 ? catalogTool(tool) : undefined;
    if (known) name = known.category;
    let status: Status = STATUSES.includes(item.status as (typeof STATUSES)[number]) ? (item.status as Status) : "Inferred";
    let sources = [...new Set((Array.isArray(item.sources) ? item.sources : []).map(Number).filter((n) => valid.has(n)))].sort((x, y) => x - y);
    let description = sanitizeCitations(String(item.description ?? ""), valid).trim();
    let evidence: string | undefined;
    let downgraded = false;
    if (status === "Not found") sources = [];
    const named = toolsIn(tool);
    const checkable = named.length > 0 && !named.some(isGenericTool);
    // How each cited source names the tool(s): plainly, as one option, or as something the company moved off.
    const support = (id: number): "firm" | "former" | "option" | "none" => {
      const posts = boardMentions.get(id);
      if (!posts) return checkable ? pageSupport(sourceText.get(id) ?? "", company, named, nearOnly.has(id)) : "none";
      const found = named.map((t) => posts.find((m) => toolKey(m.tool.name) === toolKey(t)));
      if (!checkable || found.some((m) => !m)) return "none";
      return found.every((m) => m!.firm) ? "firm" : found.every((m) => m!.former) ? "former" : "option";
    };
    const read = new Map(sources.map((id) => [id, support(id)]));
    const formerIds = sources.filter((id) => read.get(id) === "former");
    const firmIds = sources.filter((id) => read.get(id) === "firm");
    const texts = (ids: number[]) => ids.map((id) => ({ text: sourceText.get(id) ?? "", post: boardMentions.has(id) }));
    if (status !== "Not found" && formerIds.length && !firmIds.some((id) => boardMentions.has(id))) {
      // A source says the company moved off it (and none of its own job posts still names it plainly).
      status = "Former";
      sources = formerIds;
      evidence = bestQuote(texts(formerIds), named[0], company, "former");
      description = "A cited source says the company moved off it or replaced it.";
    } else if (status === "Confirmed") {
      if (firmIds.length) {
        sources = firmIds;
        evidence = bestQuote(texts(firmIds), named[0], company);
      } else {
        status = "Inferred";
        downgraded = true;
        const options = sources.some((id) => read.get(id) === "option" && boardMentions.has(id));
        description = !checkable
          ? note(description, "Not a named product, so this is marked Inferred.")
          : options
          ? note(description, `Its own job posts list ${tool} only as one option among several, so this is marked Inferred.`)
          : note(description, `No cited source names ${tool || "it"} plainly at ${company}, so this is marked Inferred.`);
      }
    }
    return [{
      name,
      tool,
      status,
      sources,
      description,
      ...(evidence ? { evidence } : {}),
      ...(downgraded ? { downgraded } : {}),
    }];
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

// ─── The company's own job posts ───

const TOOL_ALIASES: Record<string, string> = {
  postgresql: "postgres",
  sigmacomputing: "sigma",
  modeanalytics: "mode",
  anthropicclaude: "claude",
  pyspark: "spark",
  awsglue: "glue",
  awsredshift: "redshift",
};

/** One key per product: "Amazon Redshift" = "Redshift", "Apache Spark" = "Spark", "Postgres" = "PostgreSQL". */
export function toolKey(name: string): string {
  const k = squash(name.replace(/\(.*?\)/g, "").replace(VENDOR_PREFIX, "").replace(/^apache\s+/i, ""));
  return TOOL_ALIASES[k] ?? k;
}

/** Stack lines from the company's own job posts: Confirmed when a post names the tool plainly. */
export function jobBoardLines(boards: { id: number; text: string }[], scan?: ScanSummary): StackLine[] {
  // Per tool: the posts that name it plainly, and the posts that mention it at all.
  const found = new Map<string, { line: StackLine; firm: number[]; former: number[]; any: number[]; formerQuote?: string }>();
  for (const b of boards) {
    for (const m of toolMentions(b.text)) {
      // "Customer-facing dashboards" is a motion signal, not a product.
      if (m.tool.signal) continue;
      const key = toolKey(m.tool.name);
      let f = found.get(key);
      if (!f) {
        f = { line: { name: m.tool.category, tool: m.tool.name, status: "Inferred", sources: [], description: "" }, firm: [], former: [], any: [] };
        found.set(key, f);
      }
      f.any.push(b.id);
      if (m.firm) {
        f.firm.push(b.id);
        if (!f.line.evidence) f.line.evidence = m.quote;
      } else if (m.former) {
        f.former.push(b.id);
        f.formerQuote ??= m.quote;
      }
    }
  }
  // A Confirmed line cites only the posts that confirm it.
  const lines = new Map<string, StackLine>();
  for (const [key, f] of found) {
    f.line.status = f.firm.length ? "Confirmed" : f.former.length ? "Former" : "Inferred";
    f.line.sources = [...new Set(f.firm.length ? f.firm : f.former.length ? f.former : f.any)].sort((x, y) => x - y);
    if (f.line.status === "Former") f.line.evidence = f.formerQuote;
    lines.set(key, f.line);
  }
  const label = scan?.ats ? ATS_LABEL[scan.ats] : "job board";
  // Greenhouse, Lever and Ashby list every open role; on Workday the scan reads the roles its searches surface.
  const roles = scan?.ats === "workday" ? "data and engineering roles read" : "open roles";
  for (const l of lines.values()) {
    const c = scan?.tools.find((t) => toolKey(t.tool) === toolKey(l.tool));
    l.description =
      l.status === "Confirmed"
        ? c && scan?.scanned_jobs
          ? `Named in ${c.posts} of the ${scan.scanned_jobs} ${roles} on its ${label} board.`
          : `Named in its own job post on ${label}.`
        : l.status === "Former"
        ? `Its own ${label} job post describes moving off it.`
        : `Listed only as one option among several in its own ${label} job posts, so this is Inferred.`;
  }
  return [...lines.values()];
}

const CATEGORY_CAP = 4;

/**
 * Fold the job-post lines into the model's verified lines: a post that names a
 * tool plainly confirms it; options-only mentions fill a category only when
 * nothing there is Confirmed. "Not found" placeholders give way.
 */
export function mergeStack(lines: StackLine[], board: StackLine[]): StackLine[] {
  const out = lines.map((l) => ({ ...l, sources: [...l.sources] }));
  const single = (l: StackLine) => toolsIn(l.tool).length === 1;
  for (const b of board.filter((l) => l.status === "Confirmed")) {
    const hit = out.find((l) => single(l) && toolKey(l.tool) === toolKey(b.tool));
    if (hit) {
      const wasConfirmed = hit.status === "Confirmed";
      hit.status = "Confirmed";
      hit.name = b.name;
      hit.sources = [...new Set([...hit.sources, ...b.sources])].sort((x, y) => x - y);
      if (!wasConfirmed || !hit.evidence) {
        hit.evidence = b.evidence;
        hit.description = b.description;
      }
      delete hit.downgraded;
    } else out.push({ ...b });
  }
  // Its own post describes moving off a tool (and no post names it plainly): that outranks a page that names it.
  for (const b of board.filter((l) => l.status === "Former")) {
    const at = out.findIndex((l) => single(l) && toolKey(l.tool) === toolKey(b.tool));
    if (at === -1) out.push({ ...b });
    else out[at] = { ...b };
  }
  for (const b of board.filter((l) => l.status === "Inferred")) {
    if (out.some((l) => toolsIn(l.tool).some((t) => toolKey(t) === toolKey(b.tool)))) continue;
    if (out.some((l) => l.name === b.name && l.status === "Confirmed")) continue;
    if (out.filter((l) => l.name === b.name && l.status === "Inferred").length >= 2) continue;
    out.push({ ...b });
  }
  const order = (n: string) => {
    const i = (STACK_CATEGORIES as readonly string[]).indexOf(n);
    return i === -1 ? STACK_CATEGORIES.length : i;
  };
  const RANKS: Record<Status, number> = { Confirmed: 0, Inferred: 1, Former: 2, "Not found": 3 };
  const rank = (l: StackLine) => RANKS[l.status];
  const sorted = out
    .filter((l) => l.status !== "Not found" || !out.some((o) => o.name === l.name && o.status !== "Not found"))
    .sort((a, b) => order(a.name) - order(b.name) || rank(a) - rank(b) || b.sources.length - a.sources.length);
  // One line per product: "Databricks (Lakehouse, Delta Lake)" and "Databricks" are the same tool.
  const kept: StackLine[] = [];
  for (const l of sorted) {
    const twin = single(l) && l.tool ? kept.find((k) => single(k) && toolKey(k.tool) === toolKey(l.tool) && k.status === l.status) : undefined;
    if (twin) twin.sources = [...new Set([...twin.sources, ...l.sources])].sort((x, y) => x - y);
    else kept.push(l);
  }
  // Keep the plan readable: at most four lines per category, Confirmed first.
  const seen = new Map<string, number>();
  return kept.filter((l) => {
    const n = (seen.get(l.name) ?? 0) + 1;
    seen.set(l.name, n);
    return n <= CATEGORY_CAP;
  });
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
  fit?: { grade?: string; motion?: string; reason?: string };
  motion?: MotionRead;
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
    /** The company's domain, when the user typed one ("bandwidth.com"). */
    domain?: string;
  },
): { brief: AccountBrief; plan: string } {
  const { company, research, excerpts, seller, match, domain } = ctx;
  const sourceText = new Map<number, string>();
  // Sources the model judged to be about something else can't support anything.
  const offTopic = new Set(
    (Array.isArray(rawBrief.off_topic_sources) ? rawBrief.off_topic_sources : []).map(Number).filter((n) => research.sources.some((s) => s.id === n)),
  );
  // Job posts: the post's own words only (their snippet is ours, not theirs).
  const boards: { id: number; text: string }[] = [];
  research.sources.forEach((s, i) => {
    if (offTopic.has(s.id)) return;
    if (s.via) {
      sourceText.set(s.id, `${s.title}\n${excerpts[i] ?? ""}`);
      boards.push({ id: s.id, text: excerpts[i] ?? "" });
    } else sourceText.set(s.id, `${s.title}\n${s.snippet}\n${excerpts[i] ?? ""}`);
  });
  const valid = new Set(sourceText.keys());
  const boardMentions = new Map(boards.map((b) => [b.id, toolMentions(b.text)]));

  const listWording = (t: string) => (seller ? customerListWording(t, seller.name) : t);
  const tidy = (t: unknown) => listWording(sanitizeCitations(String(t ?? ""), valid)).trim();

  const noSources = research.sources.length === 0;
  const brief = { ...rawBrief } as AccountBrief;
  for (const k of TEXT_FIELDS) brief[k] = tidy(brief[k]);
  // Nothing was checked, so nothing about the stack is known: unknown means Not found.
  brief.core_features = noSources
    ? STACK_CATEGORIES.map((name) => ({ name, tool: "", status: "Not found" as const, sources: [], description: "No live sources were checked." }))
    : mergeStack(
        verifyStack(rawBrief.core_features, company, sourceText, new Set(research.sources.filter((s) => isAggregator(s.url)).map((s) => s.id)), boardMentions),
        jobBoardLines(boards, research.scan),
      );
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
  // Motion: decided in code from evidence the sources show; Unclear when there is none.
  const rawMotion = (rawBrief.motion ?? {}) as { embedded_sources?: unknown };
  const embedded = noSources
    ? []
    : embeddedEvidence({
        company,
        domain,
        research,
        sourceText,
        boardText: new Map(boards.map((b) => [b.id, b.text])),
        cited: (Array.isArray(rawMotion.embedded_sources) ? rawMotion.embedded_sources : []).map(Number),
      });
  embedded.push(...ownProductLines(brief.core_features, company));
  const internal = noSources ? [] : internalEvidence({ company, research, sourceText, stack: brief.core_features });
  const postings = research.sources.filter((s) => s.kind === "jobs").map((s) => s.title);
  brief.motion = buildMotion(rawBrief.motion, internal, embedded, tidy, seller, postings);
  // No embedded vendor named, but signals of in-product analytics: say where they are.
  if (embedded.length) {
    for (const l of brief.core_features) {
      if (l.name === "Embedded analytics" && l.status === "Not found") {
        l.description = "No embedded analytics vendor is named. The signals of analytics inside its product are under Motion.";
      }
    }
  }

  const fit = (rawBrief.fit ?? {}) as { grade?: string; motion?: string; reason?: string };
  const motionGraded = fitMotion(brief.motion.label, fit.motion, brief.motion);
  let grade = ["A", "B", "C"].includes(String(fit.grade)) ? String(fit.grade) : "B";
  // An A needs a matching buying motion; with none shown, B is the ceiling.
  if (motionGraded === "Unclear" && grade === "A") grade = "B";
  brief.fit = { grade, motion: motionGraded, reason: tidy(fit.reason) };

  if (!/^\s*synthetic/i.test(String(brief.customer_perspective))) {
    brief.customer_perspective = `Synthetic: ${brief.customer_perspective}`;
  }
  if (noSources && !/no live sources were checked/i.test(String(brief.problem))) {
    brief.problem = `No live sources were checked for this run. ${brief.problem}`;
  }
  brief.company = company;
  delete brief.off_topic_sources;
  brief.research = { ...research, sources: research.sources.map((s) => (offTopic.has(s.id) ? { ...s, off_topic: true } : s)) };
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
 * For agents that read an account brief (critics, expand, distill, synthesis):
 * every string in their result keeps only citations to the brief's real
 * sources and gets the seller's customer-list wording. Other lenses pass through.
 */
export function accountOutputTidy(brief: unknown): <T>(value: T) => T {
  const b = brief as { lens?: unknown; seller?: unknown; research?: { sources?: unknown } } | null;
  if (b?.lens !== "account") return (value) => value;
  const sources = Array.isArray(b.research?.sources) ? (b.research!.sources as { id?: unknown; off_topic?: unknown }[]) : [];
  const valid = new Set(sources.filter((s) => s && !s.off_topic).map((s) => Number(s.id)).filter(Number.isFinite));
  const seller = asSeller(b.seller);
  const fix = (s: string) => (seller ? customerListWording(sanitizeCitations(s, valid), seller.name) : sanitizeCitations(s, valid));
  const walk = (v: unknown): unknown =>
    typeof v === "string"
      ? fix(v)
      : Array.isArray(v)
      ? v.map(walk)
      : v && typeof v === "object"
      ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
      : v;
  return <T>(value: T) => walk(value) as T;
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

/** Word caps per free-text section when a plan runs long; "tight" is the last resort. */
const CAPS = {
  short: { line: 30, whyNow: 70, role: 10, why: 40, q: 20, mq: 20, objection: 25, answer: 60, verify: 60, fit: 40, clock: 25, buyer: 15, stackPerCategory: 4 },
  tight: { line: 25, whyNow: 45, role: 10, why: 25, q: 15, mq: 15, objection: 20, answer: 35, verify: 35, fit: 30, clock: 18, buyer: 12, stackPerCategory: 2 },
} as const;
type Caps = { [K in keyof (typeof CAPS)["short"]]: number };

/**
 * The First-call plan, assembled from checked fields (300-600 words). Too long:
 * drop the Inferred notes (they stay in the brief), then cap each free-text
 * section in whole sentences, then cap harder and show at most two stack lines
 * per category, then one line per category and no per-motion questions (they
 * stay in the brief). Sections are never cut mid-sentence.
 */
export function composePlan(company: string, brief: AccountBrief, noSources: boolean): string {
  const tiers: { stackNotes: boolean; caps?: Caps; motionQuestions?: false }[] = [
    { stackNotes: true },
    { stackNotes: false },
    { stackNotes: false, caps: CAPS.short },
    { stackNotes: false, caps: CAPS.tight },
    { stackNotes: false, caps: { ...CAPS.tight, stackPerCategory: 1 }, motionQuestions: false },
  ];
  let plan = "";
  for (const tier of tiers) {
    plan = buildPlan(company, brief, noSources, tier);
    if (wordCount(plan) <= PLAN_MAX_WORDS) return plan;
  }
  return plan;
}

/**
 * About n words at most, in whole sentences and lines: a section never ends
 * mid-sentence, so the first sentence stays even when it runs long. "e.g." doesn't
 * end a sentence, and a citation after the stop stays with its sentence.
 */
export function capWords(text: string, n: number): string {
  if (wordCount(text) <= n) return text;
  const units: { text: string; sep: string }[] = [];
  text.split(/\n+/).forEach((line, li) => {
    line.split(SENTENCE_END).map((s) => s.trim()).filter(Boolean).forEach((s, si) => {
      const cite = /^(\[[\d,\s–-]+\])\s*(.*)$/.exec(s);
      if (cite && units.length && si > 0) {
        units[units.length - 1].text += ` ${cite[1]}`;
        if (cite[2]) units.push({ text: cite[2], sep: " " });
      } else units.push({ text: s, sep: si === 0 && li > 0 ? "\n" : " " });
    });
  });
  // One long sentence that lists items ("(1) ...; (2) ..."): keep whole items.
  const first = units[0]?.text ?? "";
  let out = first;
  if (wordCount(first) > n && first.includes("; ")) {
    const items = first.split(/(?<=;)\s+/);
    out = items[0];
    for (const item of items.slice(1)) {
      if (wordCount(`${out} ${item}`) > n) break;
      out += ` ${item}`;
    }
    return out.replace(/;$/, ".");
  }
  for (const u of units.slice(1)) {
    if (wordCount(`${out} ${u.text}`) > n) break;
    out += `${u.sep}${u.text}`;
  }
  return out;
}

const MOTION_NAME = { internal: "Internal", embedded: "Embedded" } as const;

/**
 * MOTION: the label, then for each motion the sources show: what shows it, the
 * clock to test and the buyer to start with, each with citations. Unclear means
 * nothing showed either motion, so both are listed as things to test.
 */
function motionBlock(
  motion: MotionRead,
  graded: string | undefined,
  cap: (t: unknown, n: number) => string,
  caps: { clock: number; buyer: number } = { clock: 25, buyer: 15 },
): string[] {
  const out = [`MOTION: ${motion.label}`];
  const live = (["internal", "embedded"] as const).filter((id) => motion[id].sources.length > 0);
  // The graded motion leads when both are live.
  if (live.length === 2 && graded === "Embedded") live.reverse();
  const detail = (id: "internal" | "embedded") => [
    `  Clock to test: ${cap(motion[id].clock, caps.clock)}`,
    `  Buyer to start with: ${cap(motion[id].buyer, caps.buyer)}`,
  ];
  if (!live.length) {
    out.push("No source shows either motion yet, so test both on the call.");
    for (const id of ["internal", "embedded"] as const) {
      out.push(`- ${MOTION_NAME[id]}: nothing in the sources yet`, ...detail(id));
    }
    return out;
  }
  for (const id of live) out.push(`- ${MOTION_NAME[id]}: ${signalLine(motion[id])}`, ...detail(id));
  if (live.length === 1) {
    out.push(
      live[0] === "internal"
        ? "- Embedded: no source shows analytics inside its product for its customers."
        : "- Internal: no source shows the stack its own teams use for analytics.",
    );
  }
  return out;
}

function buildPlan(
  company: string,
  brief: AccountBrief,
  noSources: boolean,
  opts: { stackNotes: boolean; caps?: Caps; motionQuestions?: false },
): string {
  // With caps, every free-text section is cut to its word limit so the plan fits in 600 words.
  const c = opts.caps;
  const cap = (t: unknown, n: number) => (c ? capWords(String(t ?? ""), n) : String(t ?? ""));
  const out: string[] = [`FIRST-CALL PLAN: ${company}`];
  if (noSources) {
    out.push("", "No live sources were checked for this run. Everything below is general knowledge, so verify it before the call.");
  }
  if (brief.motion) out.push("", ...motionBlock(brief.motion, brief.fit?.motion, cap, c ?? CAPS.short));
  out.push("", "ACCOUNT IN ONE LINE", cap(brief.account_line, c?.line ?? 30));
  out.push("", "STACK READ");
  const shown = new Map<string, number>();
  for (const l of brief.core_features) {
    const n = (shown.get(l.name) ?? 0) + 1;
    shown.set(l.name, n);
    if (c && n > c.stackPerCategory) continue; // the full read stays in the brief
    if (l.status === "Not found") out.push(`- ${l.name}: Not found`);
    else if (l.status === "Confirmed") out.push(`- ${l.name}: ${l.tool} (Confirmed${cites(l.sources)})`);
    else if (l.status === "Former") out.push(`- ${l.name}: ${l.tool} (Former: moved off it${cites(l.sources)})`);
    else out.push(`- ${l.name}: ${l.tool || "tool not named"} (Inferred${cites(l.sources)})${opts.stackNotes && l.description ? `. ${l.description}` : ""}`);
  }
  const scan = (brief.research as { scan?: ScanSummary } | undefined)?.scan;
  if (scan?.found && scan.ats && scan.scanned_jobs) {
    out.push(`(Job-board scan: read ${scan.scanned_jobs} open roles on its ${ATS_LABEL[scan.ats]} board.)`);
  }
  out.push("", "WHY NOW", cap(brief.revenue_model, c?.whyNow ?? 70));
  const role = cap(brief.start_with?.role, c?.role ?? 10).replace(/[.\s]+$/, "");
  out.push("", "WHO TO START WITH", [role, cap(brief.start_with?.why, c?.why ?? 40)].filter(Boolean).join(". "));
  const people = brief.people ?? [];
  if (people.length) out.push(`Named in the sources: ${people.map((p) => `${p.name}, ${p.role} [${p.source}]`).join("; ")}.`);
  const questions = brief.discovery_questions ?? [];
  out.push(
    "",
    questions.length === 7 ? "SEVEN DISCOVERY QUESTIONS" : `${questions.length} DISCOVERY QUESTIONS`,
    ...questions.map((q, i) => `${i + 1}. ${cap(q, c?.q ?? 20)}`),
  );
  const perMotion = brief.motion && opts.motionQuestions !== false
    ? (["internal", "embedded"] as const)
        .map((id) => ({ id, q: cap(brief.motion![id].question, c?.mq ?? 20) }))
        .filter((x) => x.q)
    : [];
  if (perMotion.length) {
    out.push("", "ONE QUESTION PER MOTION", ...perMotion.map((x) => `${MOTION_NAME[x.id]}: ${x.q}`));
  }
  out.push(
    "",
    (brief.customer_list as { on_list?: boolean } | undefined)?.on_list ? "THE EXPANSION RISK" : "THE MIGRATION OBJECTION",
    `"${cap(brief.migration_objection?.objection, c?.objection ?? 25)}"`,
    `Honest answer: ${cap(brief.migration_objection?.honest_answer, c?.answer ?? 60)}`,
  );
  out.push("", "WHAT TO VERIFY BEFORE THE CALL", cap(brief.investor_perspective, c?.verify ?? 60));
  const graded = brief.fit?.motion;
  const forMotion = graded === "Internal" || graded === "Embedded" ? ` (${graded} motion)` : graded === "Unclear" ? " (motion unclear)" : "";
  out.push("", `FIT GRADE: ${brief.fit?.grade ?? "B"}${forMotion}`, cap(brief.fit?.reason, c?.fit ?? 40));
  const list = brief.customer_list as { sentence?: string } | undefined;
  if (list?.sentence) out.push("", "CUSTOMER LIST", list.sentence);
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
