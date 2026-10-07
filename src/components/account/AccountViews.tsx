import { Fragment, useState } from "react";
import { ArrowUpRight, Briefcase, Check, Copy, Quote, Users } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { sectionLabel, type StackFeature } from "@/lib/lenses";
import type { BriefResearch, JobBoardScan, ResearchSource } from "@/components/simulator/SourcesList";
import { ATS_LABEL } from "@/lib/jobBoards";
import { ageDays } from "@/components/territory/model";
import { ageText, cx, freshness, type Freshness } from "@/components/territory/style";
import { EvidenceTag, Eyebrow, FieldPill } from "@/components/territory/ui";
import { label as labelCls, secondaryBtn } from "./explorer/look";

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

const AGO_DAYS: Record<string, number> = { hour: 0, day: 1, week: 7, month: 30, year: 365 };

/** A source's age in days: "2026-09-30", "2026-09" or a search engine's "6 days ago". */
function sourceAge(date?: string): number | null {
  if (!date) return null;
  const iso = ageDays(date);
  if (iso !== null) return iso;
  const m = /(\d+)\s+(hour|day|week|month|year)s?\s+ago/i.exec(date);
  return m ? Number(m[1]) * AGO_DAYS[m[2].toLowerCase()] : null;
}

// The inline twin of the source chip: the number only, ageing the same way.
const CITE: Record<Freshness, string> = {
  fresh: "border-foreground bg-foreground text-white",
  aging: "border-[#9097A6] bg-white text-foreground",
  stale: "border-dashed border-[#9097A6] bg-white text-foreground",
  undated: "border-dotted border-[#9097A6] bg-white text-foreground",
};

function CiteChip({ id, source }: { id: number; source?: ResearchSource }) {
  const days = sourceAge(source?.date);
  const cls = cx(
    "relative -top-px mx-px inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border px-1 align-middle font-mono text-xs font-semibold leading-none",
    CITE[freshness(days)],
  );
  if (!source) return <span className={cls}>{id}</span>;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={`[${id}] ${source.title}${source.date ? ` · ${source.date} · ${ageText(days)}` : " · date not captured"}`}
      className={cx(cls, "no-underline transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
    >
      {id}
    </a>
  );
}

// "[1] [2, 3]" in a row is one group; the punctuation right after it stays on its line.
const CITE_RUN = /(\[\d+(?:,\s*\d+)*\](?:\s*\[\d+(?:,\s*\d+)*\])*[.,;:!?)]?)/g;

