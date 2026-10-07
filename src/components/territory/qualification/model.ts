// Qualification as a seller would write it in a deal review: MEDDPICC rows
// and the three whys, read from what a run already holds (the brief, the
// seven agents and, when it has run, the simulated committee). No new model
// calls. Public sources rarely show a buyer's metrics, budget owner or
// process, so most rows start as gaps; a gap is the point, never a guess.
import type { AccountBrief } from "@/components/account/AccountViews";
import { stripMarks, whyNowItems, type AccountAnalysis } from "@/components/account/explorer/model";
import { criticFor } from "@/lib/lenses";
import { stanceWord, type CommitteeResult, type SeatId } from "../committee/model";

export type QualStatus = "Confirmed" | "Inferred" | "Gap";

export type QualId = "metrics" | "economic_buyer" | "decision_criteria" | "decision_process" | "paper_process" | "pain" | "champion" | "competition";

export interface QualRow {
  id: QualId;
  letter: string;
  name: string;
  status: QualStatus;
  /** What the run shows; may cite [n]. */
  evidence: string;
  /** The evidence comes from the simulated committee, not a source. */
  simulated?: boolean;
  /** The question to ask, or the step to take, that would close the row. */
  next: string;
}

export interface Qualification {
  rows: QualRow[];
  /** Confirmed or Inferred. */
  known: number;
  gaps: number;
  /** The gap the committee's main blocker sits on, else the first gap. */
  biggest?: QualRow;
  /** A simulated meeting fed the rows. */
  fromMeeting: boolean;
}

const LETTERS: { id: QualId; letter: string; name: string }[] = [
  { id: "metrics", letter: "M", name: "Metrics" },
  { id: "economic_buyer", letter: "E", name: "Economic buyer" },
  { id: "decision_criteria", letter: "D", name: "Decision criteria" },
  { id: "decision_process", letter: "D", name: "Decision process" },
  { id: "paper_process", letter: "P", name: "Paper process" },
  { id: "pain", letter: "I", name: "Identify pain" },
  { id: "champion", letter: "C", name: "Champion" },
  { id: "competition", letter: "C", name: "Competition" },
];

/** The row a blocking seat's doubt sits on. */
const BLOCKER_ROW: Record<SeatId, QualId> = {
  skeptic: "economic_buyer",
  builder: "decision_criteria",
  competitor: "competition",
  customer: "pain",
  champion: "champion",
};

/** How a seat ends the meeting, mid-sentence. */
const ENDS: Record<number, string> = { [-2]: "blocking", [-1]: "leaning no", 0: "neutral", 1: "leaning yes", 2: "as a sponsor" };

const text = (v: unknown) => (typeof v === "string" ? stripMarks(v).trim() : "");

/** A committee line cut short ("…[2] [3]…"): end it on its last whole clause. */
export function tidy(t: string): string {
  const s = t.trim();
  if (!/…$|\.\.\.$/.test(s)) return s;
  const body = s.replace(/(…|\.\.\.)$/, "").trim();
  const cite = /^(.*\])[^\]]*$/.exec(body);
  if (cite && cite[1].length > body.length * 0.6) return cite[1];
  const clause = body.lastIndexOf(",");
  if (clause > body.length * 0.6) return body.slice(0, clause);
  return `${body}…`;
}

/** "Director, Customer Success Enablement (or equivalent…)" -> "Director, Customer Success Enablement". */
const roleName = (r: string | undefined) => text(r).replace(/\s*\([^)]*\)/g, "").replace(/[.\s]+$/, "");

/** "Metabase [1]", "Looker (Inferred)": the BI and embedded tools the stack shows, Confirmed first. */
function incumbents(brief: AccountBrief): { tools: string[]; status: QualStatus } {
  const lines = (Array.isArray(brief.core_features) ? brief.core_features : []).filter(
    (l) => /\bBI\b|embedded/i.test(l.name ?? "") && text(l.tool) && !/^omni\b/i.test(text(l.tool)) && (l.status === "Confirmed" || l.status === "Inferred"),
  );
  const firm = lines.filter((l) => l.status === "Confirmed");
  const pick = (firm.length ? firm : lines).slice(0, 2);
  const cite = (s?: number[]) => (Array.isArray(s) && s.length ? ` [${s.slice(0, 2).join("] [")}]` : "");
  return {
    tools: pick.map((l) => `${text(l.tool)}${cite(l.sources)}`),
    status: firm.length ? "Confirmed" : lines.length ? "Inferred" : "Gap",
  };
}

