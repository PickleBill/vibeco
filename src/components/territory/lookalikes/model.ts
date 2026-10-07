// Lookalikes: a seed account's fingerprint (motion, warehouse, BI story,
// trigger type, embedded signal) read from its saved run, and every other
// territory account scored against it, trait by trait, with the points shown.
// Traits only match on evidence: a tool a source confirms, a dated trigger,
// an embedded signal a source shows. Missing evidence never counts as a match.
import type { MotionLabel } from "@/components/account/AccountViews";
import { monthLabel } from "@/components/account/explorer/model";
import type { TerritoryRow } from "../model";
import { freshestTrigger, isBI, isWarehouse, stackByTool, startOfDay, toolKey, TRIGGER_LABEL, type FreshTrigger, type TriggerKind } from "../radar/evidence";

export interface Tool {
  name: string;
  key: string;
  sources: number[];
}

export interface Fingerprint {
  id: string;
  name: string;
  motion: MotionLabel;
  motionSources: number[];
  /** Confirmed warehouses. */
  warehouse: Tool[];
  /** Confirmed BI tools, the seller's own tool left out. */
  bi: Tool[];
  /** The seller's own tool when a source confirms it (shown, never scored). */
  sellerTool?: Tool;
  /** BI tools a source says they moved off. */
  movedOff: Tool[];
  trigger?: FreshTrigger;
  triggerKind: TriggerKind | "none";
  embedded: boolean;
  embeddedSources: number[];
  onList: boolean;
  listSource?: string;
  fit?: string;
}

const tools = (row: TerritoryRow, test: (category: string) => boolean, status: string): Tool[] =>
  stackByTool(row.stack)
    .filter((s) => test(s.category) && s.status === status)
    .map((s) => ({ name: s.tool, key: toolKey(s.tool), sources: s.sources }));

/** A saved run as a fingerprint. `sellerName` ("Omni") marks the seller's own tool so it never counts as an incumbent. */
export function fingerprintOf(row: TerritoryRow, sellerName: string, now: Date = startOfDay()): Fingerprint {
  const brief = row.report.brief ?? {};
  const own = sellerName.trim().toLowerCase();
  const bi = tools(row, isBI, "Confirmed");
  const emb = brief.motion?.embedded;
  const embEvidence = Array.isArray(emb?.evidence) ? emb!.evidence : [];
  const side = (k: "internal" | "embedded") => (Array.isArray(brief.motion?.[k]?.sources) ? brief.motion![k].sources : []);
  const trigger = freshestTrigger(row, now);
  return {
    id: row.id,
    name: row.name,
    motion: row.motion,
    motionSources: row.motion === "Internal" ? side("internal") : row.motion === "Embedded" ? side("embedded") : [...new Set([...side("internal"), ...side("embedded")])],
    warehouse: tools(row, isWarehouse, "Confirmed"),
    bi: bi.filter((t) => t.key !== own),
    sellerTool: bi.find((t) => t.key === own),
    movedOff: tools(row, isBI, "Former").filter((t) => t.key !== own),
    trigger,
    triggerKind: trigger?.kind ?? "none",
    embedded: embEvidence.length > 0,
    embeddedSources: [...new Set(embEvidence.map((e) => e.source).filter((n) => typeof n === "number"))],
    onList: row.onList,
    listSource: brief.customer_list?.source,
    fit: row.fit,
  };
}

// ─── Scoring ───

export type TraitId = "motion" | "warehouse" | "bi" | "trigger" | "embedded";
export type Match = "full" | "partial" | "none" | "unknown";

export const WEIGHTS: Record<TraitId, number> = { motion: 30, warehouse: 20, bi: 20, trigger: 15, embedded: 15 };
export const TRAIT_LABEL: Record<TraitId, string> = { motion: "Motion", warehouse: "Warehouse", bi: "BI story", trigger: "Trigger", embedded: "Embedded" };

export interface TraitScore {
  id: TraitId;
  match: Match;
  points: number;
  /** "Both vs Internal", "Snowflake", "seed: none found". */
  detail: string;
}

