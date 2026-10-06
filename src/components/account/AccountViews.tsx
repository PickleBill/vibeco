import { Fragment, useState } from "react";
import { ArrowUpRight, Briefcase, Check, Compass, Copy, FileText, Quote, Users } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { sectionLabel, type StackFeature } from "@/lib/lenses";
import type { BriefResearch, JobBoardScan, ResearchSource } from "@/components/simulator/SourcesList";
import { ATS_LABEL } from "@/lib/jobBoards";

// ─── Shapes (set by supabase/functions/_shared/agents/account.ts) ───

export interface CustomerList {
  on_list: boolean;
  listed_as?: string;
  source?: string;
  ambiguous?: boolean;
  sentence: string;
}

export type MotionLabel = "Internal" | "Embedded" | "Both" | "Unclear";

export interface MotionSide {
  sources: number[];
  evidence: { source: number; signal: string; quote: string }[];
  clock: string;
  buyer: string;
  question: string;
}

/** Which way the seller would sell here; decided in code from the sources. */
export interface MotionRead {
  label: MotionLabel;
  internal: MotionSide;
  embedded: MotionSide;
}

export interface AccountBrief {
  lens?: string;
  seller?: string;
  company?: string;
  research?: BriefResearch;
  problem?: string;
  target_customer?: string;
  core_features?: StackFeature[];
  revenue_model?: string;
  industry_trends?: string;
  investor_perspective?: string;
  customer_perspective?: string;
  account_line?: string;
  people?: { name: string; role: string; source: number }[];
  start_with?: { role?: string; why?: string };
  discovery_questions?: string[];
  migration_objection?: { objection?: string; honest_answer?: string };
  fit?: { grade?: string; motion?: string; reason?: string };
  motion?: MotionRead;
  customer_list?: CustomerList;
}

export type { AccountAnalysis, CriticResult } from "./explorer/model";

const sourcesOf = (research?: BriefResearch | null): ResearchSource[] =>
  Array.isArray(research?.sources) ? research!.sources : [];

// ─── Citations ───

/** Text with its [n] citations turned into links to the numbered sources. */
export function Cited({ text, sources }: { text?: string; sources: ResearchSource[] }) {
  if (!text) return null;
  const byId = new Map(sources.map((s) => [s.id, s]));
  return (
    <>
      {text.split(/(\[\d+(?:,\s*\d+)*\])/g).map((part, i) => {
        const m = /^\[(\d+(?:,\s*\d+)*)\]$/.exec(part);
        if (!m) return <Fragment key={i}>{part}</Fragment>;
        const ids = m[1].split(/,\s*/).map(Number);
        return (
          <span key={i} className="whitespace-nowrap">
            [
            {ids.map((id, j) => {
              const s = byId.get(id);
              return (
                <Fragment key={id}>
                  {j > 0 && ", "}
                  {s ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      title={s.title}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {id}
                    </a>
                  ) : (
                    id
                  )}
                </Fragment>
              );
            })}
            ]
          </span>
        );
      })}
    </>
  );
}

// ─── Job-board scan ───

