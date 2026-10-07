// The signal ladder behind a fit grade: what the saved brief shows about the
// account's stack, its investment in data and its timing, read in code (no
// model calls). Intent never comes from public research, so it never shows.
import type { AccountBrief } from "../AccountViews";
import { plainText } from "@/components/territory/model";
import { monthLabel, whyNowItems } from "./model";

export type SignalId = "stack" | "investing" | "trigger" | "intent";

export interface Signal {
  id: SignalId;
  label: string;
  reached: boolean;
  /** One short line of evidence, with its source as "[n]" when there is one. */
  line: string;
}

/** A job post from the company's own board: tagged by the scan, or titled that way by older runs. */
const OWN_POST_TITLE = /\((?:greenhouse|lever|ashby|workday) job post\)\s*$/i;
const ownPost = (s: { via?: string; title?: string }) => !!s.via || OWN_POST_TITLE.test(s.title ?? "");

/** "Data Engineer at Equifax (Workday job post)" -> "Data Engineer". */
export const roleOf = (title: string) =>
  title
    .replace(/\s+at\s+.+$/i, "")
    .replace(/\s+[|–—-]\s+.*$/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

// A data, analytics or AI role, either way round: "Data Engineer", "Analytics
// Consultant", "Director, Data Operations", "Head of Analytics".
const DATA = String.raw`(?:data|analytics|BI|business intelligence|insights|machine learning|ML|AI)`;
const TITLE = String.raw`(?:analyst|engineer|scientist|developer|architect|manager|lead|director|head|consultant|officer|VP)`;
const DATA_ROLE = new RegExp(String.raw`\b${DATA}\b[^|()]{0,30}\b${TITLE}\b|\b${TITLE}(?:,| of)\s+${DATA}\b`, "i");

export const isDataRole = (role: string) => DATA_ROLE.test(role);

const plural = (n: number, word: string) => `${n} more ${word}${n === 1 ? "" : "s"}`;

/** "Metabase", "BigQuery and Snowflake", "BigQuery + 6 more". */
function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items[0]} + ${items.length - 1} more`;
}

/** One clause of a long why-now line: cut at the first top-level comma, or at a word. */
export function clip(text: string, max = 90): string {
  const t = text.replace(/[.\s]+$/, "");
  if (t.length <= max) return t;
  let depth = 0;
  for (let i = 0; i < Math.min(t.length, max); i++) {
    if (t[i] === "(") depth++;
    else if (t[i] === ")") depth = Math.max(0, depth - 1);
    else if (t[i] === "," && depth === 0 && i >= 24) return t.slice(0, i);
  }
  const cut = t.lastIndexOf(" ", max);
  return `${t.slice(0, cut > 24 ? cut : max).replace(/[,;:\s]+$/, "")}…`;
}

function stackSignal(brief: AccountBrief): Signal {
  const sources = new Map((brief.research?.sources ?? []).map((s) => [s.id, s]));
  const lines = (Array.isArray(brief.core_features) ? brief.core_features : []).filter(
    (l) => l.status === "Confirmed" && l.tool?.trim() && Array.isArray(l.sources) && l.sources.length,
  );
  const tools = [...new Set(lines.map((l) => l.tool!.trim()))];
  if (!tools.length) return { id: "stack", label: "Stack named", reached: false, line: "No data tool confirmed in a source" };
  const cited = [...new Set(lines.map((l) => l.sources![0]))];
  const own = cited.every((n) => sources.has(n) && ownPost(sources.get(n)!));
  const where = own ? (cited.length > 1 ? "its own job posts" : "its own job post") : cited.length > 1 ? "the sources" : "a source";
  return { id: "stack", label: "Stack named", reached: true, line: `${listOf(tools)}, named in ${where} [${cited[0]}]` };
}

function investingSignal(brief: AccountBrief): Signal {
  const no: Signal = { id: "investing", label: "Investing in data", reached: false, line: "No open data roles found" };
  const sources = (brief.research?.sources ?? []).filter((s) => !s.off_topic);
  const roles: { role: string; source: number; own: boolean }[] = [];
  const add = (role: string, source: number, own: boolean) => {
    if (role && !roles.some((r) => r.source === source || r.role.toLowerCase() === role.toLowerCase())) roles.push({ role, source, own });
  };
  // Its own job posts, titled for data, analytics or AI work.
  for (const s of sources) if (ownPost(s) && isDataRole(roleOf(s.title))) add(roleOf(s.title), s.id, true);
  // Roles the motion read already checked in code ("Principal Data Engineer role").
  const byId = new Map(sources.map((s) => [s.id, s]));
  for (const side of [brief.motion?.internal, brief.motion?.embedded]) {
    for (const e of side?.evidence ?? []) {
      const s = byId.get(e.source);
      if (s && / role$/.test(e.signal)) add(e.signal.replace(/ role$/, ""), e.source, ownPost(s));
    }
  }
  if (!roles.length) return no;
  roles.sort((a, b) => Number(b.own) - Number(a.own) || a.source - b.source);
  const [first] = roles;
  const more = roles.length > 1 ? ` + ${plural(roles.length - 1, "data role")}` : "";
  const where = roles.every((r) => r.own) ? "posted on its own job board" : "in its job posts";
  return { id: "investing", label: "Investing in data", reached: true, line: `${first.role}${more}, ${where} [${first.source}]` };
}

function triggerSignal(brief: AccountBrief): Signal {
  const dated = whyNowItems(brief.revenue_model).find((i) => i.date);
  if (!dated) return { id: "trigger", label: "Dated trigger", reached: false, line: "No dated trigger in the sources" };
  const cite = /\[(\d+)/.exec(dated.text)?.[1];
  return { id: "trigger", label: "Dated trigger", reached: true, line: `${monthLabel(dated.date)}: ${clip(plainText(dated.text))}${cite ? ` [${cite}]` : ""}` };
}

const INTENT: Signal = { id: "intent", label: "Stated intent", reached: false, line: "Not from public research. That's what discovery is for." };

/** Stack named, investing in data, a dated trigger, stated intent: in that order. */
export function fitSignals(brief: AccountBrief | null | undefined): Signal[] {
  const b = brief ?? {};
  return [stackSignal(b), investingSignal(b), triggerSignal(b), INTENT];
}
