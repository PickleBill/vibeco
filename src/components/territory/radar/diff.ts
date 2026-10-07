// What moved between two runs of the same account. Only changes a source in the
// newer run backs count: a tool newly Confirmed or newly Former, a new dated
// why-now event, a different motion, a different fit grade. A tool that simply
// isn't mentioned this time is not a change (absence isn't evidence).
import { useEffect, useState } from "react";
import type { AccountBrief, MotionLabel } from "@/components/account/AccountViews";
import { whyNowItems } from "@/components/account/explorer/model";
import { loadReport, type SavedReport } from "@/components/account/explorer/savedRuns";
import { plainText, type StackChip, type TerritoryRow } from "../model";
import { citations, stackByTool, toolKey } from "./evidence";

export type ChangeKind = "stack" | "trigger" | "motion" | "fit";

export interface RunChange {
  kind: ChangeKind;
  /** "BI tools · Metabase", "Why now", "Motion", "Fit". */
  field: string;
  /** The earlier value: a stack status ("Not found" when the tool wasn't named), a motion, a grade. */
  before?: string;
  after?: string;
  /** Sources in the newer run behind the change. */
  sources: number[];
}

const BACKED = new Set(["Confirmed", "Former"]);

function stackOf(brief: AccountBrief): StackChip[] {
  const lines = Array.isArray(brief.core_features) ? brief.core_features : [];
  return stackByTool(
    lines
      .filter((l) => l.tool && l.status && l.status !== "Not found")
      .map((l) => ({ category: l.name, tool: l.tool ?? "", status: l.status ?? "Inferred", sources: Array.isArray(l.sources) ? l.sources : [] })),
  );
}

const STOP = new Set(["with", "from", "that", "this", "their", "have", "into", "about", "after", "over", "were", "will", "which", "while", "since"]);
const words = (t: string) =>
  new Set(
    plainText(t)
      .toLowerCase()
      .split(/[^a-z0-9$.]+/)
      .map((w) => w.replace(/\.+$/, ""))
      .filter((w) => (w.length >= 4 || /\d/.test(w)) && !STOP.has(w)),
  );

/** Two why-now lines about the same event: same month, and most of the shorter one's words in the other. */
function sameEvent(a: { date: string; text: string }, b: { date: string; text: string }): boolean {
  if (a.date.slice(0, 7) !== b.date.slice(0, 7)) return false;
  const wa = words(a.text);
  const wb = words(b.text);
  const small = Math.min(wa.size, wb.size);
  if (!small) return true;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / small >= 0.5;
}

const motionOf = (b: AccountBrief): MotionLabel | undefined => b.motion?.label ?? (b.fit?.motion as MotionLabel | undefined);
const grade = (b: AccountBrief) => b.fit?.grade?.trim().toUpperCase().slice(0, 1) || undefined;

/** The evidence-backed changes from `prev` to `next` (two runs of one account), stack first. */
export function diffRuns(prev: SavedReport, next: SavedReport): RunChange[] {
  const a = prev.brief ?? {};
  const b = next.brief ?? {};
  const changes: RunChange[] = [];

  const before = new Map(stackOf(a).map((s) => [toolKey(s.tool), s]));
  for (const s of stackOf(b)) {
    if (!BACKED.has(s.status) || !s.sources.length) continue;
    const was = before.get(toolKey(s.tool));
    if (was?.status === s.status) continue;
    changes.push({ kind: "stack", field: `${s.category} · ${s.tool}`, before: was?.status ?? "Not found", after: s.status, sources: s.sources });
  }

  const earlier = whyNowItems(a.revenue_model).filter((i) => i.date);
  for (const item of whyNowItems(b.revenue_model)) {
    const sources = citations(item.text);
    if (!item.date || !sources.length || earlier.some((e) => sameEvent(e, item))) continue;
    changes.push({ kind: "trigger", field: "Why now", after: `${item.date}: ${plainText(item.text)}`, sources });
  }

  const m0 = motionOf(a);
  const m1 = motionOf(b);
  if (m0 && m1 && m0 !== m1 && m1 !== "Unclear") {
    const side = (k: "internal" | "embedded") => (Array.isArray(b.motion?.[k]?.sources) ? b.motion![k].sources : []);
    const sources = [...new Set(m1 === "Internal" ? side("internal") : m1 === "Embedded" ? side("embedded") : [...side("internal"), ...side("embedded")])];
    if (sources.length) changes.push({ kind: "motion", field: "Motion", before: m0, after: m1, sources });
  }

  const g0 = grade(a);
  const g1 = grade(b);
  if (g0 && g1 && g0 !== g1) changes.push({ kind: "fit", field: "Fit", before: g0, after: g1, sources: citations(b.fit?.reason) });

  return changes;
}

/** One line for a change card's headline. */
export function changeHeadline(c: RunChange): string {
  if (c.kind === "trigger") return (c.after ?? "").replace(/^\d{4}-\d{2}(?:-\d{2})?:\s*/, "");
  if (c.kind === "stack") {
    const tool = c.field.split(" · ").pop();
    return c.after === "Former" ? `${tool} is now Former: a source says they moved off it` : `${tool} is now Confirmed by a source`;
  }
  if (c.kind === "motion") return `Motion moved from ${c.before} to ${c.after}`;
  return `Fit moved from ${c.before} to ${c.after}`;
}

/**
 * Changes per account, for accounts that have an earlier run to compare
 * (TerritoryAccount.previousReportId). Loads nothing when none do.
 */
export function useRunDiffs(rows: TerritoryRow[]): Record<string, RunChange[]> {
  const pairs = rows.filter((r) => r.previousId);
  const key = pairs.map((r) => `${r.id}:${r.previousId}`).join(",");
  const [diffs, setDiffs] = useState<Record<string, RunChange[]>>({});
  useEffect(() => {
    let live = true;
    for (const r of pairs) {
      loadReport(r.previousId!).then((prev) => {
        if (live && prev) setDiffs((d) => ({ ...d, [r.id]: diffRuns(prev, r.report) }));
      });
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the run pairs change
  }, [key]);
  return diffs;
}
