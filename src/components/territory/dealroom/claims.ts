// The Deal Room's claims: what a saved run says about the account in public
// facts only, so the account can mark each right, fix it or skip it. Built from
// the brief's stack lines, its motion read and its dated why-now items. The
// boundary is the point: no fit grade, critics, objections, plan text,
// discovery questions, people, customer-list status, expansion or distill.
import type { AccountBrief, MotionLabel } from "@/components/account/AccountViews";
import { whyNowItems } from "@/components/account/explorer/model";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { plainText } from "../model";

// ─── Answers (stored by the deal-room function under auto_analysis.deal_room) ───

export type DealAnswer = "right" | "fix" | "unsure";

export interface DealResponse {
  answer: DealAnswer;
  /** What the claim should say (fixes only). */
  text?: string;
  note?: string;
  /** When the answer was saved (ISO). */
  at: string;
}

export type Responses = Record<string, DealResponse>;

export interface DealRoomData {
  responses: Responses;
  updated_at: string;
}

/** How one answer's save went: on the server, or kept on this device when the server can't be reached. */
export type SaveState = "saving" | "saved" | "local";

export const MAX_ANSWER_TEXT = 400;

const ANSWERS: DealAnswer[] = ["right", "fix", "unsure"];
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const cap = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX_ANSWER_TEXT) : "");

/** Stored answers as the page may trust them (from the server or this browser). */
export function readResponses(raw: unknown): Responses {
  if (!isObject(raw)) return {};
  const out: Responses = {};
  for (const [id, r] of Object.entries(raw)) {
    if (!isObject(r) || !ANSWERS.includes(r.answer as DealAnswer)) continue;
    const text = cap(r.text);
    const note = cap(r.note);
    if (r.answer === "fix" && !text) continue;
    out[id] = { answer: r.answer as DealAnswer, ...(r.answer === "fix" ? { text } : {}), ...(note ? { note } : {}), at: typeof r.at === "string" ? r.at : "" };
  }
  return out;
}

/** auto_analysis.deal_room, or null when the account hasn't answered (or it's malformed). */
export function readDealRoom(raw: unknown): DealRoomData | null {
  if (!isObject(raw) || !isObject(raw.responses)) return null;
  return { responses: readResponses(raw.responses), updated_at: typeof raw.updated_at === "string" ? raw.updated_at : "" };
}

// ─── Claims ───

export interface Claim {
  /** Stable across loads: "stack:bi-tools:metabase", "motion", "why:2026-09:0". */
  id: string;
  kind: "stack" | "motion" | "why";
  /** "01" */
  num: string;
  /** Small label over the claim. */
  section: string;
  text: string;
  /** Evidence status for EvidenceTag (Confirmed, Inferred, Former); why-now items carry a date instead. */
  status?: string;
  /** Why-now items: "2026-09" or "2026-09-30". */
  date?: string;
  /** Numbered sources (off-topic ones never cited). */
  sources: number[];
  /** Stack lines: the tool and what it is to the account ("BI tool"). */
  tool?: string;
  noun?: string;
  /** The motion claim's label. */
  motion?: MotionLabel;
  /** Why-now items: the fact itself, without "We read that". */
  fact?: string;
}

const NOUNS: [RegExp, string][] = [
  [/^warehouse/i, "warehouse"],
  [/^transform/i, "transformation tool"],
  [/^bi\b|business intelligence/i, "BI tool"],
  [/^ai\b/i, "AI tooling"],
  [/^embedded/i, "embedded analytics"],
];

/** A stack category as a lower-case singular noun: "BI tools" -> "BI tool", "Transformation" -> "transformation tool". */
export function stackNoun(category: string): string {
  const name = category.trim();
  const hit = NOUNS.find(([re]) => re.test(name));
  if (hit) return hit[1];
  return name.replace(/\btools$/i, "tool").replace(/^\p{Lu}(?=\p{Ll})/u, (m) => m.toLowerCase()) || "tool";
}

/** "BI tools" -> "bi-tools" (ids only). */
const slug = (t: string, max: number) =>
  t
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, max)
    .replace(/-+$/, "");

/** "Databricks (Lakehouse, Delta Lake)" -> "databricks", so two lines for one product read as one claim. */
const baseTool = (tool: string) => tool.replace(/\s*\(.*$/, "").trim().toLowerCase();

export const MOTION_TEXT: Record<Exclude<MotionLabel, "Unclear">, string> = {
  Internal: "Your data team builds analytics for your own teams",
  Embedded: "Your data team builds analytics inside your product for your customers",
  Both: "Your data team builds analytics for your own teams and inside your product for your customers",
};

/** "2026-09" -> "Sep 2026"; "2026-09-30" -> "Sep 30, 2026". */
export function dateLabel(date: string): string {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(date);
  if (!m) return date;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, m[3] ? Number(m[3]) : 1));
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", ...(m[3] ? { day: "numeric" } : {}), timeZone: "UTC" });
}

