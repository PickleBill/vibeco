// The radar's read of each account: its freshest trigger, its changes since the
// last run, the stack a source backs, the question to ask. And the geometry of
// the radar itself (rings by trigger age, one sector per motion).
import type { MotionLabel } from "@/components/account/AccountViews";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { fitRank, plainText, type StackChip, type TerritoryRow } from "../model";
import type { RunChange } from "./diff";
import { fitLabels, shortName, textBox, type Box, type PlacedLabel } from "./labels";
import { citations, datedSources, dayLabel, freshestTrigger, isBI, isWarehouse, questionFor, redactPeople, shortRole, stackByTool, startOfDay, type FreshTrigger } from "./evidence";

/** A trigger this recent puts the account on "What's fresh". */
export const FRESH_DAYS = 60;
/** A trigger this recent (or a change) makes the blip pulse. */
export const PULSE_DAYS = 30;

/** The data stack a BI seller cares about first: warehouse, BI, transformation, then the rest. */
const stackOrder = (category: string) => (isWarehouse(category) ? 0 : isBI(category) ? 1 : /transform|model/i.test(category) ? 2 : /embedded/i.test(category) ? 3 : 4);

export interface RadarAccount {
  row: TerritoryRow;
  /** On-topic sources, dates as days. */
  sources: ResearchSource[];
  trigger?: FreshTrigger;
  /** Evidence-backed changes since the previous run (empty when there's no previous run). */
  changes: RunChange[];
  /** Confirmed and Former stack, one line per tool, warehouse and BI first. */
  stack: StackChip[];
  question: string;
  /** "Start with the VP of Data", or the question when no role is named. */
  nextMove: string;
  /** Why the account matters (the fit reason, plain). */
  why: string;
  fitSources: number[];
  /** The run's text with named people turned into roles; every line shown goes through it. */
  redact: (text: string) => string;
  fresh: boolean;
  pulse: boolean;
}

export function toRadarAccount(row: TerritoryRow, changes: RunChange[] = [], now: Date = startOfDay()): RadarAccount {
  const brief = row.report.brief ?? {};
  const redact = (t: string) => redactPeople(t, brief.people);
  const found = freshestTrigger(row, now);
  const trigger = found && { ...found, text: redact(found.text) };
  const role = shortRole(brief.start_with?.role);
  const question = redact(questionFor(brief, row.motion));
  const backed = stackByTool(row.stack)
    .filter((s) => s.status === "Confirmed" || s.status === "Former")
    .sort((a, b) => stackOrder(a.category) - stackOrder(b.category) || Number(a.status === "Former") - Number(b.status === "Former"));
  return {
    row,
    sources: datedSources(row).map((src) => ({ ...src, title: redact(src.title ?? "") })),
    trigger,
    changes,
    stack: backed,
    question,
    nextMove: role ? `Start with the ${role.replace(/^the\s+/i, "")}` : question,
    why: redact(row.fitReason ?? ""),
    fitSources: citations(brief.fit?.reason),
    redact,
    fresh: changes.length > 0 || (!!trigger && trigger.days <= FRESH_DAYS),
    pulse: changes.length > 0 || (!!trigger && trigger.days <= PULSE_DAYS),
  };
}

/** Changed accounts first, then the freshest trigger, then fit. */
export function byFreshness(a: RadarAccount, b: RadarAccount): number {
  return (
    Number(b.changes.length > 0) - Number(a.changes.length > 0) ||
    (a.trigger?.days ?? Infinity) - (b.trigger?.days ?? Infinity) ||
    fitRank(a.row.fit) - fitRank(b.row.fit) ||
    a.row.name.localeCompare(b.row.name)
  );
}

/** One plain line for an account's motion. */
export const MOTION_LINE: Record<MotionLabel, string> = {
  Internal: "analytics for its own teams",
  Embedded: "analytics inside its product",
  Both: "internal and embedded",
  Unclear: "not clear from the sources",
};