/** What the company's own job posts say about its stack: plainly named tools, then options-only mentions. */
export function ScanCard({ scan, company }: { scan?: JobBoardScan | null; company: string }) {
  if (!scan) return null;
  const label = scan.ats ? ATS_LABEL[scan.ats] ?? scan.ats : "";
  if (!scan.found) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em] text-[11px] text-muted-foreground">
          <Briefcase size={13} aria-hidden /> Job-board scan
        </p>
        <p className="mt-1.5">
          No public Greenhouse, Lever or Ashby board found for &ldquo;{company}&rdquo;. If it hires on one, try its domain (for example{" "}
          <span className="font-mono">company.com</span>).
        </p>
      </section>
    );
  }
  // "Customer-facing dashboards" is a sign of analytics inside its product, not a tool.
  const signals = scan.tools.filter((t) => t.signal || t.tool === "Customer-facing analytics");
  const tools = scan.tools.filter((t) => !signals.includes(t));
  const firm = tools.filter((t) => t.firm > 0);
  const options = tools.filter((t) => t.firm === 0);
  return (
    <section aria-label="Job-board scan" className="rounded-lg border border-primary/25 bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          <Briefcase size={13} aria-hidden /> Job-board scan · {label}
        </p>
        {scan.board_url && (
          <a
            href={scan.board_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-muted-foreground hover:text-primary"
          >
            Board <ArrowUpRight size={11} aria-hidden />
          </a>
        )}
      </div>
      <p className="mt-1.5 text-sm text-foreground">
        Read <span className="font-semibold tabular-nums">{scan.scanned_jobs}</span> open role{scan.scanned_jobs === 1 ? "" : "s"}
        {scan.company_name ? ` at ${scan.company_name}` : ""}.
      </p>
      {firm.length > 0 && (
        <>
          <p className="mt-3 text-[11px] font-medium text-muted-foreground">Named plainly in its posts</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {firm.map((t) => (
              <li
                key={t.tool}
                title={`Named plainly in ${t.firm} post${t.firm === 1 ? "" : "s"}; mentioned in ${t.posts}`}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-600/25 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900"
              >
                {t.tool}
                <span className="tabular-nums text-emerald-700/80">{t.posts}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {options.length > 0 && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium">Only listed as options:</span> {options.map((t) => t.tool).join(", ")}
        </p>
      )}
      {signals.length > 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium">Signal, not a tool:</span> {signals.reduce((n, t) => n + t.posts, 0)} post
          {signals.reduce((n, t) => n + t.posts, 0) === 1 ? "" : "s"} describe analytics shipped to its customers.
        </p>
      )}
      {!scan.tools.length && <p className="mt-2 text-xs text-muted-foreground">None of its open roles name a data tool.</p>}
    </section>
  );
}

// ─── Badges ───

const TAG_STYLE: Record<string, string> = {
  Confirmed: "border-emerald-600/30 bg-emerald-50 text-emerald-800",
  Inferred: "border-amber-500/40 bg-amber-50 text-amber-800",
  Former: "border-border bg-muted text-muted-foreground line-through decoration-1",
  "Not found": "border-border bg-muted text-muted-foreground",
};

const TAG_TITLE: Record<string, string> = {
  Confirmed: "A cited source names this tool at the company, checked in code.",
  Inferred: "Likely, but no source names it plainly at the company.",
  Former: "A cited source says the company moved off it or replaced it.",
  "Not found": "Nothing in the sources.",
};

export function StatusTag({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <span
      title={TAG_TITLE[status]}
      className={`inline-flex shrink-0 items-center rounded border px-1.5 py-px text-xs font-semibold uppercase tracking-wide ${TAG_STYLE[status] ?? TAG_STYLE["Not found"]}`}
    >
      {status}
    </span>
  );
}

export function CustomerListBadge({ list, sellerName }: { list?: CustomerList; sellerName: string }) {
  if (!list) return null;
  return (
    <div
      className={`rounded-md border px-3 py-2 text-xs leading-relaxed ${
        list.on_list ? "border-primary/30 bg-accent text-foreground" : "border-border bg-muted/50 text-foreground"
      }`}
    >
      <span className="font-semibold">
        {list.on_list ? `On ${sellerName}'s public customer list` : `Not on ${sellerName}'s public customer list`}
      </span>
      {list.on_list && list.listed_as && <span className="text-muted-foreground"> · listed as {list.listed_as}</span>}
      {list.on_list && list.source && (
        <>
          {" · "}
          <a href={list.source} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline-offset-2 hover:underline">
            {list.ambiguous ? "confirm it's the same company" : "source"}
          </a>
        </>
      )}
    </div>
  );
}

export function FitGrade({ fit }: { fit?: AccountBrief["fit"] }) {
  if (!fit?.grade) return null;
  const graded = fit.motion === "Internal" || fit.motion === "Embedded" ? `${fit.motion} motion` : fit.motion === "Unclear" ? "Motion unclear" : "";
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2"
      title={graded ? `Fit grade for the ${graded.toLowerCase()}` : undefined}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Fit</span>
      <span className="font-display text-lg font-bold leading-none text-primary">{fit.grade}</span>
      {graded && <span className="text-[11px] leading-tight text-muted-foreground">{graded}</span>}
    </div>
  );
}

// ─── Motion ───

const MOTION_STYLE: Record<MotionLabel, string> = {
  Internal: "border-primary/40 bg-accent text-primary",
  Embedded: "border-primary bg-primary text-primary-foreground",
  Both: "border-primary bg-primary text-primary-foreground",
  Unclear: "border-dashed border-border bg-muted text-muted-foreground",
};

const MOTION_SUMMARY: Record<MotionLabel, string> = {
  Internal: "Analytics for its own teams.",
  Embedded: "Analytics inside its product, for its customers.",
  Both: "Analytics for its own teams, and inside its product for its customers.",
  Unclear: "No source shows either motion yet, so test both on the call.",
};

export function MotionBadge({ label }: { label?: string }) {
  if (!label || !(label in MOTION_STYLE)) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${MOTION_STYLE[label as MotionLabel]}`}
    >
      {label}
    </span>
  );
}

function MotionSideCard({
  name,
  side,
  live,
  sources,
}: {
  name: "Internal" | "Embedded";
  side: MotionSide;
  live: boolean;
  sources: ResearchSource[];
}) {
  const seen = new Set<string>();
  const signals = side.evidence.filter((e) => !seen.has(e.signal.toLowerCase()) && seen.add(e.signal.toLowerCase())).slice(0, 3);
  // A sentence from a source; role titles and stack lines aren't quotes.
  const quote = side.evidence.find((e) => e.quote && e.quote !== e.signal && !e.signal.endsWith(" role") && !/^[A-Z][\w ]+: /.test(e.quote))?.quote;
  return (
    <div className="rounded-md border border-border bg-surface-elevated p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{name}</p>
      {live ? (
        <p className="mt-1 text-sm font-medium text-foreground">
          {signals.map((e, i) => (
            <Fragment key={i}>
              {i > 0 && "; "}
              {e.signal} <Cited text={`[${e.source}]`} sources={sources} />
            </Fragment>
          ))}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Nothing in the sources yet.</p>
      )}
      {quote && (
        <p className="mt-1.5 flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <Quote size={12} className="mt-0.5 shrink-0 text-primary/60" aria-hidden />
          <span className="italic">{quote}</span>
        </p>
      )}
      <dl className="mt-2.5 grid gap-2 text-xs leading-relaxed">
        {(
          [
            ["Clock to test", side.clock],
            ["Buyer to start with", side.buyer],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-foreground/90">
              <Cited text={value} sources={sources} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The motion: a badge, then each motion the sources show with its clock and buyer. */
export function MotionPanel({ motion, fit, research }: { motion?: MotionRead; fit?: AccountBrief["fit"]; research?: BriefResearch | null }) {
  if (!motion?.label || !(motion.label in MOTION_STYLE)) return null;
  const sources = sourcesOf(research);
  const live = (["internal", "embedded"] as const).filter((id) => motion[id]?.sources?.length > 0);
  if (live.length === 2 && fit?.motion === "Embedded") live.reverse();
  const shown = motion.label === "Unclear" ? (["internal", "embedded"] as const) : live;
  const missing = motion.label === "Internal" ? "embedded" : motion.label === "Embedded" ? "internal" : null;
  return (
    <section aria-label="Motion" className="rounded-md border border-primary/20 bg-accent/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          <Compass size={13} aria-hidden /> Motion
        </p>
        <MotionBadge label={motion.label} />
        <p className="text-xs text-muted-foreground">{MOTION_SUMMARY[motion.label]}</p>
      </div>
      <div className={`mt-2.5 grid gap-2 ${shown.length === 2 ? "sm:grid-cols-2" : ""}`}>
        {shown.map((id) => (
          <MotionSideCard
            key={id}
            name={id === "internal" ? "Internal" : "Embedded"}
            side={motion[id]}
            live={motion[id].sources.length > 0}
            sources={sources}
          />
        ))}
      </div>
      {missing && (
        <p className="mt-2 text-xs text-muted-foreground">
          {missing === "embedded"
            ? "Embedded: no source shows analytics inside its product for its customers."
            : "Internal: no source shows the stack its own teams use for analytics."}
        </p>
      )}
    </section>
  );
}

// ─── First-call plan ───

/** Section headings in the composed plan are upper case: "WHY NOW", "FIT GRADE: B". */
const HEADING = /^([A-Z0-9][A-Z0-9 '-]{3,})(?::\s*(.*))?$/;

function PlanBody({ plan, sources, skip }: { plan: string; sources: ResearchSource[]; skip?: string[] }) {
  const lines = plan.split("\n");
  // The first line ("FIRST-CALL PLAN: Company") is the card's title.
  const all = /^FIRST-CALL PLAN/.test(lines[0] ?? "") ? lines.slice(1) : lines;
  // Sections drawn elsewhere on the card (the motion panel) are left out here.
  let skipping = false;
  const body = all.filter((raw) => {
    const h = HEADING.exec(raw.trim());
    if (h && /[A-Z]{3,}/.test(h[1]) && !raw.startsWith(" ")) skipping = !!skip?.includes(h[1].trim());
    return !skipping;
  });
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-foreground/90">
      {body.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <div key={i} className="h-2" aria-hidden />;
        const h = HEADING.exec(line);
        if (h && /[A-Z]{3,}/.test(h[1])) {
          return (
            <h4 key={i} className="pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {h[1]}
              {h[2] ? <span className="ml-1.5 text-foreground">{h[2]}</span> : null}
            </h4>
          );
        }
        // "- Warehouse: Snowflake (Confirmed [3])", "- AI: Cortex (Inferred). why", "- BI tools: Not found"
        const stack = /^- ([^:]+): (.*)$/.exec(line);
        if (stack) {
          const tagged = /^(.*?) \((Confirmed|Inferred|Former)(?:: moved off it)?((?: \[[\d, ]+\])?)\)(.*)$/.exec(stack[2]);
          const notFound = stack[2] === "Not found";
          return (
            <p key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pl-1">
              <span className="font-semibold text-foreground">{stack[1]}:</span>
              {tagged ? (
                <>
                  <span>{tagged[1]}</span>
                  {tagged[3] && <Cited text={tagged[3].trim()} sources={sources} />}
                  <StatusTag status={tagged[2]} />
                  {tagged[4].replace(/^[.\s]+/, "") && (
                    <span className="basis-full text-xs text-muted-foreground sm:basis-auto">
                      <Cited text={tagged[4].replace(/^[.\s]+/, "")} sources={sources} />
                    </span>
                  )}
                </>
              ) : notFound ? (
                <StatusTag status="Not found" />
              ) : (
                <Cited text={stack[2]} sources={sources} />
              )}
            </p>
          );
        }
        // "Internal: Who owns Sigma today?" under ONE QUESTION PER MOTION
        const perMotion = /^(Internal|Embedded): (.*)$/.exec(line);
        if (perMotion) {
          return (
            <p key={i} className="pl-1">
              <span className="font-semibold text-foreground">{perMotion[1]}:</span> <Cited text={perMotion[2]} sources={sources} />
            </p>
          );
        }
        const numbered = /^(\d+)\. (.*)$/.exec(line);
        if (numbered) {
          return (
            <p key={i} className="flex gap-2 pl-1">
              <span className="w-4 shrink-0 text-right font-semibold text-primary">{numbered[1]}.</span>
              <span className="min-w-0">
                <Cited text={numbered[2]} sources={sources} />
              </span>
            </p>
          );
        }
        return (
          <p key={i}>
            <Cited text={line} sources={sources} />
          </p>
        );
      })}
    </div>
  );
}

export function PlanCard({
  company,
  plan,
  brief,
  sellerName,
}: {
  company: string;
  plan: string;
  brief: AccountBrief;
  sellerName?: string;
}) {
  const [copied, setCopied] = useState(false);
  const sources = sourcesOf(brief.research);
  const copy = async () => {
    if (await copyToClipboard(plan)) {
      setCopied(true);
      toast.success("Plan copied");
      setTimeout(() => setCopied(false), 2000);
    } else toast.error("Couldn't copy.");
  };
  return (
    <section aria-labelledby="plan-title" className="rounded-lg border border-primary/25 bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <FileText size={13} aria-hidden /> First-call plan
          </p>
          <h3 id="plan-title" className="mt-1 font-display text-xl font-bold text-foreground">
            {company}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <FitGrade fit={brief.fit} />
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copied ? <Check size={13} className="text-primary" aria-hidden /> : <Copy size={13} aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="space-y-3 px-4 py-4 sm:px-5">
        {sellerName && <CustomerListBadge list={brief.customer_list} sellerName={sellerName} />}
        <MotionPanel motion={brief.motion} fit={brief.fit} research={brief.research} />
        <PlanBody plan={plan} sources={sources} skip={brief.motion ? ["MOTION"] : undefined} />
      </div>
    </section>
  );
}

// ─── Stack read ───

export function StackTable({ lines, research }: { lines?: StackFeature[]; research?: BriefResearch | null }) {
  if (!Array.isArray(lines) || !lines.length) return null;
  const sources = sourcesOf(research);
  return (
    <section aria-labelledby="stack-title" className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h3 id="stack-title" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          Stack read
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Confirmed lines are checked in code: the cited source must name the tool and the company.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {lines.map((l, i) => (
          <li key={i} className="px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="w-full text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:w-40">{l.name}</span>
              <span className="text-sm font-semibold text-foreground">{l.tool || "—"}</span>
              <StatusTag status={l.status} />
              {Array.isArray(l.sources) && l.sources.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  <Cited text={`[${l.sources.join(", ")}]`} sources={sources} />
                </span>
              )}
            </div>
            {l.evidence ? (
              <p className="mt-1.5 flex gap-1.5 text-xs leading-relaxed text-muted-foreground sm:pl-[10.5rem]">
                <Quote size={12} className="mt-0.5 shrink-0 text-primary/60" aria-hidden />
                <span className="italic">{l.evidence}</span>
              </p>
            ) : l.status !== "Not found" && l.description ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:pl-[10.5rem]">
                <Cited text={l.description} sources={sources} />
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── The research behind the plan ───

const SECTION_KEYS = ["problem", "revenue_model", "target_customer", "industry_trends", "investor_perspective", "customer_perspective"] as const;

export function AccountSections({ brief }: { brief: AccountBrief }) {
  const sources = sourcesOf(brief.research);
  const people = Array.isArray(brief.people) ? brief.people : [];
  return (
    <section aria-labelledby="research-title" className="rounded-lg border border-border bg-card px-4 py-4 sm:px-5">
      <h3 id="research-title" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        The research behind the plan
      </h3>
      <div className="mt-3 grid gap-5">
        {SECTION_KEYS.map((key) => {
          const value = brief[key];
          if (typeof value !== "string" || !value.trim()) return null;
          return (
            <div key={key}>
              <h4 className="font-display text-sm font-bold text-foreground">{sectionLabel("account", key, key)}</h4>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                <Cited text={value} sources={sources} />
              </p>
              {key === "target_customer" && people.length > 0 && (
                <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  <Users size={12} className="text-primary" aria-hidden />
                  <span className="font-semibold text-foreground">Named in the sources:</span>
                  {people.map((p, i) => (
                    <span key={i}>
                      {p.name}, {p.role} <Cited text={`[${p.source}]`} sources={sources} />
                      {i < people.length - 1 ? ";" : ""}
                    </span>
                  ))}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
