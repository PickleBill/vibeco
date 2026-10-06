// The account's buying motion for the seller: Internal (analytics for its own
// teams), Embedded (analytics shipped inside its product to its customers),
// Both, or Unclear. Code decides the label from evidence it can check in the
// sources; the model writes the clock, the buyer and one question per motion.
// No evidence either way means Unclear: the label is never a guess.
import { companyHits, isOwnSite } from "./match.ts";
import type { Research } from "./research.ts";
import type { SellerMotion } from "./sellers/index.ts";
import { EMBEDDED_PHRASE, EMBEDDED_ROLE, sentencesOf, toolMentions } from "./stack-tools.ts";

export type MotionLabel = "Internal" | "Embedded" | "Both" | "Unclear";
export type MotionId = "internal" | "embedded";
export const MOTION_LABELS: MotionLabel[] = ["Internal", "Embedded", "Both", "Unclear"];

export interface MotionEvidence {
  source: number;
  /** The words that show it: a phrase, a tool or a role title. */
  signal: string;
  /** The sentence it came from. */
  quote: string;
}

export interface MotionSide {
  /** Sources that show this motion, checked in code. Empty when none do. */
  sources: number[];
  evidence: MotionEvidence[];
  /** The clock to test, with citations. */
  clock: string;
  /** The buyer to start with, with citations. */
  buyer: string;
  /** One discovery question that tests this motion. */
  question: string;
}

export interface MotionRead {
  label: MotionLabel;
  internal: MotionSide;
  embedded: MotionSide;
}

/** One line of the stack read, as far as the motion cares. */
interface StackLineLike {
  name: string;
  tool: string;
  status: string;
  sources: number[];
}

// Reporting or analytics features the company offers its own customers, as a
// product page puts it. Counted only on the company's own site.
const PRODUCT_FEATURE =
  /\b(?:analytics|reporting|reports|insights|dashboards?)\s+(?:for|to)\s+(?:your|their)\s+(?:customers|clients|users|merchants|members|partners|teams?)\b|\b(?:customers|clients|users|merchants|members)\s+(?:can|get|see|track|view)\b[^.]{0,60}?\b(?:dashboards?|reports|reporting|analytics|insights)\b|\b(?:real-time|custom|interactive|self-serve)\s+(?:dashboards?|reports|reporting|analytics)\b|\b(?:reporting|analytics|insights)\s+(?:dashboard|portal|API|module|suite|hub)s?\b/i;

// Warehouses that usually run the product itself, not the analytics on top.
const OPERATIONAL = /^(?:postgresql|postgres|clickhouse|apache kafka|kafka)$/i;
// A data, analytics or BI role: the account runs analytics for its own teams.
const DATA_ROLE_TITLE =
  /\b(?:data|analytics|BI|business intelligence|insights|reporting)\b[^|()]{0,30}\b(?:analyst|engineer|scientist|developer|architect|manager|lead|director|head)\b|\banalytics engineer/i;