/** The first tool's bare name: "Metabase". */
const bare = (tool?: string) => (tool ?? "").replace(/\s*\[[\d\]\s[]+$/, "").replace(/\s*\(.*$/, "").trim();

/**
 * The eight MEDDPICC rows for one run. Confirmed and Inferred come from the
 * brief's sources; the committee (synthetic) only ever adds a hint or a next
 * step, never turns a gap into a known.
 */
export function qualify(brief: AccountBrief | null | undefined, analysis?: AccountAnalysis | null, meeting?: CommitteeResult | null): Qualification {
  const b: AccountBrief = brief ?? {};
  const company = text(b.company) || "the account";
  const seats = meeting?.seats ?? [];
  const role = (seat: SeatId) => mid(seats.find((s) => s.seat === seat)?.role || criticFor("account", seat)?.name || seat);
  const step = (seat: SeatId) => text(meeting?.path_to_yes.find((p) => p.seat === seat)?.step);
  const critic = (seat: SeatId) => (Array.isArray(analysis?.perspectives) ? analysis!.perspectives : []).find((p) => p?.persona === seat);
  const { tools, status: compStatus } = incumbents(b);
  const incumbent = bare(tools[0]);
  const embedded = b.fit?.motion === "Embedded" || (b.motion?.label === "Embedded" && b.fit?.motion !== "Internal");
  const area = embedded ? "the customer-facing analytics" : "analytics tooling";

  const rows: Record<QualId, Omit<QualRow, "id" | "letter" | "name">> = {} as never;

  // M: the number that proves the problem. Never in public sources.
  const flip = text(meeting?.main_blocker.what_would_flip_it);
  rows.metrics = {
    status: "Gap",
    evidence: "No evidence yet. Public sources don't show what they measure here.",
    next: flip ? `Find the proof the ${role(meeting!.main_blocker.seat)} needs: ${flip}` : "Ask what number would show this is costing them, and what it is today.",
  };

  // E: who signs. The meeting can say whose voice weighs most, not who it is.
  const heaviest = [...seats].sort((x, y) => y.influence - x.influence || x.stance_end - y.stance_end)[0];
  rows.economic_buyer = {
    status: "Gap",
    evidence: heaviest ? `Not named. In the meeting, the ${mid(heaviest.role)} carries the most weight and ends ${ENDS[heaviest.stance_end]}.` : "Not named in the sources.",
    simulated: !!heaviest,
    next: `Ask who signs off on a change to ${area}, and what they would need to see.`,
  };

  // D: what an evaluation must prove. The technical seat's doubt is the best hint.
  const builderConcern = tidy(text(seats.find((s) => s.seat === "builder")?.top_concern));
  rows.decision_criteria = {
    status: "Gap",
    evidence: builderConcern ? `Not stated. The ${role("builder")}'s bar: ${builderConcern}` : "Not stated in the sources.",
    simulated: !!builderConcern,
    next: step("builder") || `Ask what an evaluation would have to prove to choose a governed layer over ${incumbent || "what they use today"}.`,
  };

  // D: the order of yeses. The meeting's path is a guess at it.
  // The incumbent vendor's seat argues in the meeting but doesn't sign.
  const order = [...new Set((meeting?.path_to_yes ?? []).map((p) => p.seat))].filter((s) => s !== "competitor").map(role);
  rows.decision_process = {
    status: "Gap",
    evidence: order.length > 1 ? `Not known. The meeting's path to yes runs ${order.join(" → ")}.` : "Not known.",
    simulated: order.length > 1,
    next: `Ask how ${company} bought its last data tool: who was involved, and in what order.`,
  };

  // P: renewals, security review, procurement.
  const clock = text(b.motion?.internal?.clock);
  const absent = /^no\b/i.test(clock) ? clock.split(/;|\.\s/)[0].replace(/\s*\[[\d,\s]+\]/g, "").trim() : "";
  rows.paper_process = {
    status: "Gap",
    evidence: absent ? `${absent}.` : "No renewal or procurement date in the sources.",
    next: incumbent ? `Ask when ${incumbent} renews, and what security review and procurement take.` : "Ask what security review and procurement take, and how long the last one ran.",
  };

  // I: the pain, in the business user's words when the meeting has run.
  const userPain = tidy(text(seats.find((s) => s.seat === "customer")?.top_concern));
  const pain = userPain || text(critic("customer")?.headline) || text(analysis?.distillation?.thesis_statement);
  const graded = embedded ? "embedded" : "internal";
  const opener = text(b.motion?.[graded]?.question) || text(b.discovery_questions?.[0]);
  rows.pain = {
    status: pain ? "Inferred" : "Gap",
    evidence: pain ? (userPain ? `The ${role("customer")}: ${userPain}` : pain) : "No evidence yet.",
    simulated: !!userPain,
    next: opener ? `Ask: "${opener.replace(/^"|"$/g, "")}"` : "Ask what breaks today when two teams report the same number.",
  };

  // C: someone who sells for you. The meeting finds a candidate seat; the brief names where to start.
  const backer = [...seats].filter((s) => s.stance_end >= 1).sort((x, y) => y.stance_end - x.stance_end || y.influence - x.influence)[0];
  const start = roleName(b.start_with?.role);
  // A role, not a person: the views name roles and leave people to the sources.
  const lead = start;
  rows.champion = {
    status: backer || lead ? "Inferred" : "Gap",
    evidence: [backer ? `The ${mid(backer.role)} ${stanceWord(backer.stance_end).toLowerCase()} in the meeting.` : "", lead ? `Start with: ${lead}.` : ""].filter(Boolean).join(" ") || "No candidate yet.",
    simulated: !!backer,
    next: step("champion") || "Ask what they would need from you to make the case inside.",
  };

  // C: the incumbent the deal has to beat.
  rows.competition = {
    status: compStatus,
    evidence: tools.length
      ? `${tools.join(", ")}${compStatus === "Inferred" ? " (Inferred)" : ""} in the stack today.`
      : b.customer_list?.on_list
        ? `${text(b.customer_list.sentence) || "On the seller's public customer list."} No other BI tool named in the sources.`
        : "No BI or embedded analytics tool named in the sources.",
    next: step("competitor") || (incumbent ? `Ask what people like about ${incumbent} today, and where it falls short.` : "Ask what they use for dashboards today, and who chose it."),
  };

  const list: QualRow[] = LETTERS.map((l) => ({ ...l, ...rows[l.id] }));
  const gaps = list.filter((r) => r.status === "Gap");
  const blockerRow = meeting ? list.find((r) => r.id === BLOCKER_ROW[meeting.main_blocker.seat] && r.status === "Gap") : undefined;
  return { rows: list, known: list.length - gaps.length, gaps: gaps.length, biggest: blockerRow ?? gaps[0], fromMeeting: !!meeting };
}

/** A seat named mid-sentence: "the business user", but "the Head of Data" and "the CFO". */
const mid = (r: string) => (/^(Business|Analytics|Incumbent|Data|Product)\b/.test(r) ? r[0].toLowerCase() + r.slice(1) : r);


// ─── The three whys ───

export interface ThreeWhys {
  /** The pain, as a hypothesis. */
  change?: string;
  /** The freshest dated trigger. */
  now?: { date: string; text: string };
  /** Why this seller beats the status quo, as a hypothesis. */
  omni?: string;
}

/**
 * Why change (the business user's pain), why now (the freshest dated
 * trigger), why the seller (the Distill agent's thesis). Change and the
 * seller's why wait for the agents; why now is in the brief.
 */
export function threeWhys(brief: AccountBrief | null | undefined, analysis?: AccountAnalysis | null, meeting?: CommitteeResult | null): ThreeWhys {
  const b: AccountBrief = brief ?? {};
  const userPain = tidy(text(meeting?.seats.find((s) => s.seat === "customer")?.top_concern));
  const critic = (Array.isArray(analysis?.perspectives) ? analysis!.perspectives : []).find((p) => p?.persona === "customer");
  const dated = whyNowItems(b.revenue_model).find((w) => w.date);
  const thesis = text(analysis?.distillation?.thesis_statement) || text(analysis?.expansion?.core_insight);
  return {
    change: userPain || text(critic?.headline) || undefined,
    now: dated ? { date: dated.date, text: dated.text } : undefined,
    omni: thesis || undefined,
  };
}
