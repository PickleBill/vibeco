/** Browser-safe, versioned contract. Legacy build reports keep their existing schema. */
export const WORKBENCH_SCHEMA_VERSION = 2 as const;
export const GENERAL_PURPOSES = ["research", "initiative", "decision"] as const;
export type GeneralPurpose = typeof GENERAL_PURPOSES[number];
export type WorkbenchPurpose = "build" | GeneralPurpose;

export interface ReportSource {
  id: string;
  url: string;
  title: string;
  retrievedAt: string;
  excerpt: string;
}
export interface ReportFact {
  text: string;
  sourceIds: string[];
  origin: "source" | "user";
}
export interface GeneralReport {
  schemaVersion: typeof WORKBENCH_SCHEMA_VERSION;
  purpose: GeneralPurpose;
  question: string;
  title: string;
  summary: string;
  recommendation: string;
  facts: ReportFact[];
  sources: ReportSource[];
  assumptions: string[];
  openQuestions: string[];
  perspectives: { name: string; position: string; rationale: string; synthetic: true }[];
  tensions: string[];
  alternatives: string[];
  nextActions: string[];
  handoffPrompt: string;
  limitations: string[];
}
export interface WorkbenchRequest {
  action: "analyze" | "refine";
  purpose: GeneralPurpose;
  question: string;
  context?: string;
  sourceUrls?: string[];
  priorReport?: GeneralReport;
  refinement?: string;
}

export class WorkbenchValidationError extends Error {
  constructor(message: string) { super(message); this.name = "WorkbenchValidationError"; }
}
function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new WorkbenchValidationError(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 8000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new WorkbenchValidationError(`${label} must be text between 1 and ${max} characters.`);
  return value.trim();
}
function list(value: unknown, label: string, max = 20): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new WorkbenchValidationError(`${label} must be a list of at most ${max} items.`);
  return value;
}
function texts(value: unknown, label: string, max = 20): string[] {
  return list(value, label, max).map((item) => text(item, label, 4000));
}
export function isGeneralPurpose(value: unknown): value is GeneralPurpose {
  return typeof value === "string" && (GENERAL_PURPOSES as readonly string[]).includes(value);
}

/** Reject direct/private destinations, credentials, alternate ports, and non-web schemes.
 * URLs are sent only to the fixed Firecrawl API origin, never fetched by this server.
 * Firecrawl remains responsible for DNS/redirect egress enforcement in its own network.
 */
export function publicSourceUrl(value: unknown): string {
  const input = text(value, "Source URL", 2048);
  let url: URL;
  try { url = new URL(input); } catch { throw new WorkbenchValidationError("Use a complete public https:// source URL."); }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port
    || !host.includes(".") || host.includes(":") || /^[\d.]+$/.test(host)
    || /(^|\.)(localhost|local|internal|test|invalid|example|onion|home|lan)$/.test(host)
    || /(^|\.)(nip\.io|sslip\.io|localtest\.me|lvh\.me)$/.test(host)
    || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) {
    throw new WorkbenchValidationError("Sources must be public web pages without credentials, private addresses, or alternate ports.");
  }
  url.hash = "";
  return url.toString();
}

export function parseGeneralReport(value: unknown): GeneralReport {
  const r = record(value, "Report");
  if (r.schemaVersion !== WORKBENCH_SCHEMA_VERSION || !isGeneralPurpose(r.purpose)) throw new WorkbenchValidationError("Unsupported report version or purpose.");
  const sources: ReportSource[] = list(r.sources, "Sources", 5).map((item) => {
    const source = record(item, "Source");
    const retrievedAt = text(source.retrievedAt, "Retrieval time", 64);
    if (!Number.isFinite(Date.parse(retrievedAt))) throw new WorkbenchValidationError("Invalid source retrieval time.");
    return { id: text(source.id, "Source ID", 100), url: publicSourceUrl(source.url), title: text(source.title, "Source title", 500), retrievedAt, excerpt: text(source.excerpt, "Source excerpt", 1500) };
  });
  const sourceIds = new Set(sources.map((source) => source.id));
  if (sourceIds.size !== sources.length || new Set(sources.map((s) => s.url)).size !== sources.length) throw new WorkbenchValidationError("Duplicate report sources.");
  const facts: ReportFact[] = list(r.facts, "Facts").map((item) => {
    const fact = record(item, "Fact");
    const ids = texts(fact.sourceIds, "Fact sources", 5);
    const origin = fact.origin ?? (ids.length ? "source" : "user");
    if (!ids.every((id) => sourceIds.has(id))) throw new WorkbenchValidationError("A fact references an unavailable source.");
    if ((origin !== "source" && origin !== "user") || (origin === "source" && !ids.length) || (origin === "user" && ids.length)) throw new WorkbenchValidationError("Facts must distinguish cited evidence from user-provided context.");
    return { text: text(fact.text, "Fact"), sourceIds: [...new Set(ids)], origin };
  });
  const perspectives = list(r.perspectives, "Perspectives", 5).map((item) => {
    const p = record(item, "Perspective");
    if (p.synthetic !== true) throw new WorkbenchValidationError("AI perspectives must be labeled synthetic.");
    return { name: text(p.name, "Perspective name", 100), position: text(p.position, "Perspective"), rationale: text(p.rationale, "Rationale"), synthetic: true as const };
  });
  if (perspectives.length < 2) throw new WorkbenchValidationError("At least two perspectives are required.");
  const nextActions = texts(r.nextActions, "Next actions", 10);
  if (!nextActions.length) throw new WorkbenchValidationError("A report must include a next action.");
  return {
    schemaVersion: WORKBENCH_SCHEMA_VERSION, purpose: r.purpose, question: text(r.question, "Question", 2000),
    title: text(r.title, "Title", 200), summary: text(r.summary, "Summary"), recommendation: text(r.recommendation, "Recommendation"),
    facts, sources, assumptions: texts(r.assumptions, "Assumptions"), openQuestions: texts(r.openQuestions, "Open questions"),
    perspectives, tensions: texts(r.tensions, "Tensions"), alternatives: texts(r.alternatives, "Alternatives"), nextActions,
    handoffPrompt: text(r.handoffPrompt, "Handoff prompt", 10000), limitations: texts(r.limitations, "Limitations"),
  };
}
export function parseWorkbenchRequest(value: unknown): WorkbenchRequest {
  const r = record(value, "Request");
  if (r.action !== "analyze" && r.action !== "refine") throw new WorkbenchValidationError("Choose analyze or refine.");
  if (!isGeneralPurpose(r.purpose)) throw new WorkbenchValidationError("Choose research, initiative, or decision.");
  const question = text(r.question, "Question", 2000);
  if (question.length < 10) throw new WorkbenchValidationError("Add a little more detail to your question (at least 10 characters).");
  const context = r.context === undefined || r.context === "" ? undefined : text(r.context, "Context", 12000);
  const sourceUrls = r.sourceUrls === undefined ? [] : [...new Set(list(r.sourceUrls, "Source URLs", 5).map(publicSourceUrl))];
  const priorReport = r.priorReport === undefined ? undefined : parseGeneralReport(r.priorReport);
  const refinement = r.refinement === undefined ? undefined : text(r.refinement, "Refinement", 4000);
  if (r.action === "refine" && (!priorReport || !refinement)) throw new WorkbenchValidationError("Refining requires the previous report and what you want to change.");
  if (priorReport && (priorReport.purpose !== r.purpose || priorReport.question !== question)) throw new WorkbenchValidationError("Refinement must keep the original report question and purpose.");
  return { action: r.action, purpose: r.purpose, question, context, sourceUrls, priorReport, refinement };
}
