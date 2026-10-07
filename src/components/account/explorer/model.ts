// Shapes and text helpers for the account explorer. The data comes from a run's
// brief (simulate-idea) and its seven-agent analysis (orchestrate), live or saved.
import { SEATS, criticFor, type Seat } from "@/lib/lenses";

/** A person a source names at the account. */
export interface Person {
  name: string;
  role: string;
  source: number;
}

export interface ChallengeQuestion {
  question: string;
  context?: string;
}

export interface CriticResult {
  persona: string;
  headline?: string;
  perspective?: string;
  challenge_questions?: ChallengeQuestion[];
}

export interface Play {
  title?: string;
  pitch?: string;
  how_its_different?: string;
  potential?: string;
  idea_text?: string;
}

export interface Synthesis {
  executive_summary?: string;
  consensus?: string[];
  tensions?: { topic?: string; positions?: string[]; resolution_suggestion?: string }[];
  confidence_score?: number;
  ranked_recommendations?: { action?: string; rationale?: string; confidence?: string }[];
}

/** What orchestrate returns (and the report stores as auto_analysis). */
export interface AccountAnalysis {
  perspectives?: CriticResult[];
  expansion?: { core_insight?: string; expansions?: Play[] } | null;
  distillation?: Record<string, unknown> | null;
  synthesis?: Synthesis | null;
  /** Milliseconds per agent: "perspective-skeptic", "expand", "distill", "synthesis", "total". */
  timing?: Record<string, number>;
}

// ─── The seven agents ───

export type AgentId = `persona-${Seat}` | "expand" | "distill";

export const AGENTS: { id: AgentId; name: string; role: string; timingKey: string }[] = [
  ...SEATS.map((seat) => ({
    id: `persona-${seat}` as AgentId,
    name: criticFor("account", seat)?.name ?? seat,
    role: criticFor("account", seat)?.tagline ?? "",
    timingKey: `perspective-${seat}`,
  })),
  { id: "expand", name: "Expand", role: "Three ways in", timingKey: "expand" },
  { id: "distill", name: "Distill", role: "The one thing that matters", timingKey: "distill" },
];

/** The teaser each agent's finished output shows on its tile. */
export function teaserFor(id: AgentId, analysis: AccountAnalysis | null | undefined): string {
  if (!analysis) return "";
  if (id === "expand") return clean(analysis.expansion?.core_insight);
  if (id === "distill") return clean(analysis.distillation?.thesis_statement);
  const seat = id.replace("persona-", "");
  return clean(analysis.perspectives?.find((p) => p.persona === seat)?.headline);
}

// ─── Text ───

const clean = (t: unknown) => (typeof t === "string" ? stripMarks(t) : "");

