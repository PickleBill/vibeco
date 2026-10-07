// The committee view's data: what committee-sim returns (and a saved run keeps
// at auto_analysis.committee), the stance scale, the seats at the table, the
// meeting as a timeline of turns, and the what-ifs a brief honestly supports.
import type { AccountBrief } from "@/components/account/AccountViews";
import type { AccountAnalysis, CriticResult } from "@/components/account/explorer/model";
import { criticFor } from "@/lib/lenses";

export type SeatId = "champion" | "skeptic" | "competitor" | "customer" | "builder";

/** -2 blocks, -1 leans no, 0 neutral, 1 leans yes, 2 sponsors. */
export type Stance = -2 | -1 | 0 | 1 | 2;

export interface CommitteeSeat {
  seat: SeatId;
  /** "Head of Data" */
  role: string;
  stance_start: Stance;
  stance_end: Stance;
  influence: 1 | 2 | 3;
  /** May cite [n]. */
  top_concern: string;
}

export interface CommitteeTurn {
  seat: SeatId;
  /** May cite [n]. */
  says: string;
  stance_after: Stance;
}

export interface CommitteeRound {
  title: string;
  turns: CommitteeTurn[];
}

export type OutcomeLabel = "Likely yes" | "Coin flip" | "Uphill" | "Too early";

/** One simulated buying meeting. */
export interface CommitteeResult {
  /** Five seats, champion to builder. */
  seats: CommitteeSeat[];
  rounds: CommitteeRound[];
  path_to_yes: { step: string; seat: SeatId; why: string }[];
  main_blocker: { seat: SeatId; why: string; what_would_flip_it: string };
  /** A synthetic percent band, not a forecast. */
  outcome: { label: OutcomeLabel; low: number; high: number; summary: string };
  /** The hypotheticals this run assumed (never stored). */
  what_if?: string[];
  cached?: boolean;
  generated_at?: string;
}

/** A saved run's analysis, with the meeting the endpoint keeps there. */
export type AnalysisWithCommittee = AccountAnalysis & { committee?: unknown };

/** Seat order at the table and everywhere else (mirrors SEATS in lib/lenses). */
export const SEAT_IDS: SeatId[] = ["champion", "skeptic", "competitor", "customer", "builder"];

/** What each seat's token reads. */
export const SEAT_INITIALS: Record<SeatId, string> = { champion: "HD", skeptic: "CFO", competitor: "BI", customer: "BU", builder: "AE" };

export const isSeat = (s: unknown): s is SeatId => typeof s === "string" && (SEAT_IDS as string[]).includes(s);

/** "Head of Data": the meeting's own role name, else the account lens's. */
export function seatRole(seat: SeatId, committee?: CommitteeResult | null): string {
  return committee?.seats.find((s) => s.seat === seat)?.role || criticFor("account", seat)?.name || seat;
}

// ─── Stances ───

const STANCE_WORDS: Record<Stance, string> = { [-2]: "Blocks", [-1]: "Leans no", 0: "Neutral", 1: "Leans yes", 2: "Sponsors" };

export const stanceWord = (v: Stance) => STANCE_WORDS[v];

/** Anything to a stance: rounded and held to -2..2 (0 when it isn't a number). */
export function clampStance(v: unknown): Stance {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.max(-2, Math.min(2, Math.round(n))) as Stance;
}

/** Where a stance sits on a blocks…sponsors track: -2 -> 0%, 0 -> 50%, 2 -> 100%. */
export const stancePercent = (v: Stance) => ((v + 2) / 4) * 100;

/** "+1", "-2", "0". */
export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/**
 * The token's ring for a stance: sponsor solid ink, leans yes solid grey,
 * neutral dotted, leans no dashed grey, blocks dashed ink. The word under the
 * token carries the meaning; the ring is the shape cue.
 */
export const STANCE_RING: Record<Stance, string> = {
  [2]: "border-[4px] border-solid border-foreground",
  [1]: "border-[3px] border-solid border-[#9097A6]",
  [0]: "border-[3px] border-dotted border-[#4A4F63]",
  [-1]: "border-[3px] border-dashed border-[#9097A6]",
  [-2]: "border-[3px] border-dashed border-foreground",
};

// ─── Reading a meeting ───

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const LABELS: OutcomeLabel[] = ["Likely yes", "Coin flip", "Uphill", "Too early"];
const pct = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

/**
 * A meeting as the endpoint or a saved run gives it, checked: known seats only
 * (in seat order), stances held to -2..2, a band inside 0..100. Null when the
 * shape isn't a meeting (no seats, no rounds or no outcome).
 */