/** Sources the motion read rests on, for the motion's side(s). */
export function motionSources(row: TerritoryRow): number[] {
  const m = row.report.brief?.motion;
  const side = (k: "internal" | "embedded") => (Array.isArray(m?.[k]?.sources) ? m![k].sources : []);
  if (row.motion === "Internal") return side("internal");
  if (row.motion === "Embedded") return side("embedded");
  return [...new Set([...side("internal"), ...side("embedded")])];
}

/** The digest's plain text, for the clipboard. */
export function digestText(territory: string, subject: string, top: RadarAccount[]): string {
  const lines = [`Radar · ${territory}`, subject, ""];
  top.forEach((a, i) => {
    const what = a.changes.length ? `changed since the last run` : a.trigger ? `${a.trigger.text} (${dayLabel(a.trigger.date)})` : "no dated trigger";
    lines.push(`${i + 1}. ${a.row.name} · ${what}`);
    if (a.question) lines.push(`   Ask: "${a.question}"`);
  });
  lines.push("", "Internal: for the seller only. Never sent to prospects.");
  return lines.join("\n");
}

export const shortText = (t: string, n = 140) => {
  const s = plainText(t);
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
};

// ─── Geometry (viewBox 0 0 400 400, centre 200,200) ───

export const C = 200;
/** Ring radii: the "today" disc, 30 days, 90 days, a year, the no-trigger band, the rim. */
export const RINGS = { today: 26, d30: 67, d90: 97, year: 169, none: 180, rim: 196 };

/** Distance from the centre for a trigger this old (square-root scale, so the first weeks get room). */
export function radiusFor(days: number | undefined | null): number {
  if (days == null) return RINGS.none;
  return 184 * (0.14 + 0.78 * Math.min(1, Math.sqrt(Math.max(0, days) / 365)));
}

export interface Sector {
  motion: MotionLabel;
  /** Degrees, SVG convention (0 = right, clockwise). */
  start: number;
  end: number;
  /** Where the label sits: a corner of the square, outside the circle. */
  corner: "tl" | "tr" | "bl" | "br";
}

/**
 * Internal top-left, Embedded top-right, Both along the bottom; a thin
 * Unclear wedge bottom-right only when some account's motion is unclear.
 * Each sector contains the corner its label sits in.
 */
export function sectors(withUnclear: boolean): Sector[] {
  return [
    { motion: "Internal", start: 150, end: 270, corner: "tl" },
    { motion: "Embedded", start: 270, end: 390, corner: "tr" },
    ...(withUnclear
      ? ([
          { motion: "Unclear", start: 30, end: 66, corner: "br" },
          { motion: "Both", start: 66, end: 150, corner: "bl" },
        ] as Sector[])
      : ([{ motion: "Both", start: 30, end: 150, corner: "bl" }] as Sector[])),
  ];
}

export const polar = (r: number, deg: number) => ({ x: C + r * Math.cos((deg * Math.PI) / 180), y: C + r * Math.sin((deg * Math.PI) / 180) });

export interface Blip {
  account: RadarAccount;
  x: number;
  y: number;
}

/** How close two blip centres may sit, in chart units (the largest dot plus a little air). */
export const BLIP_GAP = 22;

/**
 * Blip positions: radius by trigger age; within its motion's sector, evenly
 * spaced, with accounts of similar age dealt to opposite halves. The radius
 * is the data, so a blip that would land on another (a crowded ring in a big
 * territory) slides along its ring, within its sector, to the nearest angle
 * with room; when none has room, to the roomiest. Blips keep clear of the
 * sector dividers.
 */