/** Markdown emphasis and headings off, one line. */
export function stripMarks(text: string): string {
  return text.replace(/^#{1,6}\s+/gm, "").replace(/(\*\*|__)(.+?)\1/g, "$2").replace(/\s+/g, " ").trim();
}

// Older runs' synthesis names the idea-flow personas; the page names the seats.
const SEAT_ALIASES: [RegExp, Seat][] = [
  [/\b(?:the\s+)?skeptic\b/gi, "skeptic"],
  [/\b(?:the\s+)?champion\b/gi, "champion"],
  [/\b(?:the\s+)?competitor\b/gi, "competitor"],
  [/\b(?:the\s+)?customer(?= (?:agent|persona|perspective|argues|says|notes|wants|warns|counters|adds|points|sees|believes|agrees|disagrees)|['’]s\b)/gi, "customer"],
  [/\b(?:the\s+)?builder\b/gi, "builder"],
];

/** "The Skeptic argues…" -> "The CFO argues…" on account runs. */
export function relabelSeats(text: string | undefined): string {
  if (!text) return "";
  let out = text;
  for (const [re, seat] of SEAT_ALIASES) {
    const name = criticFor("account", seat)?.name ?? seat;
    out = out.replace(re, (m) => `${/^the\s/i.test(m) ? (m[0] === "T" ? "The " : "the ") : ""}${name}`);
  }
  return out;
}

/**
 * A critic's markdown as paragraphs: no "## Head of Data's Take" heading, no
 * "Challenge Questions" section (the card shows those as cards), plain text.
 */
export function criticParagraphs(perspective: string | undefined): string[] {
  if (!perspective) return [];
  const body = perspective
    .replace(/\n#{1,6}\s*Challenge Questions[\s\S]*$/i, "")
    .replace(/^\s*#{1,6}\s[^\n]*\n+/, "");
  return body
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/(\*\*|__)(.+?)\1/g, "$2")
        .replace(/^\s*[-*]\s+/gm, "• ")
        .trim(),
    )
    .filter(Boolean);
}

/** what_to_cut sometimes arrives as one string holding a list. */
export function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  const text = value.trim();
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      const items = [...text.matchAll(/(['"])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]);
      if (items.length) return items;
    }
  }
  return text.split(/\n+|;\s+/).map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
}

export interface WhyNowItem {
  /** "2026-09", or "" when the source gives no date. */
  date: string;
  text: string;
}

/** "2026-09: Raised $36M [3]" lines from the brief's why-now field, newest first. */
export function whyNowItems(revenueModel: string | undefined): WhyNowItem[] {
  if (!revenueModel) return [];
  const items = revenueModel
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean)
    .map((l) => {
      const m = /^(\d{4}-\d{2}(?:-\d{2})?|Date not found)\s*[:–-]\s*(.*)$/i.exec(l);
      return m ? { date: /not found/i.test(m[1]) ? "" : m[1], text: m[2] } : { date: "", text: l };
    })
    .filter((i) => i.text && !/^no dated trigger events/i.test(i.text));
  return items.sort((a, b) => (b.date || "0").localeCompare(a.date || "0"));
}

/** "2026-09" -> "Sep 2026". */
export function monthLabel(date: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(date);
  if (!m) return date;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** "(1) a; (2) b" or "a; b" or lines -> items. */
export function checklist(text: string | undefined): string[] {
  if (!text) return [];
  const body = text.replace(/^[^:(]{0,60}verify[^:]*:\s*/i, "");
  const numbered = body.split(/\s*\(\d+\)\s*/).map((s) => s.replace(/[;,]\s*(?:and\s*)?$/, "").trim()).filter(Boolean);
  if (numbered.length > 1) return numbered;
  const lines = body.split(/\n+|;\s+/).map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
  return lines.length > 1 ? lines : [body.trim()].filter(Boolean);
}

export const POTENTIAL_LABEL: Record<string, string> = {
  "bigger-market": "Bigger deal",
  "easier-to-build": "Easier start",
  "less-competition": "Less competition",
  "faster-revenue": "Faster close",
};

// ─── Seats and the people in them ───

// Who in the sources plausibly sits in each seat, by the role the source gives.
const SEAT_ROLES: Partial<Record<string, RegExp>> = {
  champion: /chief data|\bcdo\b|(head|vp|vice president|director|lead)\b[^,;]*\b(data|analytics|bi|insights)\b|\b(data|analytics)\b[^,;]*\b(head|vp|director|lead|officer)\b/i,
  skeptic: /\bcfo\b|chief financial|\bfinance\b/i,
  builder: /\b(analytics|data) engineer/i,
};

/** Sourced people matched to seats, each person used once, seats in priority order. */
export function seatPeople(people: Person[] = []): Record<string, Person> {
  const out: Record<string, Person> = {};
  const used = new Set<Person>();
  // Someone quoted as the account's customer or partner (a bank's CDO in a vendor case study) sits at another company.
  const elsewhere = /\bcustomers?\b|\bquot(?:e|ed)\b|\bpartner\b/i;
  for (const seat of ["champion", "skeptic", "builder"]) {
    const p = people.find((x) => !used.has(x) && !elsewhere.test(x.role) && SEAT_ROLES[seat]?.test(x.role));
    if (p) {
      out[seat] = p;
      used.add(p);
    }
  }
  return out;
}
