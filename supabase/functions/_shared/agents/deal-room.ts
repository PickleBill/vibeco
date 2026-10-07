// Deal Room: the account's answers to a shared brief ("here's what we think we
// know about you, from public sources; correct us"). Each answer is stored on
// the run itself, under auto_analysis.deal_room, latest answer per claim. No
// model call. The claims are built on the page from the saved brief; ids look
// like "stack:bi-tools:metabase", "motion" and "why:2026-09:0".

export type DealAnswer = "right" | "fix" | "unsure";

export interface DealResponse {
  answer: DealAnswer;
  /** What the claim should say (fixes only). */
  text?: string;
  note?: string;
  /** When the answer was saved (ISO). */
  at: string;
}

export interface DealRoom {
  responses: Record<string, DealResponse>;
  updated_at: string;
}

export type DealRoomInput =
  | { kind: "read"; report_id: string }
  | { kind: "brief"; report_id: string }
  | { kind: "answer"; report_id: string; claim_id: string; answer: DealAnswer; text?: string; note?: string };

/** The saved run, as far as the Deal Room reads and writes it. */
export interface DealRoomRow {
  idea?: unknown;
  created_at?: unknown;
  brief: unknown;
  auto_analysis: unknown;
}

export interface DealRoomStore {
  load(reportId: string): Promise<DealRoomRow | null>;
  /** Replace the run's auto_analysis (the caller keeps every other key). */
  save(reportId: string, autoAnalysis: Record<string, unknown>): Promise<void>;
}

/** Bad input (400) or a run that isn't shared as a Deal Room (404). */
export class DealRoomInputError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "DealRoomInputError";
  }
}

export const MAX_TEXT = 400;
export const MAX_CLAIM_ID = 120;
/** More claims than any brief makes; stops a caller from filling a run with junk ids. */
export const MAX_CLAIMS = 60;

const ANSWERS: DealAnswer[] = ["right", "fix", "unsure"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLAIM_ID = /^(?:motion|(?:stack|why):[a-z0-9:-]+)$/;

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Trimmed, one line, control characters out, capped. */
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\p{Cc}+/gu, " ").replace(/\s+/g, " ").trim().slice(0, max).trim() : "";

/** Check and bound what the page sends. Throws DealRoomInputError on bad input. */
export function readDealRoomInput(raw: unknown): DealRoomInput {
  const body = isObject(raw) ? raw : {};
  const report_id = str(body.report_id, 40);
  if (!UUID.test(report_id)) throw new DealRoomInputError("Unknown brief.");
  if (body.read === true) return { kind: "read", report_id };
  if (body.brief === true) return { kind: "brief", report_id };

  const claim_id = typeof body.claim_id === "string" ? body.claim_id.trim() : "";
  if (!claim_id || claim_id.length > MAX_CLAIM_ID || !CLAIM_ID.test(claim_id)) throw new DealRoomInputError("Unknown claim.");
  const answer = body.answer as DealAnswer;
  if (!ANSWERS.includes(answer)) throw new DealRoomInputError("Answer right, fix or unsure.");
  const text = answer === "fix" ? str(body.text, MAX_TEXT) : "";
  if (answer === "fix" && !text) throw new DealRoomInputError("Say what it should say.");
  const note = str(body.note, MAX_TEXT);
  return { kind: "answer", report_id, claim_id, answer, ...(text ? { text } : {}), ...(note ? { note } : {}) };
}

/** A stored deal_room as the page may trust it: malformed entries dropped, strings re-capped. */
export function cleanDealRoom(raw: unknown): DealRoom | null {
  if (!isObject(raw) || !isObject(raw.responses)) return null;
  const responses: Record<string, DealResponse> = {};
  for (const [id, r] of Object.entries(raw.responses)) {
    if (!CLAIM_ID.test(id) || id.length > MAX_CLAIM_ID || !isObject(r) || !ANSWERS.includes(r.answer as DealAnswer)) continue;
    const text = str(r.text, MAX_TEXT);
    const note = str(r.note, MAX_TEXT);
    if (r.answer === "fix" && !text) continue;
    responses[id] = {
      answer: r.answer as DealAnswer,
      ...(r.answer === "fix" ? { text } : {}),
      ...(note ? { note } : {}),
      at: typeof r.at === "string" ? r.at : "",
    };
    if (Object.keys(responses).length >= MAX_CLAIMS) break;
  }
  return { responses, updated_at: typeof raw.updated_at === "string" ? raw.updated_at : "" };
}