export function readCommittee(raw: unknown): CommitteeResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const rawSeats = Array.isArray(r.seats) ? (r.seats as Record<string, unknown>[]) : [];
  const seats = SEAT_IDS.flatMap((id): CommitteeSeat[] => {
    const s = rawSeats.find((x) => x && x.seat === id);
    if (!s) return [];
    const inf = Math.round(Number(s.influence));
    return [
      {
        seat: id,
        role: text(s.role) || seatRole(id),
        stance_start: clampStance(s.stance_start),
        stance_end: clampStance(s.stance_end ?? s.stance_start),
        influence: (inf >= 1 && inf <= 3 ? inf : 1) as 1 | 2 | 3,
        top_concern: text(s.top_concern),
      },
    ];
  });
  const rounds = (Array.isArray(r.rounds) ? (r.rounds as Record<string, unknown>[]) : [])
    .map((rd, i) => ({
      title: text(rd?.title) || `Round ${i + 1}`,
      turns: (Array.isArray(rd?.turns) ? (rd.turns as Record<string, unknown>[]) : [])
        .filter((t) => t && isSeat(t.seat) && text(t.says))
        .map((t) => ({ seat: t.seat as SeatId, says: text(t.says), stance_after: clampStance(t.stance_after) })),
    }))
    .filter((rd) => rd.turns.length);
  const o = (r.outcome ?? {}) as Record<string, unknown>;
  if (!seats.length || !rounds.length || !LABELS.includes(o.label as OutcomeLabel)) return null;
  const [low, high] = [pct(o.low), pct(o.high)].sort((a, b) => a - b);
  const blocker = (r.main_blocker ?? {}) as Record<string, unknown>;
  return {
    seats,
    rounds,
    path_to_yes: (Array.isArray(r.path_to_yes) ? (r.path_to_yes as Record<string, unknown>[]) : [])
      .filter((p) => p && text(p.step))
      .map((p) => ({ step: text(p.step), seat: isSeat(p.seat) ? p.seat : "champion", why: text(p.why) })),
    main_blocker: { seat: isSeat(blocker.seat) ? blocker.seat : "skeptic", why: text(blocker.why), what_would_flip_it: text(blocker.what_would_flip_it) },
    outcome: { label: o.label as OutcomeLabel, low, high, summary: text(o.summary) },
    what_if: Array.isArray(r.what_if) ? (r.what_if as unknown[]).map(text).filter(Boolean) : undefined,
    cached: r.cached === true,
    generated_at: text(r.generated_at) || undefined,
  };
}

// ─── The meeting as a timeline ───

/** One line in the meeting, in speaking order. */
export interface Step {
  /** 0-based round. */
  round: number;
  seat: SeatId;
  says: string;
  stance_after: Stance;
}

export function timeline(c: CommitteeResult | null | undefined): Step[] {
  if (!c) return [];
  return c.rounds.flatMap((rd, round) => rd.turns.map((t) => ({ round, seat: t.seat, says: t.says, stance_after: t.stance_after })));
}

/** Every seat's stance once the first `shown` lines have been spoken (all of them: the meeting's end). */
export function stancesAt(c: CommitteeResult, steps: Step[], shown: number): Partial<Record<SeatId, Stance>> {
  const out: Partial<Record<SeatId, Stance>> = {};
  for (const s of c.seats) out[s.seat] = shown >= steps.length ? s.stance_end : s.stance_start;
  if (shown < steps.length) for (const st of steps.slice(0, shown)) out[st.seat] = st.stance_after;
  return out;
}

/** The stance a seat held just before line `i` was spoken. */
export function stanceBefore(c: CommitteeResult, steps: Step[], i: number): Stance {
  const seat = steps[i].seat;
  for (let k = i - 1; k >= 0; k--) if (steps[k].seat === seat) return steps[k].stance_after;
  return c.seats.find((s) => s.seat === seat)?.stance_start ?? 0;
}

// ─── What-ifs ───

export interface WhatIf {
  id: string;
  /** Sent to the endpoint as written; phrased as a hypothetical, never as a fact. */
  label: string;
}

/** "Databricks (Lakehouse, Delta Lake)" -> "Databricks"; a list of options -> "". */
function oneTool(tool: string | undefined): string {
  const t = (tool ?? "").replace(/\s*\([^)]*\)/g, "").trim();
  return !t || /[/,]|\bor\b/i.test(t) ? "" : t;
}

/**
 * Three hypotheticals the brief supports, each built only from what the
 * brief already says: a renewal date for a Confirmed BI tool (or confirming an
 * Inferred one), a new data leader, and a date for the embedded side (or the
 * warehouse move the stack lines show). Never anything about the seller's
 * customer list.
 */
export function whatIfOptions(brief: AccountBrief | null | undefined): WhatIf[] {
  const lines = Array.isArray(brief?.core_features) ? brief!.core_features : [];
  const out: WhatIf[] = [];

  const bi = lines.filter((l) => /\bBI\b/i.test(l.name ?? ""));
  const confirmed = bi.map((l) => (l.status === "Confirmed" ? oneTool(l.tool) : "")).find(Boolean);
  const inferred = bi.map((l) => (l.status === "Inferred" ? oneTool(l.tool) : "")).find(Boolean);
  if (confirmed) out.push({ id: "renewal", label: `They confirm a ${confirmed} renewal date` });
  else if (inferred) out.push({ id: "bi", label: `They confirm ${inferred} as their BI tool` });
  else out.push({ id: "bi", label: "They name the BI tool they use today" });

  out.push({ id: "leader", label: "A new data leader joins" });

  const motion = brief?.motion?.label ?? brief?.fit?.motion;
  const warehouses = lines.filter((l) => /warehouse/i.test(l.name ?? ""));
  const movedTo = warehouses.some((l) => l.status === "Former") ? warehouses.map((l) => (l.status === "Confirmed" ? oneTool(l.tool) : "")).find(Boolean) : "";
  if (motion === "Embedded" || motion === "Both") out.push({ id: "embedded", label: "Their next customer-facing analytics release gets a date" });
  else if (movedTo) out.push({ id: "migration", label: `Their move to ${movedTo} gets a finish date` });
  else out.push({ id: "budget", label: "A budget owner for BI is named" });

  return out;
}

// ─── Critics ───

/** The five critics' saved takes, by seat. */
export function criticsBySeat(analysis: AccountAnalysis | null | undefined): Partial<Record<SeatId, CriticResult>> {
  const out: Partial<Record<SeatId, CriticResult>> = {};
  for (const p of Array.isArray(analysis?.perspectives) ? analysis!.perspectives : []) if (isSeat(p?.persona) && !out[p.persona]) out[p.persona] = p;
  return out;
}

/** "Relay’s", "Siemens’". */
export const possessive = (name: string) => (/s$/i.test(name) ? `${name}’` : `${name}’s`);
