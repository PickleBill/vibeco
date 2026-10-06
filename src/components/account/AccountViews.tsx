import { Fragment, useState } from "react";
import { Check, Copy, FileText, Quote, Users } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { SEATS, criticFor, distillLabel, sectionLabel, type StackFeature } from "@/lib/lenses";
import type { BriefResearch, ResearchSource } from "@/components/simulator/SourcesList";

// ─── Shapes (set by supabase/functions/_shared/agents/account.ts) ───

export interface CustomerList {
  on_list: boolean;
  listed_as?: string;
  source?: string;
  ambiguous?: boolean;
  sentence: string;
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
  fit?: { grade?: string; reason?: string };
  customer_list?: CustomerList;
}

export interface CriticResult {
  persona: string;
  headline?: string;
  perspective?: string;
}

export interface AccountAnalysis {
  perspectives?: CriticResult[];
  distillation?: Record<string, unknown> | null;
  synthesis?: { executive_summary?: string } | null;
}

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

// ─── Badges ───

const TAG_STYLE: Record<string, string> = {
  Confirmed: "border-emerald-600/30 bg-emerald-50 text-emerald-800",
  Inferred: "border-amber-500/40 bg-amber-50 text-amber-800",
  "Not found": "border-border bg-muted text-muted-foreground",
};

export function StatusTag({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <span className={`inline-flex shrink-0 items-center rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${TAG_STYLE[status] ?? TAG_STYLE["Not found"]}`}>
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
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Fit</span>
      <span className="font-display text-lg font-bold leading-none text-primary">{fit.grade}</span>
    </div>
  );
}

// ─── First-call plan ───

/** Section headings in the composed plan are upper case: "WHY NOW", "FIT GRADE: B". */
const HEADING = /^([A-Z0-9][A-Z0-9 '-]{3,})(?::\s*(.*))?$/;

function PlanBody({ plan, sources }: { plan: string; sources: ResearchSource[] }) {
  const lines = plan.split("\n");
  // The first line ("FIRST-CALL PLAN: Company") is the card's title.
  const body = /^FIRST-CALL PLAN/.test(lines[0] ?? "") ? lines.slice(1) : lines;
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
          const tagged = /^(.*?) \((Confirmed|Inferred)((?: \[[\d, ]+\])?)\)(.*)$/.exec(stack[2]);
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
        <PlanBody plan={plan} sources={sources} />
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

// ─── Critics and the boiled-down version ───

/** Critic text arrives as markdown: drop the "## …'s Take" heading (the card has the seat) and the markup. */
function plainCritic(text: string): string {
  return text
    .replace(/^\s*#{1,6}\s[^\n]*\n+/, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();
}

function CriticCard({ critic }: { critic: CriticResult }) {
  const [open, setOpen] = useState(false);
  const seat = criticFor("account", critic.persona);
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{seat?.name ?? critic.persona}</p>
      {seat && <p className="text-xs text-muted-foreground">{seat.tagline}</p>}
      {critic.headline && <h4 className="mt-2 font-display text-base font-bold leading-snug text-foreground">{plainCritic(critic.headline)}</h4>}
      {critic.perspective && (
        <>
          <p className={`mt-1.5 whitespace-pre-line text-sm leading-relaxed text-foreground/85 ${open ? "" : "line-clamp-4"}`}>
            {plainCritic(critic.perspective)}
          </p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-1 text-xs text-primary underline-offset-4 hover:underline"
          >
            {open ? "Show less" : "Read all"}
          </button>
        </>
      )}
    </article>
  );
}

export function CriticsPanel({ analysis }: { analysis?: AccountAnalysis | null }) {
  const perspectives = Array.isArray(analysis?.perspectives) ? analysis!.perspectives : [];
  const ordered = SEATS.map((seat) => perspectives.find((p) => p.persona === seat)).filter(Boolean) as CriticResult[];
  const d = (analysis?.distillation ?? null) as Record<string, unknown> | null;
  const distilled = (["one_feature", "one_customer", "one_revenue"] as const)
    .map((k) => ({ label: distillLabel("account", k, k), value: typeof d?.[k] === "string" ? (d[k] as string) : "" }))
    .filter((x) => x.value);
  if (!ordered.length && !distilled.length) return null;
  return (
    <>
      {distilled.length > 0 && (
        <section aria-labelledby="distill-title" className="space-y-3">
          <h3 id="distill-title" className="font-display text-lg font-bold text-foreground">
            Boiled down
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {distilled.map((x) => (
              <div key={x.label} className="rounded-lg border border-primary/25 bg-accent/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{x.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{x.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      {ordered.length > 0 && (
        <section aria-labelledby="critics-title" className="space-y-3">
          <div>
            <h3 id="critics-title" className="font-display text-lg font-bold text-foreground">
              Five seats at the table
            </h3>
            <p className="text-xs text-muted-foreground">Synthetic perspectives written from the brief, not real people or quotes.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ordered.map((c) => (
              <CriticCard key={c.persona} critic={c} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