export interface Lookalike {
  fp: Fingerprint;
  score: number;
  traits: TraitScore[];
  story: string;
}

const pts = (id: TraitId, m: Match) => (m === "full" ? WEIGHTS[id] : m === "partial" ? Math.round(WEIGHTS[id] / 2) : 0);
const shared = (a: Tool[], b: Tool[]) => a.filter((t) => b.some((u) => u.key === t.key));
const names = (t: Tool[]) => t.map((x) => x.name).join(", ");
/** A trigger counts as recent for the partial match within 90 days. */
const RECENT = 90;

function motionTrait(seed: Fingerprint, c: Fingerprint): TraitScore {
  if (seed.motion === "Unclear") return { id: "motion", match: "unknown", points: 0, detail: "seed unclear" };
  if (c.motion === "Unclear") return { id: "motion", match: "none", points: 0, detail: "unclear" };
  if (c.motion === seed.motion) return { id: "motion", match: "full", points: pts("motion", "full"), detail: c.motion };
  // Both shares a side with Internal and with Embedded.
  const m: Match = seed.motion === "Both" || c.motion === "Both" ? "partial" : "none";
  return { id: "motion", match: m, points: pts("motion", m), detail: `${c.motion} vs ${seed.motion}` };
}

function warehouseTrait(seed: Fingerprint, c: Fingerprint): TraitScore {
  if (!seed.warehouse.length) return { id: "warehouse", match: "unknown", points: 0, detail: "seed: none confirmed" };
  const same = shared(c.warehouse, seed.warehouse);
  if (same.length) return { id: "warehouse", match: "full", points: pts("warehouse", "full"), detail: names(same) };
  if (c.warehouse.length) return { id: "warehouse", match: "partial", points: pts("warehouse", "partial"), detail: `${names(c.warehouse)} vs ${names(seed.warehouse)}` };
  return { id: "warehouse", match: "none", points: 0, detail: "none confirmed" };
}

/** Same incumbent BI, same tool moved off, or the seed moved off what they run (the strongest story). */
function biTrait(seed: Fingerprint, c: Fingerprint): TraitScore {
  if (!seed.bi.length && !seed.movedOff.length) return { id: "bi", match: "unknown", points: 0, detail: "seed: no BI story" };
  const runsWhatSeedLeft = shared(c.bi, seed.movedOff);
  if (runsWhatSeedLeft.length) return { id: "bi", match: "full", points: pts("bi", "full"), detail: `runs ${names(runsWhatSeedLeft)}, which ${seed.name} moved off` };
  const same = shared(c.bi, seed.bi);
  if (same.length) return { id: "bi", match: "full", points: pts("bi", "full"), detail: `both run ${names(same)}` };
  const left = shared(c.movedOff, seed.movedOff);
  if (left.length) return { id: "bi", match: "full", points: pts("bi", "full"), detail: `both moved off ${names(left)}` };
  if (c.bi.length) return { id: "bi", match: "partial", points: pts("bi", "partial"), detail: `incumbent ${names(c.bi)}` };
  return { id: "bi", match: "none", points: 0, detail: "no confirmed BI" };
}

function triggerTrait(seed: Fingerprint, c: Fingerprint): TraitScore {
  if (!seed.trigger) return { id: "trigger", match: "unknown", points: 0, detail: "seed: no dated trigger" };
  if (!c.trigger) return { id: "trigger", match: "none", points: 0, detail: "no dated trigger" };
  if (c.triggerKind === seed.triggerKind && c.triggerKind !== "other") return { id: "trigger", match: "full", points: pts("trigger", "full"), detail: TRIGGER_LABEL[c.triggerKind] };
  if (c.trigger.days <= RECENT && seed.trigger.days <= RECENT) return { id: "trigger", match: "partial", points: pts("trigger", "partial"), detail: `${TRIGGER_LABEL[c.triggerKind]}, both recent` };
  return { id: "trigger", match: "none", points: 0, detail: TRIGGER_LABEL[c.triggerKind] };
}

