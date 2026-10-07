// What the company logo and the company brief read from a territory row.
import { monthLabel } from "@/components/account/explorer/model";
import type { TerritoryRow } from "../model";
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

/** The first sentence, for the brief's one-line why-now ("U.S." doesn't end one). */
export function firstSentence(text: string): string {
  return text.trim().split(/(?<=[.!?])(?<!\b[A-Z]\.)\s+(?=[A-Z0-9"“])/)[0];
}

export interface BriefFacts {
  line: string;
  why?: { month: string; text: string };
}

/** The few facts the brief shows, people's names turned into roles as on the radar. */
export function briefFacts(row: TerritoryRow): BriefFacts {
  const redact = (t: string) => redactPeople(t, row.report.brief?.people);
  return {
    line: redact(row.line),
    why: row.trigger ? { month: monthLabel(row.trigger.date), text: firstSentence(redact(row.trigger.text)) } : undefined,
  };
}
