// Evidence the radar and lookalikes read from a saved run: when each source was
// published, the freshest dated trigger and what kind it is, the stack lines a
// source backs, and the one question to ask. Pure functions; nothing invented.
import type { AccountBrief, MotionLabel } from "@/components/account/AccountViews";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { monthLabel, whyNowItems } from "@/components/account/explorer/model";
import { ageDays, plainText, type StackChip, type TerritoryRow } from "../model";

const DAY = 86_400_000;

/** Midnight UTC, so ages count calendar days (Sep 30 is 7 days before Oct 7 at any hour). */
export function startOfDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** "[3] [4, 8]" -> [3, 4, 8], in order, no repeats. */
export function citations(text?: string): number[] {
  const out: number[] = [];
  for (const m of (text ?? "").matchAll(/\[([\d,\s]+)\]/g)) {
    for (const n of m[1].split(/[,\s]+/)) {
      const v = Number(n);
      if (v > 0 && !out.includes(v)) out.push(v);
    }
  }
  return out;
}

const UNIT_DAYS: Record<string, number> = { minute: 0, hour: 0, day: 1, week: 7, month: 30, year: 365 };

/**
 * A source's publish day as "2026-09-30" (or "2026-09"): an ISO date as given,
 * or a search result's "6 days ago" counted back from when the run was made,
 * so it keeps ageing after the run instead of reading "6d" forever.
 */
export function sourceDay(date: string | undefined, ranAt: string): string | undefined {
  const d = date?.trim();
  if (!d) return undefined;
  const iso = /^(\d{4}-\d{2}(?:-\d{2})?)/.exec(d);
  if (iso) return iso[1];
  const ran = new Date(ranAt);
  if (Number.isNaN(ran.getTime())) return undefined;
  const rel = /^(\d+|an?)\s+(minute|hour|day|week|month|year)s?\s+ago\b/i.exec(d);
  if (rel || /^(today|yesterday)\b/i.test(d)) {
    const days = rel ? (/^\d/.test(rel[1]) ? Number(rel[1]) : 1) * UNIT_DAYS[rel[2].toLowerCase()] : /^yesterday/i.test(d) ? 1 : 0;
    return isoDay(new Date(ran.getTime() - days * DAY));
  }
  const parsed = /\b(19|20)\d{2}\b/.test(d) ? Date.parse(d) : NaN;
  return Number.isNaN(parsed) ? undefined : isoDay(new Date(parsed));
}

/** The run's on-topic sources, each date turned into a day (undefined when the source gave none). */
export function datedSources(row: Pick<TerritoryRow, "sources" | "ranAt">): ResearchSource[] {
  return row.sources.filter((s) => !s.off_topic).map((s) => ({ ...s, date: sourceDay(s.date, row.ranAt) }));
}

// ─── The freshest trigger ───

export type TriggerKind = "funding" | "acquisition" | "leadership" | "launch" | "hiring" | "other";

export const TRIGGER_LABEL: Record<TriggerKind | "none", string> = {
  funding: "Funding",
  acquisition: "Acquisition or take-private",
  leadership: "Leadership hire",
  launch: "Product launch",
  hiring: "Hiring",
  other: "Other event",
  none: "No dated trigger",
};

const KIND_RULES: [TriggerKind, RegExp][] = [
  ["acquisition", /\b(acqui\w*|take-private|taken private|take private|going private|buyout|merg(?:er|ed|es|ing)|private equity)\b/i],
  ["funding", /\b(rais(?:ed|es|ing)|funding|series [a-h]\b|seed round|financing|went public|(?:files?|filed) for (?:an )?ipo|ipo (?:priced|filing))/i],
  ["leadership", /\b(appoint\w*|names? new|named|hires?|hired|joins|joined|promot\w*)\b.{0,60}\b(chief|cdo|cfo|cto|ceo|cio|coo|vp|vice president|head of|president)\b|\bnew (chief|cdo|cfo|cto|ceo|cio|vp|head of)\b/i],
  ["launch", /\b(launch\w*|unveil\w*|introduc\w*|released?|rolls? out|rolled out|general availability)\b/i],
  ["hiring", /\b(job posts?|job listings?|hiring|open roles?|openings?|recruit\w*)\b|\bpost(?:s|ed|ing)?\b.{0,50}\b(role|position|job)\b/i],
];

/** What kind of event a why-now line is, by its words: funding, acquisition, leadership hire, launch, hiring. */
export function classifyTrigger(text?: string): TriggerKind | "none" {
  const t = plainText(text);
  if (!t) return "none";
  return KIND_RULES.find(([, re]) => re.test(t))?.[0] ?? "other";
}

export interface FreshTrigger {
  /** "2026-09", or "2026-09-30" when a cited source dates it to the day. */
  date: string;
  text: string;
  /** Calendar days from the event to today. */
  days: number;
  sources: number[];
  kind: TriggerKind;
}

/**
 * The run's newest dated why-now item. When one of its cited sources carries a
 * publish day in the same month, that day replaces the month (Relay's raise:
 * "2026-09" -> "2026-09-30").
 */
