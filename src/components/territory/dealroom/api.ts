// The deal-room function (answers saved on the run) and this browser's copy of
// the prospect's own answers. When the function can't be reached, answers stay
// on the device and the page says so; nothing is retried in the background.
import { supabase } from "@/integrations/supabase/client";
import type { SavedReport } from "@/components/account/explorer/savedRuns";
import { readDealRoom, readResponses, type DealResponse, type DealRoomData, type Responses } from "./claims";

const FN = "deal-room";
const TIMEOUT_MS = 8_000;

async function call(body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const { data, error } = await supabase.functions.invoke(FN, { body, signal: ctrl.signal });
    if (error || !data || typeof data !== "object" || (data as { error?: unknown }).error) return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * The run as the prospect may see it (claims material only), from the function.
 * Undefined when the function can't be reached; null when the brief isn't available.
 */
export async function fetchPublicReport(reportId: string): Promise<SavedReport | null | undefined> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const { data, error } = await supabase.functions.invoke(FN, { body: { report_id: reportId, brief: true }, signal: ctrl.signal });
    const report = (data as { report?: SavedReport } | null)?.report;
    if (report?.brief) return report;
    // A 404 from the function: the brief exists nowhere it may be shared.
    const status = (error as { context?: { status?: number } } | null)?.context?.status;
    return status === 404 ? null : undefined;
  } catch {
    return undefined;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Save one answer. False when the function can't be reached or refused it. */
export async function sendAnswer(reportId: string, claimId: string, r: DealResponse): Promise<boolean> {
  const body: Record<string, unknown> = { report_id: reportId, claim_id: claimId, answer: r.answer };
  if (r.answer === "fix" && r.text) body.text = r.text;
  if (r.note) body.note = r.note;
  const data = await call(body);
  return data?.ok === true;
}

/** The account's answers, fresh. `undefined` when the function can't be reached. */
export async function fetchDealRoom(reportId: string): Promise<DealRoomData | null | undefined> {
  const data = await call({ report_id: reportId, read: true });
  if (!data || !("deal_room" in data)) return undefined;
  return readDealRoom(data.deal_room);
}

// ─── This device ───

const key = (reportId: string) => `vibeco.deal.${reportId}`;

export function localAnswers(reportId: string): Responses {
  try {
    return readResponses(JSON.parse(window.localStorage.getItem(key(reportId)) ?? "{}"));
  } catch {
    return {};
  }
}

export function keepLocal(reportId: string, responses: Responses) {
  try {
    window.localStorage.setItem(key(reportId), JSON.stringify(responses));
  } catch {
    // Storage blocked (private window): the answers live for this visit only.
  }
}