/** Text with its [n] citations turned into small numbered chips that link to the sources. */
export function Cited({ text, sources }: { text?: string; sources: ResearchSource[] }) {
  if (!text) return null;
  const byId = new Map(sources.map((s) => [s.id, s]));
  return (
    <>
      {text.split(CITE_RUN).map((part, i) => {
        if (i % 2 === 0) return part ? <Fragment key={i}>{part}</Fragment> : null;
        const ids = [...part.matchAll(/\d+/g)].map((m) => Number(m[0]));
        const tail = /[.,;:!?)]$/.exec(part)?.[0] ?? "";
        return (
          <span key={i} className="whitespace-nowrap">
            {ids.map((id, j) => (
              <CiteChip key={`${id}-${j}`} id={id} source={byId.get(id)} />
            ))}
            {tail}
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
  const ats = scan.ats ? ATS_LABEL[scan.ats] ?? scan.ats : "";
  if (!scan.found) {
    return (
      <section className="rounded-xl border border-dotted border-[#9097A6] p-4 text-[15px] leading-relaxed text-[#4A4F63]">
        <Eyebrow className="flex items-center gap-1.5">
          <Briefcase size={14} aria-hidden /> Job-board scan
        </Eyebrow>
        <p className="mt-1.5">
          No public Greenhouse, Lever, Ashby or known Workday board found for &ldquo;{company}&rdquo;. If it hires on one, try its domain (for example{" "}
          <span className="font-mono text-sm">company.com</span>).
        </p>
      </section>
    );
  }
  // "Customer-facing dashboards" is a sign of analytics inside its product, not a tool.
  const signals = scan.tools.filter((t) => t.signal || t.tool === "Customer-facing analytics");
  const tools = scan.tools.filter((t) => !signals.includes(t));
  const firm = tools.filter((t) => t.firm > 0);
  const options = tools.filter((t) => t.firm === 0);
  const signalPosts = signals.reduce((n, t) => n + t.posts, 0);
  return (
    <section aria-label="Job-board scan" className="border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <Eyebrow className="flex items-center gap-1.5">
          <Briefcase size={14} aria-hidden /> Job-board scan · {ats}
        </Eyebrow>
        {scan.board_url && (
          <a
            href={scan.board_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Board <ArrowUpRight size={14} aria-hidden />
          </a>
        )}
      </div>
      <p className="text-[15px] text-foreground">
        Read <span className="font-mono font-semibold">{scan.scanned_jobs}</span> open role{scan.scanned_jobs === 1 ? "" : "s"}
        {scan.company_name ? ` at ${scan.company_name}` : ""}.
      </p>
      {firm.length > 0 && (
        <>
          <p className={cx(labelCls, "mt-4")}>Named plainly in its posts</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {firm.map((t) => (
              <li
                key={t.tool}
                title={`Named plainly in ${t.firm} post${t.firm === 1 ? "" : "s"}; mentioned in ${t.posts}`}
                className="inline-flex h-[30px] items-center gap-2 rounded-[6px] border border-foreground bg-card px-2.5 text-sm font-semibold text-foreground"
              >
                {t.tool}
                <span className="font-mono text-xs font-medium text-muted-foreground">{t.posts}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {options.length > 0 && (
        <p className="mt-3 text-sm leading-relaxed text-[#4A4F63]">
          <span className="font-semibold text-foreground">Only listed as options:</span> {options.map((t) => t.tool).join(", ")}
        </p>
      )}
      {signals.length > 0 && (
        <p className="mt-2 text-sm leading-relaxed text-[#4A4F63]">
          <span className="font-semibold text-foreground">Signal, not a tool:</span> {signalPosts} post{signalPosts === 1 ? "" : "s"} describe analytics shipped
          to its customers.
        </p>
      )}
      {!scan.tools.length && <p className="mt-2 text-sm text-[#4A4F63]">None of its open roles name a data tool.</p>}
    </section>
  );
}

// ─── Badges ───

const TAG_TITLE: Record<string, string> = {
  Confirmed: "A cited source names this tool at the company, checked in code.",
  Inferred: "Likely, but no source names it plainly at the company.",
  Former: "A cited source says the company moved off it or replaced it.",
  "Not found": "Nothing in the sources.",
};

/** An evidence tag (Confirmed solid, Inferred dashed, Former struck, Not found dotted) with what it means on hover. */
export function StatusTag({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <span title={TAG_TITLE[status]} className="inline-flex shrink-0">
      {status in TAG_TITLE ? (
        <EvidenceTag status={status} />
      ) : (
        <span className="inline-flex h-[26px] items-center rounded-[4px] border border-dotted border-[#9097A6] px-2 text-xs font-semibold text-[#6B7080]">{status}</span>
      )}
    </span>
  );
}

export function CustomerListBadge({ list, sellerName }: { list?: CustomerList; sellerName: string }) {
  if (!list) return null;
  return (
    <p
      className={cx(
        "rounded-[8px] border px-3 py-2 text-sm leading-relaxed text-foreground",
        list.on_list ? "border-foreground bg-card" : "border-[#D9D4C7] bg-muted",
      )}
    >
      <span className="font-semibold">
        {list.on_list ? `On ${sellerName}'s public customer list` : `Not on ${sellerName}'s public customer list`}
      </span>
      {list.on_list && list.listed_as && <span className="text-[#4A4F63]"> · listed as {list.listed_as}</span>}
      {list.on_list && list.source && (
        <>
          {" · "}
          <a href={list.source} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-primary underline-offset-2 hover:underline">
            {list.ambiguous ? "confirm it's the same company" : "source"}
          </a>
        </>
      )}
    </p>
  );
}

/** The fit letter: A filled, B solid, C dashed (evidence and timing, not deal size). */
export function GradeBox({ grade, size = "sm" }: { grade?: string; size?: "sm" | "lg" }) {
  const g = (grade ?? "").trim().toUpperCase().slice(0, 1) || "?";
  const box =
    g === "A" ? "border-foreground bg-foreground text-white" : g === "B" ? "border-foreground bg-card text-foreground" : "border-dashed border-[#4A4F63] bg-card text-foreground";
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center font-mono font-semibold",
        size === "lg" ? "h-12 w-12 rounded-[8px] border-2 text-2xl" : "h-6 w-6 rounded-[5px] border-[1.5px] text-sm",
        box,
      )}
    >
      {g}
    </span>
  );
}

export function FitGrade({ fit }: { fit?: AccountBrief["fit"] }) {
  if (!fit?.grade) return null;
  const graded = fit.motion === "Internal" || fit.motion === "Embedded" ? `${fit.motion} motion` : fit.motion === "Unclear" ? "Motion unclear" : "";
  return (
    <div
      className="flex items-center gap-2 rounded-[8px] border border-[#D9D4C7] bg-card px-2.5 py-1.5"
      title={graded ? `Fit grade for the ${graded.toLowerCase()}` : undefined}
    >
      <span className="text-[13px] font-medium text-foreground">Fit</span>
      <GradeBox grade={fit.grade} />
      {graded && <span className="text-[13px] leading-tight text-muted-foreground">{graded}</span>}
    </div>
  );
}

// ─── Motion ───

const MOTION_SUMMARY: Record<MotionLabel, string> = {
  Internal: "Analytics for its own teams.",
  Embedded: "Analytics inside its product, for its customers.",
  Both: "Analytics for its own teams, and inside its product for its customers.",
  Unclear: "No source shows either motion yet, so test both on the call.",
};

/** The motion as a field pill: "Aa Both". */
export function MotionBadge({ label }: { label?: string }) {
  if (!label || !(label in MOTION_SUMMARY)) return null;
  return <FieldPill>{label}</FieldPill>;
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
    <div className={cx("border-t-2 pt-3", live ? "border-foreground" : "border-dotted border-[#9097A6]")}>
      <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.06em] text-foreground">{name}</p>
      {live ? (
        <p className="mt-1.5 text-[15px] font-semibold leading-snug text-foreground">
          {signals.map((e, i) => (
            <Fragment key={i}>
              {i > 0 && "; "}
              {e.signal} <Cited text={`[${e.source}]`} sources={sources} />
            </Fragment>
          ))}
        </p>
      ) : (
        <p className="mt-1.5 text-[15px] text-[#6B7080]">Nothing in the sources yet.</p>
      )}
      {quote && (
        <p className="mt-2 flex gap-2 text-sm leading-relaxed text-[#4A4F63]">
          <Quote size={13} className="mt-1 shrink-0 text-muted-foreground" aria-hidden />
          <span className="italic">{quote}</span>
        </p>
      )}
      <dl className="mt-3 grid gap-2.5">
        {(
          [
            ["Clock to test", side.clock],
            ["Buyer to start with", side.buyer],
          ] as const
        ).map(([term, value]) => (
          <div key={term}>
            <dt className={labelCls}>{term}</dt>
            <dd className="mt-0.5 text-[15px] leading-relaxed text-foreground">
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
  if (!motion?.label || !(motion.label in MOTION_SUMMARY)) return null;
  const sources = sourcesOf(research);
  const live = (["internal", "embedded"] as const).filter((id) => motion[id]?.sources?.length > 0);
  if (live.length === 2 && fit?.motion === "Embedded") live.reverse();
  const shown = motion.label === "Unclear" ? (["internal", "embedded"] as const) : live;
  const missing = motion.label === "Internal" ? "embedded" : motion.label === "Embedded" ? "internal" : null;
  return (
    <section aria-label="Motion">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Eyebrow>Motion</Eyebrow>
        <MotionBadge label={motion.label} />
        <p className="text-[15px] text-[#4A4F63]">{MOTION_SUMMARY[motion.label]}</p>
      </div>
      <div className={cx("mt-4 grid gap-5", shown.length === 2 && "sm:grid-cols-2 sm:gap-8")}>
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
        <p className="mt-3 text-sm text-[#4A4F63]">
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
    <div className="space-y-2 text-[15px] leading-relaxed text-foreground">
      {body.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <div key={i} className="h-2" aria-hidden />;
        const h = HEADING.exec(line);
        if (h && /[A-Z]{3,}/.test(h[1])) {
          return (
            <h4 key={i} className="pt-3 font-mono text-[13px] font-medium tracking-[0.06em] text-muted-foreground">
              {h[1]}
              {h[2] ? <span className="ml-2 font-sans text-[15px] font-semibold tracking-normal text-foreground">{h[2]}</span> : null}
            </h4>
          );
        }
        // "- Warehouse: Snowflake (Confirmed [3])", "- AI: Cortex (Inferred). why", "- BI tools: Not found"
        const stack = /^- ([^:]+): (.*)$/.exec(line);
        if (stack) {
          const tagged = /^(.*?) \((Confirmed|Inferred|Former)(?:: moved off it)?((?: \[[\d, ]+\])?)\)(.*)$/.exec(stack[2]);
          const notFound = stack[2] === "Not found";
          const why = tagged?.[4].replace(/^[.\s]+/, "");
          return (
            <p key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-foreground">{stack[1]}:</span>
              {tagged ? (
                <>
                  <span>{tagged[1]}</span>
                  {tagged[3] && <Cited text={tagged[3].trim()} sources={sources} />}
                  <StatusTag status={tagged[2]} />
                  {why && (
                    <span className="basis-full text-sm text-[#4A4F63] sm:basis-auto">
                      <Cited text={why} sources={sources} />
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
            <p key={i}>
              <span className="font-semibold text-foreground">{perMotion[1]}:</span> <Cited text={perMotion[2]} sources={sources} />
            </p>
          );
        }
        const numbered = /^(\d+)\. (.*)$/.exec(line);
        if (numbered) {
          return (
            <p key={i} className="flex gap-3">
              <span className="w-5 shrink-0 text-right font-mono text-sm font-semibold leading-relaxed text-muted-foreground">{numbered[1]}</span>
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
    <section aria-labelledby="plan-title" className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <Eyebrow>First-call plan</Eyebrow>
          <h3 id="plan-title" className="mt-1 font-display text-2xl font-bold tracking-[-0.01em] text-foreground">
            {company}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FitGrade fit={brief.fit} />
          <button type="button" onClick={copy} className={secondaryBtn}>
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="space-y-5 px-4 py-5 sm:px-6">
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
    <section aria-labelledby="stack-title" className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h3 id="stack-title" className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Stack read
        </h3>
        <p className="mt-0.5 text-sm text-[#4A4F63]">Confirmed lines are checked in code: the cited source must name the tool and the company.</p>
      </div>
      <ul className="divide-y divide-border">
        {lines.map((l, i) => (
          <li key={i} className="px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <span className={cx(labelCls, "w-full sm:w-40")}>{l.name}</span>
              <span className="text-[15px] font-semibold text-foreground">{l.tool || "—"}</span>
              <StatusTag status={l.status} />
              {Array.isArray(l.sources) && l.sources.length > 0 && <Cited text={`[${l.sources.join(", ")}]`} sources={sources} />}
            </div>
            {l.evidence ? (
              <p className="mt-1.5 flex gap-2 text-sm leading-relaxed text-[#4A4F63] sm:pl-[10.6rem]">
                <Quote size={13} className="mt-1 shrink-0 text-muted-foreground" aria-hidden />
                <span className="italic">{l.evidence}</span>
              </p>
            ) : l.status !== "Not found" && l.description ? (
              <p className="mt-1 text-sm leading-relaxed text-[#4A4F63] sm:pl-[10.6rem]">
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
    <section aria-labelledby="research-title">
      <h3 id="research-title" className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        The research behind the plan
      </h3>
      <div className="mt-4 grid gap-x-10 gap-y-6 lg:grid-cols-2">
        {SECTION_KEYS.map((key) => {
          const value = brief[key];
          if (typeof value !== "string" || !value.trim()) return null;
          return (
            <div key={key} className="border-t border-border pt-3">
              <h4 className="font-display text-[17px] font-semibold text-foreground">{sectionLabel("account", key, key)}</h4>
              <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-foreground">
                <Cited text={value} sources={sources} />
              </p>
              {key === "target_customer" && people.length > 0 && (
                <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-sm text-[#4A4F63]">
                  <Users size={13} aria-hidden />
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