/** "The company raised…" reads as "We read that the company raised…"; names keep their capital. */
const lowerFirst = (t: string) =>
  t.replace(/^Job (post|posting|listing|opening)\b/, "a job $1").replace(/^(The|A|An|Its|Their|Jobs|New)\b/, (w) => w.toLowerCase());

const VERB_FIRST =
  /^(?:Raised|Hired|Launched|Opened|Announced|Acquired|Completed|Closed|Moved|Expanded|Released|Reported|Signed|Partnered|Introduced|Added|Started|Rolled|Shipped|Secured|Filed|Posted|Listed|Migrated|Adopted|Replaced|Rebranded)\b/;

/** "Raised $20M" -> "Acme raised $20M": an item that starts with a verb gets the company as its subject. */
const withSubject = (t: string, company: string) => (company && VERB_FIRST.test(t) ? `${company} ${t[0].toLowerCase()}${t.slice(1)}` : lowerFirst(t));
const dropStop = (t: string) => t.replace(/[.\s]+$/, "");
const citesIn = (t: string) => [...t.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)].flatMap((m) => m[1].split(/\s*,\s*/).map(Number));

/** Does this text name one of the people the sources named? (People never reach the prospect.) */
function namesPerson(text: string, names: string[]): boolean {
  const t = text.toLowerCase();
  return names.some((n) => {
    const full = n.trim().toLowerCase();
    const last = full.split(/\s+/).pop() ?? "";
    return (full && t.includes(full)) || (last.length > 3 && new RegExp(`\\b${last.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t));
  });
}

const MAX_WHY = 3;

/** The claims a prospect can check, in order: stack, motion, then up to three dated why-now items. */
export function buildClaims(brief: AccountBrief | null | undefined): Claim[] {
  if (!brief) return [];
  const sources: ResearchSource[] = Array.isArray(brief.research?.sources) ? brief.research!.sources : [];
  const valid = new Set(sources.filter((s) => s && !s.off_topic).map((s) => Number(s.id)));
  const cite = (ids: unknown[] | undefined) => [...new Set((ids ?? []).map(Number).filter((n) => valid.has(n)))];
  const claims: Omit<Claim, "num">[] = [];

  // Stack: one claim per line that names a tool (lines for the same product merge).
  const ids = new Map<string, number>();
  for (const line of Array.isArray(brief.core_features) ? brief.core_features : []) {
    const tool = plainText(line?.tool);
    const status = line?.status;
    if (!tool || !status || status === "Not found") continue;
    const noun = stackNoun(line.name ?? "");
    const same = claims.find((c) => c.kind === "stack" && c.noun === noun && c.status === status && baseTool(c.tool ?? "") === baseTool(tool));
    if (same) {
      same.sources = cite([...same.sources, ...(line.sources ?? [])]);
      continue;
    }
    let id = `stack:${slug(line.name ?? "", 30) || "stack"}:${slug(tool, 60) || "tool"}`;
    const seen = (ids.get(id) ?? 0) + 1;
    ids.set(id, seen);
    if (seen > 1) id += `-${seen}`;
    claims.push({
      id,
      kind: "stack",
      section: "Stack",
      text: status === "Former" ? `${tool} as your former ${noun}` : `${tool} as your ${noun}`,
      status,
      sources: cite(line.sources),
      tool,
      noun,
    });
  }

  // How they use analytics (skipped when the sources don't say).
  const label = brief.motion?.label ?? (brief.fit?.motion as MotionLabel | undefined);
  if (label === "Internal" || label === "Embedded" || label === "Both") {
    const sides = label === "Both" ? [brief.motion?.internal, brief.motion?.embedded] : [label === "Internal" ? brief.motion?.internal : brief.motion?.embedded];
    claims.push({
      id: "motion",
      kind: "motion",
      section: "How you use analytics",
      text: MOTION_TEXT[label],
      status: "Inferred",
      sources: cite(sides.flatMap((s) => (Array.isArray(s?.sources) ? s!.sources : []))),
      motion: label,
    });
  }

  // What we read: dated items only, newest first, none that names a person.
  const people = (Array.isArray(brief.people) ? brief.people : []).map((p) => p?.name).filter((n): n is string => typeof n === "string" && !!n.trim());
  whyNowItems(brief.revenue_model)
    .filter((i) => i.date)
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !namesPerson(item.text, people))
    .slice(0, MAX_WHY)
    .forEach(({ item, index }) => {
      const fact = withSubject(dropStop(plainText(item.text)), (brief.company ?? "").trim());
      if (!fact) return;
      claims.push({
        id: `why:${item.date}:${index}`,
        kind: "why",
        section: "What we read",
        text: `We read that ${fact}`,
        date: item.date,
        sources: cite(citesIn(item.text)),
        fact,
      });
    });

  return claims.map((c, i) => ({ ...c, num: String(i + 1).padStart(2, "0") }));
}

// ─── What the answers add up to (seller view) ───

export function tally(claims: Claim[], responses: Responses) {
  let right = 0;
  let fix = 0;
  let unsure = 0;
  for (const c of claims) {
    const a = responses[c.id]?.answer;
    if (a === "right") right++;
    else if (a === "fix") fix++;
    else if (a === "unsure") unsure++;
  }
  return { total: claims.length, answered: right + fix + unsure, right, fix, unsure };
}

export interface DiffRow {
  id: string;
  num: string;
  field: string;
  before: string;
  after: string;
  corrected: boolean;
}

const STATUS_WORDS: Record<string, string> = {
  Confirmed: "Confirmed from a public source",
  Inferred: "Inferred",
  Former: "Former",
};

/** The plan, before and after: each line the account's answers change (a "not sure" changes nothing). */
export function planDiff(claims: Claim[], responses: Responses): DiffRow[] {
  return claims.flatMap((c): DiffRow[] => {
    const r = responses[c.id];
    if (!r || r.answer === "unsure") return [];
    const corrected = r.answer === "fix";
    const fixed = `Corrected: "${r.text ?? ""}"`;
    const base = { id: c.id, num: c.num, corrected };
    if (c.kind === "stack") {
      const was = STATUS_WORDS[c.status ?? ""] ?? c.status ?? "Inferred";
      return [{ ...base, field: `Stack · ${c.noun}`, before: `${c.tool} · ${was}`, after: corrected ? fixed : `${c.tool} · ${c.status === "Former" ? "Former, confirmed" : "Confirmed"} by the account` }];
    }
    if (c.kind === "motion") {
      return [{ ...base, field: "Motion", before: `${c.motion} · Inferred from public sources`, after: corrected ? fixed : `${c.motion} · Confirmed by the account` }];
    }
    return [{ ...base, field: `Why now · ${dateLabel(c.date ?? "")}`, before: "Read in a public source", after: corrected ? fixed : "Confirmed by the account" }];
  });
}

export interface ClaimQuestion {
  id: string;
  num: string;
  question: string;
  answer?: string;
  corrected?: boolean;
}

const MOTION_ANSWER: Record<string, string> = {
  Internal: "Their own teams",
  Embedded: "Their customers, inside the product",
  Both: "Both: their own teams, and their customers inside the product",
};

/** The question a claim stands in for: "Is Metabase their BI tool?" */
export function claimQuestion(c: Claim): string {
  if (c.kind === "stack") return c.status === "Former" ? `Did they move off ${c.tool}?` : `Is ${c.tool} their ${c.noun}?`;
  if (c.kind === "motion") return "Who do they build analytics for?";
  const fact = c.fact ?? "";
  return `Is it right that ${lowerFirst(fact.length > 110 ? `${fact.slice(0, 107).replace(/\s+\S*$/, "")}…` : fact)}?`;
}

/** Questions the account just answered (right or fixed), and the ones still open for the call. */
export function claimQuestions(claims: Claim[], responses: Responses): { answered: ClaimQuestion[]; open: ClaimQuestion[] } {
  const answered: ClaimQuestion[] = [];
  const open: ClaimQuestion[] = [];
  for (const c of claims) {
    const r = responses[c.id];
    if (!r) continue;
    const q = { id: c.id, num: c.num, question: claimQuestion(c) };
    if (r.answer === "unsure") open.push(q);
    else if (r.answer === "fix") answered.push({ ...q, corrected: true, answer: `Corrected: "${r.text ?? ""}"` });
    else answered.push({ ...q, answer: `${c.kind === "motion" ? `${MOTION_ANSWER[c.motion ?? ""] ?? "As written"}.` : "Yes."} Confirmed by the account.` });
  }
  return { answered, open };
}

/** "just now", "4m ago", "3h ago", "Oct 7". */
export function agoText(iso: string | undefined, now: Date = new Date()): string {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (Number.isNaN(t)) return "";
  const mins = Math.round((now.getTime() - t) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
