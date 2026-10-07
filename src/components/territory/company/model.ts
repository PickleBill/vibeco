// What the company logo and the company brief read from a territory row.
import { monthLabel } from "@/components/account/explorer/model";
import type { StackChip, TerritoryRow } from "../model";
import { redactPeople } from "../radar/evidence";

/** The public favicon service; it answers a 16px globe when it has nothing for the domain. */
export const logoUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

/** At or under this width the service sent its placeholder globe, not the company's icon. */
export const PLACEHOLDER_WIDTH = 16;

/** "Guitar Center" -> "GC", "Relay" -> "R"; one letter when `max` is 1. */
export function initialsOf(name: string, max = 2): string {
  const words = name
    .replace(/\(.*?\)/g, " ")
    .split(/[\s\-_/&.,]+/)
    .filter((w) => /[a-z0-9]/i.test(w));
  return words
    .slice(0, max)
    .map((w) => w.replace(/[^a-z0-9]/gi, "")[0] ?? "")
    .join("")
    .toUpperCase();
}

/** "Oct 6, 2026" for the run's day. */
export function runDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export interface BriefFacts {
  line: string;
  why?: { month: string; text: string };
  /** Up to five Confirmed tools, one per category and tool. */
  stack: StackChip[];
  sources: number;
  day: string;
}

/** The few facts the brief shows, people's names turned into roles as on the radar. */
export function briefFacts(row: TerritoryRow): BriefFacts {
  const redact = (t: string) => redactPeople(t, row.report.brief?.people);
  const seen = new Set<string>();
  const stack = row.stack.filter((s) => {
    const key = `${s.category}|${s.tool}`.toLowerCase();
    if (s.status !== "Confirmed" || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    line: redact(row.line),
    why: row.trigger ? { month: monthLabel(row.trigger.date), text: redact(row.trigger.text) } : undefined,
    stack: stack.slice(0, 5),
    sources: row.sources.length,
    day: runDay(row.ranAt),
  };
}