/** One answer into the stored deal_room: the latest answer per claim wins. */
export function mergeAnswer(current: unknown, input: Extract<DealRoomInput, { kind: "answer" }>, now: string): DealRoom {
  const room = cleanDealRoom(current) ?? { responses: {}, updated_at: "" };
  if (!(input.claim_id in room.responses) && Object.keys(room.responses).length >= MAX_CLAIMS) {
    throw new DealRoomInputError("This brief has no room for more answers.");
  }
  const response: DealResponse = {
    answer: input.answer,
    ...(input.answer === "fix" && input.text ? { text: input.text } : {}),
    ...(input.note ? { note: input.note } : {}),
    at: now,
  };
  return { responses: { ...room.responses, [input.claim_id]: response }, updated_at: now };
}

/**
 * The part of a run the prospect's page needs to build its claims: sources
 * (off-topic ones out), stack lines, the motion and its sources, the dated
 * why-now lines, and the names of people (only so claims naming them are
 * skipped). Never the fit grade, critics, objections, the plan or questions.
 */
export function publicBrief(brief: Record<string, unknown>): Record<string, unknown> {
  const research = isObject(brief.research) ? brief.research : {};
  const sources = (Array.isArray(research.sources) ? research.sources : [])
    .filter((s): s is Record<string, unknown> => isObject(s) && !s.off_topic)
    .map(({ id, title, url, snippet, kind, date, via }) => ({ id, title, url, snippet, kind, date, via }));
  const lines = (Array.isArray(brief.core_features) ? brief.core_features : [])
    .filter(isObject)
    .map(({ name, tool, status, sources, evidence }) => ({ name, tool, status, sources, evidence, description: "" }));
  const motion = isObject(brief.motion) ? brief.motion : {};
  const side = (v: unknown) => ({ sources: isObject(v) && Array.isArray(v.sources) ? v.sources : [] });
  const people = (Array.isArray(brief.people) ? brief.people : []).filter(isObject).map((p) => ({ name: p.name, role: "", source: 0 }));
  return {
    lens: brief.lens,
    seller: brief.seller,
    company: brief.company,
    research: { sources },
    core_features: lines,
    motion: { label: motion.label, internal: side(motion.internal), embedded: side(motion.embedded) },
    revenue_model: brief.revenue_model,
    people,
  };
}

/** The prospect-safe part of a saved run, shaped like a shared report. Only account runs open as a Deal Room. */
export async function loadPublicReport(reportId: string, store: DealRoomStore): Promise<{ report: Record<string, unknown> }> {
  const row = await store.load(reportId);
  const brief = isObject(row?.brief) ? row!.brief : null;
  if (!row || brief?.lens !== "account") throw new DealRoomInputError("This brief isn't available.", 404);
  return { report: { id: reportId, idea: row.idea, created_at: row.created_at, brief: publicBrief(brief), lovable_prompt: null, auto_analysis: null } };
}

/** Read or answer. Only account runs open as a Deal Room. */
export async function runDealRoom(
  input: Exclude<DealRoomInput, { kind: "brief" }>,
  store: DealRoomStore,
  now: Date = new Date(),
): Promise<{ ok?: true; deal_room: DealRoom | null }> {
  const row = await store.load(input.report_id);
  const brief = isObject(row?.brief) ? row!.brief : null;
  if (!row || brief?.lens !== "account") throw new DealRoomInputError("This brief isn't available.", 404);
  const analysis = isObject(row.auto_analysis) ? row.auto_analysis : {};
  if (input.kind === "read") return { deal_room: cleanDealRoom(analysis.deal_room) };

  const deal_room = mergeAnswer(analysis.deal_room, input, now.toISOString());
  await store.save(input.report_id, { ...analysis, deal_room });
  return { ok: true, deal_room };
}
