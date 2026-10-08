// The Whiteboard's data: a partnership riff as the partner-riff function returns
// it, read defensively; the price-to-value math (in code, never the model); and
// the plain-text version a seller can forward.
import { supabase } from "@/integrations/supabase/client";

export type RiffFit = "strong" | "possible" | "not_a_fit";
export type RiffPricing = "platform_plus_per_customer" | "platform_plus_per_seat" | "custom";
export type Range = [number, number];

export interface RiffAssumptions {
  end_customers: Range;
  premium_adoption_pct: Range;
  premium_price_per_customer_month: Range;
  seats_per_customer: Range;
  omni_platform_fee_year: Range;
  omni_per_customer_year: Range;
  omni_per_seat_year: Range;
}

export interface PartnerRiff {
  company: string;
  headline: string;
  confidence: "high" | "medium" | "low";
  grounding: "sources" | "model-knowledge" | "illustrative";
  embedded_fit: { verdict: RiffFit; why: string };
  situation: { claim: string; basis: "known" | "inferred"; sources: number[] }[];
  embedded_opportunity: { surface: string; end_customer_sees: string; metrics: string[] }[];
  integration: {
    stack: { tool: string; status: "Confirmed" | "Inferred"; sources: number[] }[];
    incumbent: { name: string; status: "Confirmed" | "Inferred"; sources: number[] } | null;
    omni_fit: string;
  };
  gtm: { pricing_shape: RiffPricing; monetization: string[]; assumptions: RiffAssumptions; notes: Partial<Record<keyof RiffAssumptions, string>> };
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  internal_play: string | null;
  next_move: { who: string; first_question: string };
}

export interface RiffSource {
  id: number;
  title: string;
  url: string;
  kind: "company" | "site" | "jobs" | "web";
  snippet: string;
}

export interface RiffResult {
  riff: PartnerRiff;
  sources: RiffSource[];
  model?: string;
  latencyMs?: number;
  cached?: boolean;
  savedAt?: string;
  /** The domain, for the logo. */
  domain?: string;
  /** A made-up company, to show the format. */
  example?: boolean;
}

// ─── Reading the function's answer ───