export function placeBlips(accounts: RadarAccount[]): Blip[] {
  const secs = sectors(accounts.some((a) => a.row.motion === "Unclear"));
  const out: Blip[] = [];
  // The ring ages and "today" sit on the chart; a blip on one counts as no room at all.
  const fixed = [...RING_LABELS.map((l) => textBox(C, C - l.r, l.text, 1.15)), textBox(C, C + 20, "today", 1.15)].map((b) => ({ x0: b.x0 - 10, x1: b.x1 + 10, y0: b.y0 - 10, y1: b.y1 + 10 }));
  const room = (p: { x: number; y: number }) =>
    fixed.some((b) => p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1) ? 0 : out.reduce((m, b) => Math.min(m, Math.hypot(p.x - b.x, p.y - b.y)), Infinity);
  for (const s of secs) {
    const mine = accounts.filter((a) => a.row.motion === s.motion).sort((a, b) => (a.trigger?.days ?? 9999) - (b.trigger?.days ?? 9999) || a.row.name.localeCompare(b.row.name));
    const n = mine.length;
    const half = Math.ceil(n / 2);
    mine.forEach((a, i) => {
      const slot = i % 2 === 0 ? i / 2 : half + (i - 1) / 2;
      const r = radiusFor(a.trigger?.days);
      // At least 10 units off each divider (more angle near the centre, where degrees are short).
      const pad = Math.min((s.end - s.start) / 2, Math.max(3, (Math.asin(Math.min(1, 10 / r)) * 180) / Math.PI));
      const lo = s.start + pad;
      const hi = s.end - pad;
      const ideal = Math.min(hi, Math.max(lo, s.start + ((s.end - s.start) * (slot + 1)) / (n + 1)));
      let deg = ideal;
      let best = room(polar(r, ideal));
      if (best < BLIP_GAP) {
        let near: number | undefined;
        for (let d = lo; d <= hi; d += 1) {
          const gap = room(polar(r, d));
          if (gap >= BLIP_GAP && (near === undefined || Math.abs(d - ideal) < Math.abs(near - ideal))) near = d;
          if (gap > best) {
            best = gap;
            deg = d;
          }
        }
        if (near !== undefined) deg = near;
      }
      const p = polar(r, deg);
      out.push({ account: a, x: p.x, y: p.y });
    });
  }
  return out;
}

/** The radar's fixed text: ring ages up the top divider, "today" under the centre. */
export const RING_LABELS: { r: number; text: string }[] = [
  { r: RINGS.d30, text: "30d" },
  { r: RINGS.d90, text: "90d" },
  { r: RINGS.year, text: "1 yr" },
  { r: 188, text: "no date" },
];

/** Where an empty sector says so: midway out, at its middle angle. */
export const emptyNoteAt = (s: Sector) => polar(118, (s.start + s.end) / 2);
export const EMPTY_NOTE = "No accounts yet";

/** Boxes the fixed labels take (corner motions, ring ages, empty-sector notes), at `s` chart units per pixel. */
export function reservedBoxes(secs: Sector[], empty: MotionLabel[], s: number): Box[] {
  const out: Box[] = [];
  for (const sec of secs) {
    const w = (sec.motion.length * 8.2 + 8) * s;
    const h = 22 * s;
    const left = sec.corner === "tl" || sec.corner === "bl";
    const top = sec.corner === "tl" || sec.corner === "tr";
    out.push({ x0: left ? 0 : 400 - w, x1: left ? w : 400, y0: top ? 0 : 400 - h, y1: top ? h : 400 });
    if (empty.includes(sec.motion)) {
      const p = emptyNoteAt(sec);
      out.push(textBox(p.x, p.y, EMPTY_NOTE, s));
    }
  }
  for (const l of RING_LABELS) out.push(textBox(C, C - l.r, l.text, s));
  out.push(textBox(C, C + 20 * s, "today", s));
  return out;
}

/**
 * Names next to blips that don't overlap anything: the focused account
 * first, then pulsing ones, then by trigger age (no-trigger ones last).
 */
export function placeLabels(blips: Blip[], focusId: string | null | undefined, s = 1, reserved: Box[] = []): PlacedLabel[] {
  const age = (b: Blip) => b.account.trigger?.days ?? 9999;
  const order = [...blips].sort(
    (a, b) => Number(b.account.row.id === focusId) - Number(a.account.row.id === focusId) || Number(b.account.pulse) - Number(a.account.pulse) || age(a) - age(b),
  );
  return fitLabels(
    order.map((b) => ({ id: b.account.row.id, text: shortName(b.account.row.name), x: b.x, y: b.y })),
    s,
    reserved,
  );
}

/** An SVG path for a pie wedge from `start` to `end` degrees. */
export function wedge(r: number, start: number, end: number): string {
  const a = polar(r, start);
  const b = polar(r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M${C} ${C} L${a.x.toFixed(2)} ${a.y.toFixed(2)} A${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;
}