const HIRING_PATH = /\/(?:careers?|jobs?|hiring|join|team|people|culture|about)(?:\/|$|[-_.?#])/i;
const pathOf = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
};

const quoteOf = (sentence: string) => (sentence.length > 240 ? `${sentence.slice(0, 237)}…` : sentence);

/** The first sentence showing analytics shipped to customers: a phrase, a vendor named plainly, or (own site) a product feature. */
function embeddedIn(text: string, ownSite: boolean): { signal: string; quote: string } | undefined {
  for (const sentence of sentencesOf(text)) {
    const phrase = EMBEDDED_PHRASE.exec(sentence) ?? (ownSite ? PRODUCT_FEATURE.exec(sentence) : null);
    if (phrase) return { signal: phrase[0], quote: quoteOf(sentence) };
    const vendor = toolMentions(sentence).find((m) => m.firm && m.tool.category === "Embedded analytics");
    if (vendor) return { signal: vendor.tool.name, quote: quoteOf(sentence) };
  }
  return undefined;
}

/** Near a mention of the company (or anywhere on a page whose title names it). */
function aboutCompany(text: string, company: string, at: number): boolean {
  const hits = companyHits(text, company);
  const titleEnd = text.indexOf("\n");
  return hits.some((h) => (titleEnd !== -1 && h < titleEnd) || Math.abs(h - at) <= 400);
}

/** A job post's role, without our " at Company (Greenhouse job post)" suffix. */
const roleOf = (title: string) => title.replace(/\s+at\s+.+$/i, "").trim();

/**
 * Embedded evidence, checked in code:
 * - the company's own job posts that plainly name embedded work, an embedded
 *   vendor, or a role building analytics for customers;
 * - pages on its own site showing analytics, reporting or dashboards for its customers;
 * - other sources the model cites, when the text names embedded work near the company.
 */
export function embeddedEvidence(ctx: {
  company: string;
  domain?: string;
  research: Research;
  sourceText: Map<number, string>;
  boardText: Map<number, string>;
  cited: number[];
}): MotionEvidence[] {
  const { company, domain, research, sourceText, boardText } = ctx;
  const cited = new Set(ctx.cited);
  const out: MotionEvidence[] = [];
  for (const s of research.sources) {
    const text = sourceText.get(s.id);
    if (text === undefined) continue; // off topic
    if (s.via) {
      const post = boardText.get(s.id) ?? "";
      const firm = toolMentions(post).find((m) => m.firm && m.tool.category === "Embedded analytics");
      if (firm) {
        out.push({ source: s.id, signal: firm.tool.name === "Customer-facing analytics" ? (EMBEDDED_PHRASE.exec(firm.quote)?.[0] ?? firm.tool.name) : firm.tool.name, quote: firm.quote });
      } else if (EMBEDDED_ROLE.test(roleOf(s.title))) {
        out.push({ source: s.id, signal: `${roleOf(s.title)} role`, quote: roleOf(s.title) });
      }
      continue;
    }
    const own = isOwnSite(s.url, company, domain);
    if (!own && !cited.has(s.id)) continue;
    // A careers page describes the team's own work, not the product.
    const found = embeddedIn(text, own && !HIRING_PATH.test(pathOf(s.url)));
    if (!found) continue;
    if (!own && !aboutCompany(text, company, text.indexOf(found.quote.replace(/…$/, "").slice(0, 60)))) continue;
    out.push({ source: s.id, ...found });
  }
  return out;
}

/** Internal evidence: Confirmed BI, warehouse or dbt lines, and data or analytics roles at the company. */
export function internalEvidence(ctx: {
  company: string;
  research: Research;
  sourceText: Map<number, string>;
  stack: StackLineLike[];
}): MotionEvidence[] {
  const out: MotionEvidence[] = [];
  for (const l of ctx.stack) {
    if (l.status !== "Confirmed" || !l.sources.length) continue;
    const counts =
      l.name === "BI tools" || (l.name === "Warehouse" && !OPERATIONAL.test(l.tool)) || /^dbt$/i.test(l.tool);
    if (counts) out.push({ source: l.sources[0], signal: l.tool, quote: `${l.name}: ${l.tool}` });
  }
  for (const s of ctx.research.sources) {
    if (s.kind !== "jobs" || !ctx.sourceText.has(s.id)) continue;
    const role = roleOf(s.title);
    const atCompany = !!s.via || companyHits(s.title, ctx.company).length > 0;
    if (atCompany && DATA_ROLE_TITLE.test(role) && !EMBEDDED_ROLE.test(role)) {
      out.push({ source: s.id, signal: `${role.replace(/\s*[|–—-]\s.*$/, "")} role`, quote: role });
      if (out.filter((e) => e.signal.endsWith(" role")).length >= 2) break;
    }
  }
  return out;
}

export function decideMotion(internal: MotionEvidence[], embedded: MotionEvidence[]): MotionLabel {
  if (internal.length && embedded.length) return "Both";
  if (embedded.length) return "Embedded";
  if (internal.length) return "Internal";
  return "Unclear";
}

const uniq = (ids: number[]) => [...new Set(ids)].sort((a, b) => a - b);
const hasCitation = (t: string) => /\[\d+(?:,\s*\d+)*\]/.test(t);

/**
 * The motion read for the brief. `raw` is the model's motion object; `tidy`
 * keeps its citations honest. A motion with evidence gets clock and buyer lines
 * that carry citations: the model's own, or the evidence it rests on.
 */
export function buildMotion(
  raw: unknown,
  internal: MotionEvidence[],
  embedded: MotionEvidence[],
  tidy: (t: unknown) => string,
  seller?: { motions: SellerMotion[] },
): MotionRead {
  const r = (raw ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const side = (id: MotionId, evidence: MotionEvidence[]): MotionSide => {
    const m = r[id] ?? {};
    const sources = uniq(evidence.map((e) => e.source));
    const cite = (t: string) => (t && sources.length && !hasCitation(t) ? `${t.replace(/[.\s]+$/, "")} [${sources.slice(0, 3).join(", ")}]` : t);
    const playbook = seller?.motions.find((x) => x.id === id);
    let clock = tidy(m.clock);
    let buyer = tidy(m.buyer);
    if (playbook && (!sources.length || !clock)) {
      // Nothing shows this motion, or the model left it blank: what usually holds, from the seller's playbook.
      clock = `Usually ${playbook.clock}.`;
    }
    if (playbook && (!sources.length || !buyer)) buyer = playbook.buyers.join(", or ");
    return {
      sources,
      evidence: evidence.slice(0, 4),
      clock: cite(clock),
      buyer: cite(buyer),
      question: tidy(m.question),
    };
  };
  return {
    label: decideMotion(internal, embedded),
    internal: side("internal", internal),
    embedded: side("embedded", embedded),
  };
}

/** The motion a fit grade is for: the model's pick when both are live, else the one that is. */
export function fitMotion(label: MotionLabel, picked: unknown, read: MotionRead): "Internal" | "Embedded" | "Unclear" {
  if (label === "Internal" || label === "Embedded") return label;
  if (label === "Unclear") return "Unclear";
  if (picked === "Internal" || picked === "Embedded") return picked;
  return read.embedded.sources.length >= read.internal.sources.length ? "Embedded" : "Internal";
}

/** "customer-facing dashboards [3]; Data Product Manager role [4]" */
export function signalLine(side: MotionSide): string {
  const seen = new Set<string>();
  return side.evidence
    .filter((e) => {
      const k = e.signal.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 3)
    .map((e) => `${e.signal} [${e.source}]`)
    .join("; ");
}