const str = (v: unknown, max = 400) => (typeof v === "string" ? v.replace(/\s*[—–]\s*/g, ", ").trim().slice(0, max) : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const ids = (v: unknown) => arr(v).map(Number).filter((n) => Number.isInteger(n) && n > 0);
const range = (v: unknown, def: Range): Range => {
  const n = arr(v).map(Number).filter((x) => Number.isFinite(x) && x >= 0);
  return n.length >= 2 ? [Math.min(n[0], n[1]), Math.max(n[0], n[1])] : def;
};

export const SELLER_DEFAULTS: Pick<RiffAssumptions, "omni_platform_fee_year" | "omni_per_customer_year" | "omni_per_seat_year"> = {
  omni_platform_fee_year: [25_000, 60_000],
  omni_per_customer_year: [60, 240],
  omni_per_seat_year: [60, 180],
};

/** The function's answer as a riff and its sources; null when it isn't one. */
export function readRiffResult(data: unknown): RiffResult | null {
  const d = obj(data);
  const r = obj(d.riff);
  if (!str(r.company) || !str(r.headline)) return null;
  const fit = obj(r.embedded_fit);
  const integ = obj(r.integration);
  const inc = obj(integ.incumbent);
  const g = obj(r.gtm);
  const a = obj(g.assumptions);
  const sw = obj(r.swot);
  const nm = obj(r.next_move);
  const verdicts: RiffFit[] = ["strong", "possible", "not_a_fit"];
  const shapes: RiffPricing[] = ["platform_plus_per_customer", "platform_plus_per_seat", "custom"];
  const riff: PartnerRiff = {
    company: str(r.company, 120),
    headline: str(r.headline),
    confidence: (["high", "medium", "low"] as const).includes(r.confidence as "high") ? (r.confidence as PartnerRiff["confidence"]) : "low",
    grounding: (["sources", "model-knowledge", "illustrative"] as const).includes(r.grounding as "sources") ? (r.grounding as PartnerRiff["grounding"]) : "model-knowledge",
    embedded_fit: { verdict: verdicts.includes(fit.verdict as RiffFit) ? (fit.verdict as RiffFit) : "possible", why: str(fit.why) },
    situation: arr(r.situation).flatMap((x) => {
      const c = obj(x);
      return str(c.claim) ? [{ claim: str(c.claim), basis: c.basis === "known" ? ("known" as const) : ("inferred" as const), sources: ids(c.sources) }] : [];
    }),
    embedded_opportunity: arr(r.embedded_opportunity).flatMap((x) => {
      const o = obj(x);
      return str(o.surface) ? [{ surface: str(o.surface, 80), end_customer_sees: str(o.end_customer_sees), metrics: arr(o.metrics).map((m) => str(m, 40)).filter(Boolean).slice(0, 4) }] : [];
    }),
    integration: {
      stack: arr(integ.stack).flatMap((x) => {
        const s = obj(x);
        return str(s.tool) ? [{ tool: str(s.tool, 40), status: s.status === "Confirmed" ? ("Confirmed" as const) : ("Inferred" as const), sources: ids(s.sources) }] : [];
      }),
      incumbent: str(inc.name) ? { name: str(inc.name, 40), status: inc.status === "Confirmed" ? "Confirmed" : "Inferred", sources: ids(inc.sources) } : null,
      omni_fit: str(integ.omni_fit),
    },
    gtm: {
      pricing_shape: shapes.includes(g.pricing_shape as RiffPricing) ? (g.pricing_shape as RiffPricing) : "platform_plus_per_customer",
      monetization: arr(g.monetization).map((m) => str(m, 140)).filter(Boolean),
      assumptions: {
        end_customers: range(a.end_customers, [500, 5000]),
        premium_adoption_pct: range(a.premium_adoption_pct, [5, 20]),
        premium_price_per_customer_month: range(a.premium_price_per_customer_month, [25, 100]),
        seats_per_customer: range(a.seats_per_customer, [2, 10]),
        omni_platform_fee_year: range(a.omni_platform_fee_year, SELLER_DEFAULTS.omni_platform_fee_year),
        omni_per_customer_year: range(a.omni_per_customer_year, SELLER_DEFAULTS.omni_per_customer_year),
        omni_per_seat_year: range(a.omni_per_seat_year, SELLER_DEFAULTS.omni_per_seat_year),
      },
      notes: Object.fromEntries(Object.entries(obj(g.notes)).map(([k, v]) => [k, str(v, 160)]).filter(([, v]) => v)) as PartnerRiff["gtm"]["notes"],
    },
    swot: {
      strengths: arr(sw.strengths).map((x) => str(x, 160)).filter(Boolean).slice(0, 2),
      weaknesses: arr(sw.weaknesses).map((x) => str(x, 160)).filter(Boolean).slice(0, 2),
      opportunities: arr(sw.opportunities).map((x) => str(x, 160)).filter(Boolean).slice(0, 2),
      threats: arr(sw.threats).map((x) => str(x, 160)).filter(Boolean).slice(0, 2),
    },
    internal_play: str(r.internal_play) || null,
    next_move: { who: str(nm.who, 100), first_question: str(nm.first_question) },
  };
  const sources: RiffSource[] = arr(d.sources).flatMap((x) => {
    const s = obj(x);
    const id = Number(s.id);
    const url = str(s.url, 600);
    if (!Number.isInteger(id) || !/^https?:\/\//.test(url)) return [];
    const kind = (["company", "site", "jobs", "web"] as const).includes(s.kind as "company") ? (s.kind as RiffSource["kind"]) : "web";
    return [{ id, title: str(s.title, 160) || url, url, kind, snippet: str(s.snippet, 300) }];
  });
  return {
    riff,
    sources,
    model: str(d.model, 80) || undefined,
    latencyMs: typeof d.latencyMs === "number" ? d.latencyMs : undefined,
    cached: d.cached === true,
    savedAt: str(d.savedAt, 40) || undefined,
  };
}

/** "Dreamship (dreamship.com)" -> "dreamship.com"; a bare domain is itself. */
export function domainOf(typed: string): string | undefined {
  const m = /\(([a-z0-9-]+(?:\.[a-z0-9-]+)+)\)\s*$/i.exec(typed) ?? /^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)\/?$/i.exec(typed.trim());
  return m?.[1]?.toLowerCase();
}

export class RiffError extends Error {}

/** Riffs are slower than a search: Claude writes a long structured answer. Give up after 75s. */
const TIMEOUT_MS = 75_000;

export async function fetchRiff(company: string, fresh = false): Promise<RiffResult> {
  const call = supabase.functions.invoke("partner-riff", { body: { company, seller: "omni", fresh } });
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new RiffError("It took too long this time.")), TIMEOUT_MS));
  const { data, error } = await Promise.race([call, timeout]);
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    throw new RiffError(status === 429 ? "Too many riffs in a row. Try again in a minute." : "The whiteboard didn't answer this time.");
  }
  const read = readRiffResult(data);
  if (!read) throw new RiffError("The answer came back empty.");
  return { ...read, domain: domainOf(company) };
}

// ─── Price to value ───

export interface CaseInputs {
  endCustomers: number;
  adoptionPct: number;
  pricePerMonth: number;
  seats: number;
  platformFee: number;
  perCustomerYear: number;
  perSeatYear: number;
  customYear: number;
}

export interface CaseResult {
  paying: number;
  tierArr: number;
  omniArr: number;
  keep: number;
  /** The seller's share of the tier's revenue, 0..1 (0 when the tier makes nothing). */
  take: number;
}

/** One case: paying accounts, the new tier's revenue, the seller's fee, and what the company keeps. */
export function priceCase(i: CaseInputs, shape: RiffPricing): CaseResult {
  const paying = Math.max(0, i.endCustomers) * (Math.min(100, Math.max(0, i.adoptionPct)) / 100);
  const tierArr = paying * Math.max(0, i.pricePerMonth) * 12;
  const omniArr =
    shape === "platform_plus_per_customer"
      ? Math.max(0, i.platformFee) + paying * Math.max(0, i.perCustomerYear)
      : shape === "platform_plus_per_seat"
        ? Math.max(0, i.platformFee) + paying * Math.max(0, i.seats) * Math.max(0, i.perSeatYear)
        : Math.max(0, i.customYear);
  return { paying, tierArr, omniArr, keep: tierArr - omniArr, take: tierArr > 0 ? omniArr / tierArr : 0 };
}

