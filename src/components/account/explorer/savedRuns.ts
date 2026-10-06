import { supabase } from "@/integrations/supabase/client";
import type { AccountBrief } from "../AccountViews";
import type { AccountAnalysis } from "./model";

/** A finished account run, as a shared report link returns it. */
export interface SavedReport {
  id: string;
  idea: string;
  brief: AccountBrief;
  lovable_prompt: string | null;
  auto_analysis: AccountAnalysis | null;
  created_at: string;
}

const cache = new Map<string, Promise<SavedReport | null>>();

/** A saved run by id (shared reports resolve through a read-only RPC). Cached for the page's life. */
export function loadReport(id: string): Promise<SavedReport | null> {
  let hit = cache.get(id);
  if (!hit) {
    hit = (async () => {
      const { data, error } = await supabase.rpc("get_shared_report", { _report_id: id });
      if (error || !data || typeof data !== "object") return null;
      const r = data as unknown as SavedReport;
      return r.brief ? r : null;
    })().catch(() => null);
    cache.set(id, hit);
  }
  return hit;
}

/** Seed the cache with a run that just finished here, so reopening it is instant. */
export function rememberReport(report: SavedReport) {
  cache.set(report.id, Promise.resolve(report));
}

// ─── Recent runs in this browser ───

const KEY = "vibeco.account.recent";

export interface RunRef {
  company: string;
  reportId: string;
}

export function recentRuns(seller: string | undefined): RunRef[] {
  try {
    const all = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, RunRef[]>;
    const list = all[seller ?? "_"];
    return Array.isArray(list) ? list.filter((r) => r && typeof r.company === "string" && typeof r.reportId === "string").slice(0, 3) : [];
  } catch {
    return [];
  }
}

export function rememberRun(seller: string | undefined, run: RunRef) {
  try {
    const all = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, RunRef[]>;
    const k = seller ?? "_";
    const list = (Array.isArray(all[k]) ? all[k] : []).filter((r) => r.reportId !== run.reportId && r.company.toLowerCase() !== run.company.toLowerCase());
    all[k] = [run, ...list].slice(0, 3);
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Storage blocked (private window): recent runs just aren't remembered.
  }
}

/** "Today, 9:12 AM" or "Oct 7, 9:12 AM". */
export function ranAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const today = new Date().toDateString() === d.toDateString();
  return `${today ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}