export function freshestTrigger(row: Pick<TerritoryRow, "report" | "sources" | "ranAt">, now: Date = startOfDay()): FreshTrigger | undefined {
  const top = whyNowItems(row.report.brief?.revenue_model).find((i) => i.date);
  if (!top) return undefined;
  const sources = citations(top.text);
  const byId = new Map(datedSources(row).map((s) => [s.id, s]));
  let date = top.date;
  for (const n of sources) {
    const day = byId.get(n)?.date;
    if (day && day.length > date.length && day.startsWith(top.date.slice(0, 7))) date = day;
  }
  const days = ageDays(date, now);
  if (days === null) return undefined;
  const kind = classifyTrigger(top.text);
  return { date, text: plainText(top.text), days, sources, kind: kind === "none" ? "other" : kind };
}

/** "Sep 30, 2026" for a day, "Sep 2026" for a month. */
export function dayLabel(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return monthLabel(date);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "6 days ago", "about 12 months ago". */
export function agoText(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 60) return `${days} days ago`;
  return `about ${Math.round(days / 30)} months ago`;
}

// ─── Stack ───

/** "Databricks (Lakehouse, Delta Lake)" -> "Databricks". */
export const toolName = (tool: string) => tool.replace(/\s*\([^)]*\)/g, "").trim();
export const toolKey = (tool: string) => toolName(tool).toLowerCase();

const STRENGTH: Record<string, number> = { Confirmed: 3, Former: 2, Inferred: 1 };

/** Stack lines one per tool (the strongest status wins, sources merged), parentheticals dropped. */
export function stackByTool(stack: StackChip[]): StackChip[] {
  const out = new Map<string, StackChip>();
  for (const s of stack) {
    const key = toolKey(s.tool);
    if (!key) continue;
    const prev = out.get(key);
    if (!prev) {
      out.set(key, { ...s, tool: toolName(s.tool), sources: [...s.sources] });
      continue;
    }
    const merged = [...new Set([...prev.sources, ...s.sources])];
    out.set(key, (STRENGTH[s.status] ?? 0) > (STRENGTH[prev.status] ?? 0) ? { ...s, tool: toolName(s.tool), sources: merged } : { ...prev, sources: merged });
  }
  return [...out.values()];
}

export const isWarehouse = (category: string) => /warehouse|lakehouse|database/i.test(category);
export const isBI = (category: string) => /\bbi\b|business intelligence/i.test(category);

// ─── People: roles, not names ───

const TITLE_BEFORE = /\b(ceo|cfo|cto|cdo|cio|coo|cmo|founder|co-founder|president|chair\w*|vp|svp|evp|director|head of [\w& ]+|officer|manager|engineer|scientist|analyst|architect|lead)\s*,?\s*$/i;
const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const GAP = "\u0000";

/**
 * The run's text with the people it names (brief.people) turned into their
 * roles: "New CEO Jane Roe appointed" -> "New CEO appointed"; "Jane Roe led
 * the migration" -> "The VP of Data led the migration". The views show roles,
 * never names.
 */
export function redactPeople(text: string, people: { name?: string; role?: string }[] | undefined): string {
  let out = text;
  for (const p of people ?? []) {
    const name = p.name?.trim();
    if (!name || name.length < 3) continue;
    const role = (p.role ?? "").split(/[,(]/)[0].replace(/\s+at\s+.*$/i, "").trim();
    const re = new RegExp(`\\b${escapeRe(name)}(['’]s)?\\b`, "g");
    out = out.replace(re, (_m: string, poss: string | undefined, offset: number, whole: string) => {
      const before = whole.slice(Math.max(0, offset - 40), offset);
      if (TITLE_BEFORE.test(before)) return poss ? `${GAP}'s` : GAP;
      const start = offset === 0 || /[.!?]\s*$/.test(before);
      const who = role ? `the ${role}` : "a person named in a source";
      const said = start ? who[0].toUpperCase() + who.slice(1) : who;
      return poss ? `${said}'s` : said;
    });
  }
  // A dropped name leaves "CEO <gap> appointed" or "founder <gap>, who": close it up.
  return out.replace(new RegExp(`\\s*${GAP}`, "g"), "").replace(/\s{2,}/g, " ").trim();
}

// ─── What to ask, who to start with ───

/** The motion side whose question fits: Internal or Embedded as labeled; for Both, the side with more evidence. */
export function questionFor(brief: AccountBrief, motion: MotionLabel): string {
  const m = brief.motion;
  const ev = (side?: { evidence?: unknown[] }) => (Array.isArray(side?.evidence) ? side!.evidence!.length : 0);
  const side =
    motion === "Internal" ? m?.internal : motion === "Embedded" ? m?.embedded : motion === "Both" ? (ev(m?.embedded) > ev(m?.internal) ? m?.embedded : m?.internal) : undefined;
  const dq = Array.isArray(brief.discovery_questions) ? brief.discovery_questions[0] : undefined;
  return plainText(side?.question) || plainText(dq);
}

/** "Head of Data Engineering or the Principal Data Engineer…" -> "Head of Data Engineering". */
export function shortRole(role?: string): string {
  const r = plainText(role).replace(/\s*\([^)]*\)/g, "").split(/\s+or\s+/i)[0].trim();
  return r.length > 60 ? `${r.slice(0, 57).trimEnd()}…` : r;
}