function embeddedTrait(seed: Fingerprint, c: Fingerprint): TraitScore {
  if (!seed.embedded) return { id: "embedded", match: "unknown", points: 0, detail: "seed: none found" };
  return c.embedded ? { id: "embedded", match: "full", points: pts("embedded", "full"), detail: "ships analytics to customers" } : { id: "embedded", match: "none", points: 0, detail: "none found" };
}

/** 0–100: the sum of each trait's points (full = its weight, partial = half, otherwise 0). */
export function scoreLookalike(seed: Fingerprint, c: Fingerprint): Lookalike {
  const traits = [motionTrait(seed, c), warehouseTrait(seed, c), biTrait(seed, c), triggerTrait(seed, c), embeddedTrait(seed, c)];
  const score = Math.max(0, Math.min(100, traits.reduce((s, t) => s + t.points, 0)));
  return { fp: c, score, traits, story: storyLine(seed, c, traits) };
}

// ─── The story they'll relate to ───

const MOTION_DOES: Record<MotionLabel, string> = {
  Internal: "buys analytics for its own teams",
  Embedded: "ships analytics inside its product",
  Both: "runs analytics internally and inside its product",
  Unclear: "",
};

const TRIGGER_DID: Record<TriggerKind, string> = {
  funding: "raised money",
  acquisition: "changed owners",
  leadership: "made a leadership hire",
  launch: "launched a product",
  hiring: "is hiring",
  other: "",
};

const join = (parts: string[]) => (parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`);

/**
 * One plain line from the traits that matched, in the candidate's terms. Only
 * facts both runs carry; nothing about either company that a trait didn't check.
 */
export function storyLine(seed: Fingerprint, c: Fingerprint, traits: TraitScore[]): string {
  const t = Object.fromEntries(traits.map((x) => [x.id, x])) as Record<TraitId, TraitScore>;
  const full: string[] = [];
  let lead = "";
  if (t.bi.match === "full") {
    const left = shared(c.bi, seed.movedOff);
    if (left.length) lead = `${seed.name} moved off ${names(left)}, which ${c.name} still runs`;
    else {
      const same = shared(c.bi, seed.bi);
      full.push(same.length ? `runs ${names(same)}` : `moved off ${names(shared(c.movedOff, seed.movedOff))}`);
    }
  }
  if (t.motion.match === "full" && MOTION_DOES[c.motion]) full.push(MOTION_DOES[c.motion]);
  if (t.warehouse.match === "full") full.push(`runs on ${t.warehouse.detail}`);
  if (t.trigger.match === "full" && c.trigger && TRIGGER_DID[c.triggerKind]) full.push(`${TRIGGER_DID[c.triggerKind]} (${monthLabel(c.trigger.date)})`);
  if (t.embedded.match === "full") full.push("ships analytics to its own customers");

  if (lead) return `${lead}${full.length ? `; like ${seed.name}, it ${join(full.slice(0, 2))}` : ""}.`;
  if (full.length) return `Like ${seed.name}, ${c.name} ${join(full.slice(0, 3))}.`;

  const partial: string[] = [];
  if (t.motion.match === "partial") partial.push(`shares the ${c.motion === "Both" ? seed.motion.toLowerCase() : c.motion.toLowerCase()} side of the motion`);
  if (t.bi.match === "partial") partial.push(`has an incumbent BI tool (${names(c.bi)})`);
  if (t.warehouse.match === "partial") partial.push(`has a confirmed warehouse (${names(c.warehouse)})`);
  if (t.trigger.match === "partial") partial.push("had a dated trigger in the last 90 days");
  if (partial.length) return `Partly like ${seed.name}: ${c.name} ${join(partial.slice(0, 3))}.`;
  return `No trait in common with ${seed.name} in the saved runs.`;
}

/** Every candidate scored and ranked, best first (ties by name). */
export function rankLookalikes(seed: Fingerprint, candidates: Fingerprint[]): Lookalike[] {
  return candidates
    .filter((c) => c.id !== seed.id)
    .map((c) => scoreLookalike(seed, c))
    .sort((a, b) => b.score - a.score || a.fp.name.localeCompare(b.fp.name));
}
