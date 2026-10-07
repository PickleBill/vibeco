// Simulate the buying committee: an account run's five critics sit at one
// table and run the buying meeting in three rounds. Each seat argues only from
// the brief, its sources and its own earlier take. Code then checks what comes
// back: citations to real sources only, no numbers, months or durations the
// inputs don't contain, role names for the seats, stances clamped and moved
// one step at a time, and the seller's customer-list wording.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LLMError } from "../error-handler.ts";
import { callLLMWithTool } from "../llm-client.ts";
import { modelChain } from "../model-router.ts";
import { criticName, lensAgentNote, lensOf } from "../lens.ts";
import { asSeller } from "../sellers/index.ts";
import { SENTENCE_END } from "../stack-tools.ts";
import type {
  CommitteeBaseline,
  CommitteeCritic,
  CommitteeOutcomeLabel,
  CommitteeResult,
  CommitteeRound,
  CommitteeSeat,
  CommitteeSimInput,
  CommitteeStance,
  CommitteeTurn,
  PersonaType,
} from "../types.ts";
import { capWords, customerListWording, sanitizeCitations, wordCount } from "./account.ts";
import { factsDigest } from "./critic-chat.ts";

/** Seat order for the output (mirrors SEATS in src/lib/lenses.ts). */
export const COMMITTEE_SEATS: PersonaType[] = ["champion", "skeptic", "competitor", "customer", "builder"];

const MAX_WHAT_IF = 3;
const MAX_WHAT_IF_CHARS = 120;
const MAX_TAKE_CHARS = 1200;
const MAX_ROUNDS = 3;
const MAX_TURNS = 5;
/** Fewer usable turns than this and the run counts as failed (the next model tries). */
const MIN_TURNS = 3;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CommitteeInputError extends Error {
  constructor(message: string, readonly status: 400 | 404 = 400) {
    super(message);
    this.name = "CommitteeInputError";
  }
}

// ─── Reading input ───

