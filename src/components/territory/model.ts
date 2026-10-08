// The territory: every saved account run for a seller, read into rows the
// command-center views share (radar, lookalikes, committee, deal room).
import type { AccountBrief, MotionLabel } from "@/components/account/AccountViews";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { stripMarks, whyNowItems } from "@/components/account/explorer/model";
import type { SavedReport } from "@/components/account/explorer/savedRuns";
import type { Segment, Territory, TerritoryAccount, TerritorySegment } from "@/lib/sellers";

export interface StackChip {
  /** "Warehouse", "BI tools", ... */
  category: string;
  tool: string;
  status: "Confirmed" | "Inferred" | "Former" | string;
  sources: number[];
}

export interface Trigger {
  /** "2026-09" or "2026-09-30". */
  date: string;
  text: string;
  /** Days between the trigger and `now`, at month precision when that's all the source gives. */
  ageDays: number;
}

/**
 * What the run's evidence says about Omni at the account: on the public
 * customer list, named as a tool in its stack (usually its own job post), or
 * neither. Read from the saved run, never typed by hand. Customers are
 * expansion targets, not exclusions.
 */
export type OmniStatus = "Confirmed" | "Likely" | "None found";

/** The words for each status: a short chip, and the full sentence for a title or the focus panel. */
export const OMNI_TEXT: Record<OmniStatus, { chip: string; full: string }> = {
  Confirmed: { chip: "On the list", full: "On Omni's public customer list" },
  Likely: { chip: "Named in job posts", full: "Omni named in its job posts" },
  "None found": { chip: "Not on the list", full: "Not on Omni's public customer list" },
};

/** Sort order: Confirmed first. */
export const omniRank = (s: OmniStatus) => ({ Confirmed: 0, Likely: 1, "None found": 2 })[s];

/** A stack line naming Omni as the tool ("Omni", "Omni Analytics"; never "Omnichannel"). */
const OMNI_TOOL = /^Omni\b/i;
const backed = (status?: string) => status === "Confirmed" || status === "Inferred";

/** Confirmed when the brief puts the account on the list; Likely when a Confirmed or Inferred stack line names Omni. */
export function omniStatus(brief?: AccountBrief | null): OmniStatus {
  if (brief?.customer_list?.on_list) return "Confirmed";
  const lines = Array.isArray(brief?.core_features) ? brief!.core_features : [];
  return lines.some((l) => OMNI_TOOL.test((l.tool ?? "").trim()) && backed(l.status)) ? "Likely" : "None found";
}

/** The stack lines that name Omni, for their sources. */
export const omniLines = (stack: StackChip[]) => stack.filter((s) => OMNI_TOOL.test(s.tool.trim()) && backed(s.status));

/** The territory's segments, in order; empty when the seller doesn't split its accounts. */
export const segmentsOf = (territory?: Territory): TerritorySegment[] => territory?.segments ?? [];

/** "?segment=strategic" -> "Strategic"; anything else (or nothing) -> undefined, i.e. all accounts. */
export const segmentFromParam = (value: string | null | undefined, segments: TerritorySegment[]): Segment | undefined =>
  segments.find((s) => s.id.toLowerCase() === (value ?? "").trim().toLowerCase())?.id;

export interface TerritoryRow {
  /** The saved run's id (idea_reports). */
  id: string;
  previousId?: string;
  /** "Relay" */
  name: string;
  /** "relaypro.com" */
  domain?: string;
  /** As typed into the lens: "Relay (relaypro.com)". */
  typed: string;
  motion: MotionLabel;
  fit?: string;
  fitReason?: string;
  onList: boolean;
  /** Omni at the account, from the run's evidence. */
  omni: OmniStatus;
  /** The territory segment, as configured for the seller. */
  segment?: Segment;
  /** Where it's headquartered, "Atlanta, GA". */
  hq?: string;
  /** One plain line on the account, citations dropped. */
  line: string;
  /** The freshest dated why-now item, if any. */
  trigger?: Trigger;
  /** Stack lines that name a tool (Not found dropped). */
  stack: StackChip[];
  sources: ResearchSource[];
  /** When the run finished. */
  ranAt: string;
  /** The seven agents and the verdict are stored with the run. */
  hasAgents: boolean;
  report: SavedReport;
}

/** "Relay (relaypro.com)" -> { name: "Relay", domain: "relaypro.com" }. */
export function splitCompany(typed: string): { name: string; domain?: string } {
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(typed.trim());
  if (m && /\./.test(m[2])) return { name: m[1].trim(), domain: m[2].trim().toLowerCase() };
  return { name: typed.trim() };
}

/** Citations and markdown off: "Raised $36M [2]." -> "Raised $36M." */
export const plainText = (t?: string) => stripMarks(t ?? "").replace(/\s*\[[\d,\s]+\]/g, "").trim();

/**
 * Days from a source date to now: "2026-09-30", "2026-09" (mid-month), or a
 * search result's relative date ("2 months ago", "3 days ago").
 */
export function ageDays(date: string, now: Date = new Date()): number | null {
  const rel = /^(\d+|an?)\s+(day|week|month|year)s?\s+ago/i.exec(date.trim());
  if (rel) {
    const n = /^\d/.test(rel[1]) ? Number(rel[1]) : 1;
    return n * { day: 1, week: 7, month: 30, year: 365 }[rel[2].toLowerCase() as "day"];
  }
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(date);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, m[3] ? Number(m[3]) : 15));
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.round((now.getTime() - d.getTime()) / 86_400_000));
}

const MOTIONS: MotionLabel[] = ["Internal", "Embedded", "Both", "Unclear"];

/** A saved run as a territory row. */
export function toRow(entry: TerritoryAccount, report: SavedReport, now: Date = new Date()): TerritoryRow {
  const brief: AccountBrief = report.brief ?? {};
  const { name, domain } = splitCompany(entry.company || report.idea);
  const label = brief.motion?.label ?? (brief.fit?.motion as MotionLabel | undefined);
  const dated = whyNowItems(brief.revenue_model).find((i) => i.date);
  const age = dated ? ageDays(dated.date, now) : null;
  const stack = (Array.isArray(brief.core_features) ? brief.core_features : [])
    .filter((l) => l.tool && l.status && l.status !== "Not found")
    .map((l) => ({ category: l.name, tool: l.tool ?? "", status: l.status ?? "Inferred", sources: Array.isArray(l.sources) ? l.sources : [] }));
  return {
    id: report.id,
    previousId: entry.previousReportId,
    name,
    domain,
    typed: entry.company || report.idea,
    motion: label && MOTIONS.includes(label) ? label : "Unclear",
    fit: brief.fit?.grade,
    fitReason: plainText(brief.fit?.reason),
    onList: !!brief.customer_list?.on_list,
    omni: omniStatus(brief),
    segment: entry.segment,
    hq: entry.hq,
    line: plainText(brief.account_line),
    trigger: dated && age !== null ? { date: dated.date, text: plainText(dated.text), ageDays: age } : undefined,
    stack,
    sources: Array.isArray(brief.research?.sources) ? brief.research!.sources : [],
    ranAt: report.created_at,
    hasAgents: !!report.auto_analysis?.perspectives?.length,
    report,
  };
}

/** Fit order for sorting: A first, unknown last. */
export const fitRank = (fit?: string) => ({ A: 0, B: 1, C: 2 })[fit?.trim().toUpperCase() as "A" | "B" | "C"] ?? 3;