export const CUSTOM_DEFAULT: Range = [50_000, 150_000];

/** The low and high cases from a riff's assumptions (and the custom fee). */
export function casesFrom(a: RiffAssumptions, custom: Range = CUSTOM_DEFAULT): { low: CaseInputs; high: CaseInputs } {
  const pick = (k: 0 | 1): CaseInputs => ({
    endCustomers: a.end_customers[k],
    adoptionPct: a.premium_adoption_pct[k],
    pricePerMonth: a.premium_price_per_customer_month[k],
    seats: a.seats_per_customer[k],
    platformFee: a.omni_platform_fee_year[k],
    perCustomerYear: a.omni_per_customer_year[k],
    perSeatYear: a.omni_per_seat_year[k],
    customYear: custom[k],
  });
  return { low: pick(0), high: pick(1) };
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** $69.6K, $1.9M, -$12K. */
export const money = (n: number) => `${n < 0 ? "-" : ""}$${compact.format(Math.abs(Math.round(n)))}`;
export const count = (n: number) => compact.format(Math.round(n));

/** The pricing shapes, as the page names them. */
export const SHAPES: { id: RiffPricing; label: string; formula: string }[] = [
  { id: "platform_plus_per_customer", label: "Platform + per customer", formula: "platform fee + paying accounts × fee per account" },
  { id: "platform_plus_per_seat", label: "Platform + per seat", formula: "platform fee + paying accounts × seats × fee per seat" },
  { id: "custom", label: "Custom", formula: "one negotiated annual fee" },
];

// ─── Forwarding it ───

const FIT_TEXT: Record<RiffFit, string> = { strong: "Strong", possible: "Possible", not_a_fit: "Not a fit" };
export const fitText = (v: RiffFit) => FIT_TEXT[v];

/** The whole riff as plain text, with the current price model, for a rep's inbox. */
export function riffText(r: RiffResult, shape: RiffPricing, cases: { low: CaseResult; high: CaseResult }, seller = "Omni"): string {
  const { riff, sources } = r;
  const a = riff.gtm.assumptions;
  const pct = (x: Range) => `${x[0]}% to ${x[1]}%`;
  const lines = [
    `Whiteboard: ${riff.company}${r.example ? " (illustrative example)" : ""}`,
    riff.headline,
    "",
    `Embedded fit: ${fitText(riff.embedded_fit.verdict)}. ${riff.embedded_fit.why}`.trim(),
    ...(riff.situation.length ? ["", "Situation", ...riff.situation.map((s) => `- ${s.claim} (${s.basis}${s.sources.length ? ` [${s.sources.join(", ")}]` : ""})`)] : []),
    ...(riff.embedded_opportunity.length
      ? ["", "Where it lives in their product", ...riff.embedded_opportunity.map((o) => `- ${o.surface}: ${o.end_customer_sees}${o.metrics.length ? ` (${o.metrics.join(", ")})` : ""}`)]
      : []),
    ...(riff.integration.stack.length || riff.integration.omni_fit
      ? ["", "Integration", ...riff.integration.stack.map((s) => `- ${s.tool}: ${s.status}`), ...(riff.integration.omni_fit ? [`- Fit with ${seller}: ${riff.integration.omni_fit}`] : [])]
      : []),
    "",
    `Price to value (${SHAPES.find((s) => s.id === shape)?.label}), low case to high case`,
    `- Their new tier: ${money(cases.low.tierArr)} to ${money(cases.high.tierArr)} a year`,
    `- ${seller}: ${money(cases.low.omniArr)} to ${money(cases.high.omniArr)} a year`,
    `- Assumptions: ${count(a.end_customers[0])} to ${count(a.end_customers[1])} customer accounts; ${pct(a.premium_adoption_pct)} pay; $${a.premium_price_per_customer_month[0]} to $${a.premium_price_per_customer_month[1]} a month`,
    ...(riff.swot.strengths.length
      ? ["", "SWOT", `- Strengths: ${riff.swot.strengths.join("; ")}`, `- Weaknesses: ${riff.swot.weaknesses.join("; ")}`, `- Opportunities: ${riff.swot.opportunities.join("; ")}`, `- Threats: ${riff.swot.threats.join("; ")}`]
      : []),
    ...(riff.internal_play ? ["", `Internal play: ${riff.internal_play}`] : []),
    "",
    `Next move: ${riff.next_move.who}. Ask: "${riff.next_move.first_question}"`,
    ...(sources.length ? ["", "Sources", ...sources.map((s) => `[${s.id}] ${s.title} ${s.url}`)] : []),
    "",
    `Exploratory brief. Not ${/^[aeiou]/i.test(seller) ? "an" : "a"} ${seller} product; figures are estimates.`,
  ];
  return lines.join("\n");
}