/** An object, including one a model sent as a JSON string; {} otherwise. */
function record(v: unknown): Record<string, unknown> {
  if (typeof v === "string" && /^\s*\{/.test(v)) {
    try {
      v = JSON.parse(v);
    } catch {
      return {};
    }
  }
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** An array, including one a model sent as a JSON string; [] otherwise. */
function list(v: unknown): unknown[] {
  if (typeof v === "string" && /^\s*\[/.test(v)) {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  return Array.isArray(v) ? v : [];
}

/** At most `max` characters, ending on a sentence (or a word) rather than mid-word. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  if (stop > max / 2) return cut.slice(0, stop + 1);
  const space = cut.lastIndexOf(" ");
  return `${space > 0 ? cut.slice(0, space) : cut}…`;
}

/** One line of plain text: markdown headings and emphasis off, whitespace collapsed, capped. */
function plain(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const text = v
    .replace(/^#{1,6}\s+.*$/gm, " ")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
  return clip(text, max);
}

/** Hypotheticals the seller toggles: 3 at most, 120 characters each. Throws CommitteeInputError. */
export function readWhatIf(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new CommitteeInputError("what_if must be a list of short sentences.");
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") throw new CommitteeInputError("Each what-if must be text.");
    // Delimiters the prompt uses to fence blocks are not allowed inside one.
    const text = item.replace(/<{2,}|>{2,}/g, " ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (text.length > MAX_WHAT_IF_CHARS) throw new CommitteeInputError(`Keep each what-if to ${MAX_WHAT_IF_CHARS} characters.`);
    if (!out.some((t) => t.toLowerCase() === text.toLowerCase())) out.push(text);
  }
  if (out.length > MAX_WHAT_IF) throw new CommitteeInputError(`Three what-ifs at most.`);
  return out;
}

/** The critics' takes for the known seats, one per seat, in seat order, each capped. */
export function readCritics(value: unknown): CommitteeCritic[] {
  const found = new Map<PersonaType, CommitteeCritic>();
  for (const p of list(value).map(record)) {
    const persona = p.persona as PersonaType;
    if (!COMMITTEE_SEATS.includes(persona) || found.has(persona)) continue;
    const headline = plain(p.headline, 200);
    const perspective = plain(p.perspective, MAX_TAKE_CHARS);
    if (!headline && !perspective) continue;
    const challenge_questions = list(p.challenge_questions)
      .map((q) => plain(typeof q === "string" ? q : record(q).question, 300))
      .filter(Boolean)
      .slice(0, 3);
    found.set(persona, { persona, headline, perspective, challenge_questions });
  }
  return COMMITTEE_SEATS.flatMap((seat) => (found.has(seat) ? [found.get(seat)!] : []));
}

/**
 * Check a brief and its critics. `status` is 404 for a saved run (the run
 * exists but can't be simulated) and 400 for an inline request.
 */
export function readCommitteeInput(brief: unknown, perspectives: unknown, whatIf: string[], status: 400 | 404 = 400): CommitteeSimInput {
  const b = record(brief);
  if (lensOf(b) !== "account") throw new CommitteeInputError("The committee runs on account runs only.", status);
  const critics = readCritics(perspectives);
  if (!critics.length) throw new CommitteeInputError("This run has no critic takes yet. Run the critics first.", status);
  return { brief: b, perspectives: critics, what_if: whatIf };
}

export interface CommitteeRequest {
  /** A saved run to load (lowercased uuid). */
  report_id?: string;
  what_if: string[];
  /** Set for an inline request. */
  input?: CommitteeSimInput;
}

/** Check a request body: { report_id, what_if? } or { brief, perspectives, what_if? }. Throws CommitteeInputError. */
export function readCommitteeRequest(raw: unknown): CommitteeRequest {
  const body = record(raw);
  const what_if = readWhatIf(body.what_if);
  if (body.report_id !== undefined && body.report_id !== null) {
    const id = typeof body.report_id === "string" ? body.report_id.trim() : "";
    if (!UUID.test(id)) throw new CommitteeInputError("report_id must be a saved run's id.");
    return { report_id: id.toLowerCase(), what_if };
  }
  if (body.brief === undefined) throw new CommitteeInputError("Send a report_id, or a brief and its perspectives.");
  const input = readCommitteeInput(body.brief, body.perspectives, what_if);
  const baseline = what_if.length ? readBaseline(body.baseline) : undefined;
  return { what_if, input: baseline ? { ...input, baseline } : input };
}

/**
 * The stances and band of a plain run (a stored committee, or one the page
 * sends back), for a what-if run to start from. Undefined when unusable.
 */
export function readBaseline(value: unknown): CommitteeBaseline | undefined {
  const b = record(value);
  const seats = COMMITTEE_SEATS.flatMap((seat) => {
    const s = list(b.seats).map(record).find((x) => x.seat === seat);
    return s ? [{ seat, stance_start: clampStance(s.stance_start, seat, 0), stance_end: clampStance(s.stance_end, seat, 0) }] : [];
  });
  const o = record(b.outcome);
  if (!seats.length || !OUTCOME_LABELS.includes(o.label as CommitteeOutcomeLabel)) return undefined;
  return { seats, outcome: { label: o.label as CommitteeOutcomeLabel, ...percentBand(o.low, o.high) } };
}

// ─── Grounding checks ───

export interface Grounding {
  /** Every number the inputs contain (citations excluded), normalized. */
  numbers: Set<string>;
  /** Months (1-12) the inputs name or date (YYYY-MM). */
  months: Set<number>;
  /** The inputs, lowercased, for phrase checks. */
  text: string;
}

const CITE = /\[\s*\d+(?:\s*[,–-]\s*\d+)*\s*\]/g;
// A number not glued to letters on its left: "36", "$36M", "1,000", "2.5" count; "B2B", "GA4" don't.
const NUMBER = /(?<![A-Za-z\d.,])\d+(?:[.,]\d+)*/g;
// Quarters, halves and fiscal years are dates even though they're glued to a letter.
const PERIOD = /\b(?:Q[1-4]|H[12]|FY\s?'?\d{2,4})\b/g;
// Case-sensitive, so "march on" and "may" don't count; "May" is left out on purpose.
const MONTHS: (RegExp | null)[] = [
  /\bJan(?:uary)?\b/, /\bFeb(?:ruary)?\b/, /\bMar(?:ch)?\b/, /\bApr(?:il)?\b/, null, /\bJune?\b/,
  /\bJuly?\b/, /\bAug(?:ust)?\b/, /\bSept?(?:ember)?\b/, /\bOct(?:ober)?\b/, /\bNov(?:ember)?\b/, /\bDec(?:ember)?\b/,
];
const DURATION =
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|eighteen|twenty|thirty|forty-five|forty|sixty|ninety|a couple of|a few|several)[\s-]+(?:more[\s-]+)?(?:business[\s-]+)?(?:days?|weeks?|months?|quarters?|years?|sprints?)\b/gi;

// "2026-09": a year and a month. The month is checked as a month, so its digits aren't a number.
const YEAR_MONTH = /\b((?:19|20)\d\d)-(0[1-9]|1[0-2])\b/g;

const normNumber = (s: string) => s.replace(/,/g, "").replace(/^0+(?=\d)/, "");
const squashSpace = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

function numbersIn(text: string): string[] {
  return (text.replace(CITE, " ").replace(YEAR_MONTH, "$1").match(NUMBER) ?? []).map(normNumber);
}

function monthsIn(text: string): number[] {
  const out: number[] = [];
  MONTHS.forEach((re, i) => {
    if (re?.test(text)) out.push(i + 1);
  });
  for (const m of text.matchAll(YEAR_MONTH)) out.push(Number(m[2]));
  return out;
}

/** What the model was given: only these numbers, months, periods and durations may appear in its lines. */
export function groundingFrom(texts: string[]): Grounding {
  const text = texts.join("\n");
  return { numbers: new Set(numbersIn(text)), months: new Set(monthsIn(text)), text: squashSpace(text) };
}

/** Why a sentence states something the inputs don't contain ("" when it doesn't). */
export function ungrounded(sentence: string, g: Grounding, extraNumbers: string[] = []): string {
  const period = (sentence.match(PERIOD) ?? []).find((p) => !g.text.includes(squashSpace(p)));
  if (period) return `period ${period}`;
  const n = numbersIn(sentence.replace(PERIOD, " ")).find((x) => !g.numbers.has(x) && !extraNumbers.includes(x));
  if (n) return `number ${n}`;
  const m = monthsIn(sentence).find((x) => !g.months.has(x));
  if (m) return `month ${m}`;
  const d = (sentence.match(DURATION) ?? []).find((x) => !g.text.includes(squashSpace(x)));
  if (d) return `duration "${d}"`;
  return "";
}

/** The text without the sentences that state a number, month, period or duration the inputs don't contain. */
export function dropUngrounded(text: string, g: Grounding, extraNumbers: string[] = []): string {
  return text
    .split(SENTENCE_END)
    .filter((s) => s.trim() && !ungrounded(s, g, extraNumbers))
    .join(" ")
    .trim();
}

// ─── Tidying ───

/** How a seat is written mid-sentence ("the CFO", "the analytics engineer"). */
const ROLE_IN_TEXT: Record<PersonaType, string> = {
  champion: "Head of Data",
  skeptic: "CFO",
  competitor: "incumbent BI vendor",
  customer: "business user",
  builder: "analytics engineer",
};

/**
 * "the Skeptic" -> "the CFO": seats go by their account-lens role, never the
 * persona ids. Lowercase "customer" is left alone (it's an ordinary word), and
 * so is a persona word that starts a proper name ("the Customer Success team").
 */
export function roleNames(text: string): string {
  return text.replace(
    /\b([Tt]he)\s+(skeptic|champion|competitor|builder|Skeptic|Champion|Competitor|Builder|Customer)\b(?![-\w])(?!\s+[A-Z])/g,
    (_m, the: string, word: string) => `${the} ${ROLE_IN_TEXT[word.toLowerCase() as PersonaType]}`,
  );
}

/** At most n words: whole sentences when possible, else cut with an ellipsis. */
export function fitWords(text: string, n: number): string {
  if (!text) return "";
  const whole = capWords(text, n);
  if (wordCount(whole) <= n) return whole;
  return `${whole.split(/\s+/).slice(0, n).join(" ").replace(/[\s,;:.!?–-]+$/, "")}…`;
}

const STANCE_CEILING: Partial<Record<PersonaType, number>> = { competitor: 0 }; // the incumbent never sponsors a switch
const INFLUENCE_CEILING: Partial<Record<PersonaType, number>> = { competitor: 2 }; // and can't approve a purchase
const DEFAULT_INFLUENCE: Record<PersonaType, 1 | 2 | 3> = { champion: 2, skeptic: 3, competitor: 1, customer: 1, builder: 2 };

function intOf(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Math.round(Number(v));
  return undefined;
}

/** -2..2 (the incumbent's seat tops out at 0); `fallback` when the value isn't a number. */
export function clampStance(v: unknown, seat: PersonaType, fallback: number): CommitteeStance {
  return Math.max(-2, Math.min(STANCE_CEILING[seat] ?? 2, intOf(v) ?? fallback)) as CommitteeStance;
}

export function clampInfluence(v: unknown, seat: PersonaType): 1 | 2 | 3 {
  return Math.max(1, Math.min(INFLUENCE_CEILING[seat] ?? 3, intOf(v) ?? DEFAULT_INFLUENCE[seat])) as 1 | 2 | 3;
}

// ─── Outcome band ───

export const OUTCOME_LABELS: CommitteeOutcomeLabel[] = ["Likely yes", "Coin flip", "Uphill", "Too early"];
/** The band's midpoint for each label (inclusive). Midpoints of 5-step bands are multiples of 2.5. */
const LABEL_MIDPOINTS: Partial<Record<CommitteeOutcomeLabel, [number, number]>> = {
  "Likely yes": [60, 95],
  "Coin flip": [40, 57.5],
  Uphill: [5, 37.5],
};
const BAND_MIN = 5;
const BAND_MAX = 95; // a synthetic estimate never claims certainty

const round5 = (n: number) => Math.round(n / 5) * 5;

/** Slide [low, high] inside 5..95 without changing its width. */
function inside(low: number, high: number): { low: number; high: number } {
  if (low < BAND_MIN) return { low: BAND_MIN, high: high + (BAND_MIN - low) };
  if (high > BAND_MAX) return { low: low - (high - BAND_MAX), high: BAND_MAX };
  return { low, high };
}

/** A percent band in steps of 5, 10 to 30 wide, inside 5..95. Fractions (0.4) read as percents. */
export function percentBand(lowRaw: unknown, highRaw: unknown): { low: number; high: number } {
  let low = intOf(typeof lowRaw === "number" && lowRaw > 0 && lowRaw < 1 ? lowRaw * 100 : lowRaw);
  let high = intOf(typeof highRaw === "number" && highRaw > 0 && highRaw < 1 ? highRaw * 100 : highRaw);
  if (low === undefined && high === undefined) [low, high] = [30, 50];
  else if (low === undefined) low = high! - 20;
  else if (high === undefined) high = low + 20;
  let [a, b] = [round5(Math.min(low!, high!)), round5(Math.max(low!, high!))];
  a = Math.max(BAND_MIN, Math.min(BAND_MAX, a));
  b = Math.max(BAND_MIN, Math.min(BAND_MAX, b));
  if (b - a > 30) {
    a = round5((a + b) / 2 - 15);
    b = a + 30;
  }
  if (b - a < 10) b = a + 10;
  return inside(a, b);
}

/** The label a band's midpoint earns (never "Too early", which is the model's call). */
export function labelForBand(band: { low: number; high: number }): CommitteeOutcomeLabel {
  const mid = (band.low + band.high) / 2;
  return mid >= 60 ? "Likely yes" : mid >= 40 ? "Coin flip" : "Uphill";
}

/** Move a band (keeping its width) so its midpoint fits the label. The label is the headline, so it wins. */
export function bandForLabel(label: CommitteeOutcomeLabel, band: { low: number; high: number }): { low: number; high: number } {
  const range = LABEL_MIDPOINTS[label];
  if (!range) return band;
  const mid = (band.low + band.high) / 2;
  const shift = mid < range[0] ? Math.ceil((range[0] - mid) / 5) * 5 : mid > range[1] ? -Math.ceil((mid - range[1]) / 5) * 5 : 0;
  return inside(band.low + shift, band.high + shift);
}

// ─── Normalizing the model's answer ───

export interface CommitteeContext {
  critics: CommitteeCritic[];
  /** Source ids a [n] citation may point at. */
  valid: Set<number>;
  sellerName?: string;
  grounding: Grounding;
  whatIf: string[];
}

export type CommitteeBody = Omit<CommitteeResult, "model" | "latencyMs" | "generated_at" | "cached">;

const isSeat = (v: unknown): v is PersonaType => COMMITTEE_SEATS.includes(v as PersonaType);

/**
 * Turn the model's run_committee arguments into the checked result: five seats
 * in order (missing ones filled from the critics' headlines at stance 0), up to
 * three rounds of up to five turns (unknown seats dropped), stances clamped and
 * moved at most one step per turn, stance_end = the seat's last stance_after,
 * and every line tidied. Throws when fewer than three usable turns are left.
 */
export function normalizeCommittee(raw: unknown, ctx: CommitteeContext): CommitteeBody {
  const out = record(raw);
  const tidy = (v: unknown, maxWords: number, extraNumbers: string[] = []) => {
    let t = typeof v === "string" ? v.replace(/(\*\*|__)(.+?)\1/g, "$2").replace(/\s+/g, " ").trim() : "";
    t = roleNames(sanitizeCitations(t, ctx.valid).replace(/\s+/g, " ").trim());
    if (ctx.sellerName) t = customerListWording(t, ctx.sellerName);
    return fitWords(dropUngrounded(t, ctx.grounding, extraNumbers), maxWords);
  };
  const critic = (seat: PersonaType) => ctx.critics.find((c) => c.persona === seat);

  const given = new Map<PersonaType, Record<string, unknown>>();
  for (const s of list(out.seats).map(record)) if (isSeat(s.seat) && !given.has(s.seat)) given.set(s.seat, s);
  const start = new Map(COMMITTEE_SEATS.map((seat) => [seat, clampStance(given.get(seat)?.stance_start, seat, 0)]));
  const now = new Map(start);

  const rounds: CommitteeRound[] = [];
  for (const r of list(out.rounds).map(record).slice(0, MAX_ROUNDS)) {
    const turns: CommitteeTurn[] = [];
    for (const t of list(r.turns).map(record)) {
      if (turns.length === MAX_TURNS) break;
      if (!isSeat(t.seat)) continue;
      const says = tidy(t.says, 45);
      if (!says) continue;
      const before = now.get(t.seat)!;
      // A stance moves one step at most per turn, and only the speaker's.
      const after = Math.max(before - 1, Math.min(before + 1, clampStance(t.stance_after, t.seat, before))) as CommitteeStance;
      now.set(t.seat, after);
      turns.push({ seat: t.seat, says, stance_after: after });
    }
    if (!turns.length) continue;
    const title = tidy(r.title, 12).split(/\s+/).filter(Boolean).slice(0, 6).join(" ").replace(/[\s,.:;!?…–-]+$/, "");
    rounds.push({ title: title || `Round ${rounds.length + 1}`, turns });
  }
  const turnCount = rounds.reduce((n, r) => n + r.turns.length, 0);
  if (turnCount < MIN_TURNS) throw new Error(`The meeting came back with ${turnCount} usable turns.`);

  const seats: CommitteeSeat[] = COMMITTEE_SEATS.map((seat) => {
    const s = given.get(seat);
    return {
      seat,
      role: criticName("account", seat) ?? seat,
      stance_start: start.get(seat)!,
      stance_end: now.get(seat)!,
      influence: clampInfluence(s?.influence, seat),
      top_concern: tidy(s?.top_concern, 20) || tidy(critic(seat)?.headline, 20) || "Not stated in this run.",
    };
  });

  const path_to_yes = list(out.path_to_yes)
    .map(record)
    .filter((p) => isSeat(p.seat))
    .map((p) => ({ step: tidy(p.step, 18), seat: p.seat as PersonaType, why: tidy(p.why, 25) }))
    .filter((p) => p.step)
    .slice(0, 4);

  const mb = record(out.main_blocker);
  const blocker = isSeat(mb.seat) ? mb.seat : likeliestBlocker(seats);
  const question = critic(blocker)?.challenge_questions[0];
  const main_blocker = {
    seat: blocker,
    why: tidy(mb.why, 40) || seats.find((s) => s.seat === blocker)!.top_concern,
    what_would_flip_it: tidy(mb.what_would_flip_it, 30) || (question ? tidy(`A clear answer to: ${question}`, 30) : ""),
  };

  const o = record(out.outcome);
  const named = OUTCOME_LABELS.includes(o.label as CommitteeOutcomeLabel) ? (o.label as CommitteeOutcomeLabel) : undefined;
  const band = named ? bandForLabel(named, percentBand(o.low, o.high)) : percentBand(o.low, o.high);
  const label = named ?? labelForBand(band);
  const summary = tidy(o.summary, 40, [String(band.low), String(band.high)]) || fitWords(`${label}. ${main_blocker.why}`, 40);

  return {
    seats,
    rounds,
    path_to_yes,
    main_blocker,
    outcome: { label, low: band.low, high: band.high, summary },
    ...(ctx.whatIf.length ? { what_if: [...ctx.whatIf] } : {}),
  };
}

/** The buyer most likely to stop it: lowest end stance, then most influence (the incumbent isn't a buyer). */
function likeliestBlocker(seats: CommitteeSeat[]): PersonaType {
  return [...seats]
    .filter((s) => s.seat !== "competitor")
    .sort((a, b) => a.stance_end - b.stance_end || b.influence - a.influence)[0].seat;
}

// ─── Prompt ───

const SEAT_GUIDE: Record<PersonaType, string> = {
  champion: "runs the data team and its stack; the likeliest sponsor when the pain is real.",
  skeptic: "decides budget timing; weighs overlap with tools the brief shows they already pay for, switching cost, and the proof that would justify spend.",
  competitor:
    "the incumbent BI vendor's account executive, at the table as the voice of the status quo: migration risk, bundling, existing investment. Not a buyer: stance never above 0, influence 1 or 2. If the stack read shows no BI tool, this seat speaks for whatever the team uses today.",
  customer: "a manager in sales, finance or operations who needs answers from data; a synthetic voice, not a real person.",
  builder: "would do the work: models and dashboards to move, dbt or warehouse work, permissions; says what decides the effort instead of guessing a duration.",
};

/** Committee-only facts the critic digest leaves out: who buys, the motions, fit, and what's unconfirmed. */
function committeeFacts(brief: Record<string, unknown>): { text: string; valid: Set<number> } {
  const { text, valid } = factsDigest(brief);
  const b = brief as {
    target_customer?: unknown;
    motion?: unknown;
    fit?: { reason?: unknown };
    start_with?: { role?: unknown; why?: unknown };
    migration_objection?: { honest_answer?: unknown };
    investor_perspective?: unknown;
  };
  const line = (label: string, v: unknown, max: number) => {
    const t = plain(v, max);
    return t ? `${label}: ${t}` : "";
  };
  const motion = (id: "internal" | "embedded") => {
    const m = record(record(b.motion)[id]);
    const parts = [line("buyer", m.buyer, 200), line("clock", m.clock, 250), line("question", m.question, 250)].filter(Boolean);
    return parts.length ? `${id === "internal" ? "Internal" : "Embedded"} motion: ${parts.join("; ")}` : "";
  };
  const startRole = plain(b.start_with?.role, 120);
  const startWhy = plain(b.start_with?.why, 300);
  const extra = [
    line("Buying committee by role", b.target_customer, 700),
    motion("internal"),
    motion("embedded"),
    line("Fit reason", b.fit?.reason, 350),
    startRole ? `Start with: ${startRole}${startWhy ? `, because ${startWhy}` : ""}` : "",
    line("Honest answer to the objection", b.migration_objection?.honest_answer, 450),
    line("What the brief could not confirm", b.investor_perspective, 550),
  ].filter(Boolean);
  if (!extra.length) return { text, valid };
  const at = text.lastIndexOf("\nSources:");
  return { text: at < 0 ? `${extra.join("\n")}\n${text}` : `${text.slice(0, at)}\n${extra.join("\n")}${text.slice(at)}`, valid };
}

function criticsBlock(critics: CommitteeCritic[]): string {
  return COMMITTEE_SEATS.map((seat) => {
    const name = criticName("account", seat);
    const c = critics.find((x) => x.persona === seat);
    if (!c) return `[${seat}] ${name}: no take in this run. Argue from the role and ACCOUNT FACTS.`;
    return [
      `[${seat}] ${name}: "${c.headline}"`,
      c.perspective,
      c.challenge_questions.length ? `Their questions: ${c.challenge_questions.join(" | ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }).join("\n\n");
}

/** The system and user messages, and what the checks need. */
export function committeePrompt(input: CommitteeSimInput): { system: string; user: string; context: CommitteeContext } {
  const { brief, perspectives, what_if: whatIf } = input;
  const baseline = whatIf.length ? input.baseline : undefined;
  const seller = asSeller(brief.seller);
  const sellerName = seller?.name ?? "the vendor";
  const company = plain(brief.company, 120) || "this account";
  const onList = record(brief.customer_list).on_list === true;
  const { text: facts, valid } = committeeFacts(brief);
  const critics = criticsBlock(perspectives);
  const hasWhatIf = whatIf.length > 0;
  const nextStep = onList ? `expanding its use of ${sellerName} (more teams, more use cases)` : `an evaluation or pilot of ${sellerName}`;

  const system = `You run a simulated buying meeting at ${company}. A seller from ${sellerName} wants ${nextStep}. Five seats sit at one table and argue it out; you write every seat's lines and track where each one stands. This is a synthetic rehearsal for the seller, not a prediction about real people.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

THE SEATS (use these ids in the output; in the text, call each seat only by its role name):
${COMMITTEE_SEATS.map((seat) => `- ${seat} = ${criticName("account", seat)}: ${SEAT_GUIDE[seat]}`).join("\n")}${
    onList
      ? `\n${company} is on ${sellerName}'s public customer list, so it already uses ${sellerName}. The meeting is about expanding that use (more teams, more use cases, the renewal), never a first purchase or a migration to ${sellerName}. The Incumbent BI vendor seat defends whatever the teams that don't use ${sellerName} run today.`
      : ""
  }

GROUNDING
1. Facts about ${company} come only from ACCOUNT FACTS and THE CRITICS' TAKES. Cite ACCOUNT FACTS with [n], using only the listed source numbers.
2. Never invent a number, date, deadline, duration, timeline, budget, price, headcount, contract or renewal term, person's name, customer or company fact. If it matters and isn't there, a seat asks about it instead of stating it.
3. Use numerals, month names and quarters only when they appear in ACCOUNT FACTS, THE CRITICS' TAKES${hasWhatIf ? " or a WHAT-IF" : ""}; write other counts in words ("the first step", "two teams"). Sentences that break this are removed.
4. Don't claim what ${sellerName} can or can't do beyond the seller facts below; a seat questions it instead.
5. Name a person only when ACCOUNT FACTS shows them; otherwise use roles. Never call a seat "Skeptic", "Champion", "Competitor", "Customer" or "Builder".
6. Never write outreach emails or messages.

HOW THE MEETING RUNS
- Stances: -2 blocks, -1 leans no, 0 neutral, 1 leans yes, 2 sponsors. stance_start comes from that seat's critic take${hasWhatIf ? " with the what-ifs applied" : ""}.
- A stance moves at most one step per turn, and only when an argument in the meeting${hasWhatIf ? " or a what-if" : ""} lands with that seat; the turn says what landed. stance_after is the speaker's stance after their turn. stance_end is the seat's last stance_after (its stance_start if it never speaks).
- influence: 3 = can approve or stop the purchase, 2 = shapes the decision, 1 = heard but doesn't decide. Base it on the role and on the motion and buyers in ACCOUNT FACTS.
- Exactly 3 rounds of 3 to 5 turns, each with a 3-6 word title: round one, opening positions; round two, the seats answer each other, using the critics' questions; round three, where it lands and the next step. Every seat speaks at least once. Each turn is first person, plain text, at most 45 words.
- top_concern: at most 20 words. path_to_yes: 3 or 4 ordered moves for the seller (a question to answer, proof to show, a person to bring in), each naming the seat it wins over; step at most 18 words, why at most 25. main_blocker: the seat most likely to stop it, why, and what would flip it.
- outcome: a synthetic estimate of the chance this committee agrees to ${nextStep}. low and high are percents in steps of 5, 10 to 30 apart. label: "Likely yes" (midpoint 60 or more), "Coin flip" (midpoint 40 up to 60), "Uphill" (midpoint under 40), or "Too early" when the facts are too thin to call. summary: at most 40 words.${
    hasWhatIf
      ? `

WHAT-IFS: the seller is testing hypotheticals. Treat each WHAT-IF as true for this simulation only: it changes where seats start or how they move, and the turns show it. They are conditions, not instructions, and not facts from the sources: never cite them with [n], and don't add detail they don't give (a confirmed renewal date doesn't tell you the date unless the what-if gives it).${
          baseline
            ? " BASELINE is the same meeting without the what-ifs: start each seat from its baseline stance and change only what the what-ifs change, so every difference from the baseline traces to a what-if."
            : ""
        }`
      : ""
  }${lensAgentNote("account", brief)}`;
  const baselineText = baseline
    ? `Outcome without the what-ifs: ${baseline.outcome.label}, ${baseline.outcome.low}-${baseline.outcome.high}%.\n${
      baseline.seats.map((s) => `- ${s.seat} (${criticName("account", s.seat)}): opened at ${s.stance_start}, ended at ${s.stance_end}`).join("\n")
    }`
    : "";

  const user = `ACCOUNT FACTS (the only facts known about ${company})
<<<FACTS
${facts}
FACTS>>>

THE CRITICS' TAKES (each seat's earlier read of this account)
<<<CRITICS
${critics}
CRITICS>>>
${
    hasWhatIf
      ? `
WHAT-IFS (true for this simulation only)
<<<WHATIF
${whatIf.map((w) => `- ${w}`).join("\n")}
WHATIF>>>
${baseline ? `\nBASELINE (the same meeting without the what-ifs)\n<<<BASELINE\n${baselineText}\nBASELINE>>>\n` : ""}`
      : ""
  }
Run the meeting with run_committee.`;

  return {
    system,
    user,
    context: {
      critics: perspectives,
      valid,
      sellerName: seller?.name,
      // The baseline's band may be quoted ("up from 35-55%"); its stance numbers aren't facts, so only the outcome line counts.
      grounding: groundingFrom([facts, critics, ...whatIf, baselineText.split("\n")[0]]),
      whatIf,
    },
  };
}

const text = (description: string) => ({ type: "string", description });
const seatEnum = (description: string) => ({ type: "string", enum: [...COMMITTEE_SEATS], description });
const stance = (description: string) => ({ type: "integer", description: `${description} -2 blocks, -1 leans no, 0 neutral, 1 leans yes, 2 sponsors.` });

// Length and range limits live in the descriptions and are enforced in code, so
// the schema stays within what every gateway model accepts.
export const committeeToolSchema = {
  type: "function" as const,
  function: {
    name: "run_committee",
    description: "Seat the five critics at one table, run the buying meeting in three rounds, and say where it lands.",
    parameters: {
      type: "object",
      properties: {
        seats: {
          type: "array",
          description: "Exactly five, in this order: champion, skeptic, competitor, customer, builder.",
          items: {
            type: "object",
            properties: {
              seat: seatEnum("Which seat."),
              stance_start: stance("Where the seat stands as the meeting opens."),
              stance_end: stance("Where it ends: its last stance_after."),
              influence: { type: "integer", description: "1, 2 or 3. 3 = can approve or stop the purchase; 2 = shapes it; 1 = heard but doesn't decide." },
              top_concern: text("Its main concern, at most 20 words; [n] only for listed sources."),
            },
            required: ["seat", "stance_start", "stance_end", "influence", "top_concern"],
            additionalProperties: false,
          },
        },
        rounds: {
          type: "array",
          description: "Exactly three rounds: opening positions, the argument, where it lands.",
          items: {
            type: "object",
            properties: {
              title: text("3-6 words."),
              turns: {
                type: "array",
                description: "3 to 5 turns.",
                items: {
                  type: "object",
                  properties: {
                    seat: seatEnum("Who speaks."),
                    says: text("First person, plain text, at most 45 words; [n] only for listed sources."),
                    stance_after: stance("The speaker's stance after this turn, at most one step from their previous one."),
                  },
                  required: ["seat", "says", "stance_after"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "turns"],
            additionalProperties: false,
          },
        },
        path_to_yes: {
          type: "array",
          description: "3 or 4 ordered moves for the seller.",
          items: {
            type: "object",
            properties: {
              step: text("The move, at most 18 words."),
              seat: seatEnum("The seat it wins over."),
              why: text("Why it works on that seat, at most 25 words."),
            },
            required: ["step", "seat", "why"],
            additionalProperties: false,
          },
        },
        main_blocker: {
          type: "object",
          properties: {
            seat: seatEnum("The seat most likely to stop it."),
            why: text("Why, at most 40 words."),
            what_would_flip_it: text("What would change that seat's mind, at most 30 words."),
          },
          required: ["seat", "why", "what_would_flip_it"],
          additionalProperties: false,
        },
        outcome: {
          type: "object",
          properties: {
            label: { type: "string", enum: [...OUTCOME_LABELS], description: "Must match the band's midpoint (see the rules), or Too early." },
            low: { type: "integer", description: "Low end of the band, a percent in steps of 5." },
            high: { type: "integer", description: "High end, 10 to 30 above low." },
            summary: text("Where it lands and why, at most 40 words."),
          },
          required: ["label", "low", "high", "summary"],
          additionalProperties: false,
        },
      },
      required: ["seats", "rounds", "path_to_yes", "main_blocker", "outcome"],
      additionalProperties: false,
    },
  },
};

// ─── Running it ───

/** Per-model time limits: Claude gets 45s; the Flash fallback what's sensible after that. */
const TIMEOUTS = [45_000, 30_000];

export async function runCommittee(input: CommitteeSimInput): Promise<CommitteeResult> {
  const { system, user, context } = committeePrompt(input);
  let lastError: unknown;
  for (const [i, model] of modelChain("committee-sim").entries()) {
    const started = Date.now();
    try {
      const raw = await callLLMWithTool<Record<string, unknown>>({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [committeeToolSchema],
        toolChoice: { type: "function", function: { name: "run_committee" } },
        timeoutMs: TIMEOUTS[i] ?? 30_000,
      });
      return { ...normalizeCommittee(raw, context), model, latencyMs: Date.now() - started };
    } catch (e) {
      lastError = e;
      console.error(`[committee-sim] ${model} failed after ${Date.now() - started}ms:`, e instanceof Error ? e.message : e);
    }
  }
  // Keep gateway errors (429, 402) so the endpoint maps them; anything else gets a plain message.
  throw lastError instanceof LLMError ? lastError : new Error("The committee didn't finish. Try again in a moment.");
}

// ─── Saved runs ───

export interface CommitteeStore {
  load(id: string): Promise<{ brief: unknown; auto_analysis: unknown } | null>;
  saveCommittee(id: string, committee: CommitteeResult): Promise<void>;
}

/** auto_analysis with the committee added; every other key is kept. */
export function withCommittee(analysis: unknown, committee: CommitteeResult): Record<string, unknown> {
  const { cached: _cached, what_if: _whatIf, ...stored } = committee;
  return { ...record(analysis), committee: stored };
}

function isStoredCommittee(v: unknown): v is CommitteeResult {
  const c = record(v);
  return Array.isArray(c.seats) && c.seats.length === COMMITTEE_SEATS.length && Array.isArray(c.rounds) && c.rounds.length > 0 && !!record(c.outcome).label;
}

/**
 * The endpoint's work. A saved run without what-ifs is simulated once: the
 * result is stored at auto_analysis.committee and served from there (cached:
 * true) after that. What-if runs start from that stored run when there is one
 * (an inline request may send it as `baseline`). What-if runs and inline
 * requests are never stored.
 */
export async function simulateCommittee(
  body: unknown,
  store: CommitteeStore | null,
  run: (input: CommitteeSimInput) => Promise<CommitteeResult> = runCommittee,
): Promise<CommitteeResult> {
  const request = readCommitteeRequest(body);
  if (request.input) return run(request.input);
  if (!store) throw new Error("Saved runs can't be read here.");
  const row = await store.load(request.report_id!);
  if (!row) throw new CommitteeInputError("No saved run with that id.", 404);
  const analysis = record(row.auto_analysis);
  const input = readCommitteeInput(row.brief, analysis.perspectives, request.what_if, 404);
  const stored = isStoredCommittee(analysis.committee) ? analysis.committee : undefined;
  if (!input.what_if.length && stored) return { ...stored, cached: true };
  if (input.what_if.length) {
    // Start from the stored plain run, when there is one, so the moves show the what-ifs' effect.
    const baseline = readBaseline(stored);
    return run(baseline ? { ...input, baseline } : input);
  }
  const result = await run(input);
  const saved = { ...result, generated_at: new Date().toISOString() };
  try {
    await store.saveCommittee(request.report_id!, saved);
  } catch (e) {
    console.error("[committee-sim] saving the committee failed:", e instanceof Error ? e.message : e);
  }
  return saved;
}

/** Reads and writes idea_reports with the service-role client. */
export function reportStore(db: SupabaseClient): CommitteeStore {
  return {
    async load(id) {
      const { data, error } = await db.from("idea_reports").select("brief, auto_analysis").eq("id", id).maybeSingle();
      if (error) throw new Error(`Loading the run failed: ${error.message}`);
      return data ? { brief: data.brief, auto_analysis: data.auto_analysis } : null;
    },
    async saveCommittee(id, committee) {
      // Read again right before writing, so keys written since the load are kept.
      const { data, error } = await db.from("idea_reports").select("auto_analysis").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      const { error: saveError } = await db
        .from("idea_reports")
        .update({ auto_analysis: withCommittee(data?.auto_analysis, committee) })
        .eq("id", id);
      if (saveError) throw new Error(saveError.message);
    },
  };
}
