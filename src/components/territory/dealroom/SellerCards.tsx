// The seller's side of the Deal Room: the control bar, the share link, the
// account's answers as discovery notes, what they change in the plan, and the
// boundary (what the prospect never sees). Seller-only cards wear a dashed
// navy border, after the design's component sheet.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, EyeOff, Lock } from "lucide-react";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { criticFor } from "@/lib/lenses";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import type { SavedReport } from "@/components/account/explorer/savedRuns";
import { plainText } from "../model";
import { cx, primaryButton, secondaryButton } from "../style";
import { EvidenceTag, Eyebrow, FitBadge, SourceChip } from "../ui";
import { agoText, dateLabel, type Claim, type ClaimQuestion, type DiffRow, type DealResponse, type Responses } from "./claims";

export type DealView = "prospect" | "seller";

const sellerCard = "rounded-2xl border-2 border-dashed border-foreground bg-white p-4 sm:p-5";

/** The dark seller bar: never part of the shared page. */
export function SellerControl({ company, view, onView }: { company: string; view: DealView; onView: (v: DealView) => void }) {
  return (
    <div role="group" aria-label="Seller control, never shown to the prospect" className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-xl bg-foreground px-3 py-2.5 text-white">
      <span className="inline-flex items-center gap-2 text-sm font-semibold">
        <Lock size={14} aria-hidden /> Seller control · not shown to {company}
      </span>
      <span className="hidden flex-1 sm:block" />
      <div className="inline-flex gap-[3px] rounded-[10px] bg-[#2C3046] p-[3px]" role="group" aria-label="View">
        {(
          [
            { id: "prospect", label: "What the prospect sees" },
            { id: "seller", label: "Seller view" },
          ] as const
        ).map((v) => {
          const on = view === v.id;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={on}
              onClick={() => onView(v.id)}
              className={cx(
                "min-h-11 rounded-lg px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none",
                on ? "bg-white font-bold text-foreground" : "font-medium text-white hover:bg-white/10",
              )}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The link the account gets, with Copy and Open. */
export function SharePanel({ company, url }: { company: string; url: string }) {
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    const ok = await copyToClipboard(url);
    setCopied(ok ? "yes" : "no");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 2200);
  };
  return (
    <section aria-label={`Share link for ${company}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-white px-3 py-2.5 sm:px-4">
      <span className="text-sm font-semibold">Link for {company}</span>
      <code className="min-w-0 basis-full truncate font-mono text-[13px] text-[#4A4F63] sm:flex-1" title={url}>
        {url}
      </code>
      <span className="flex gap-2">
        <button type="button" onClick={copy} className={cx(primaryButton, "text-[15px]")}>
          {copied === "yes" ? "Copied" : copied === "no" ? "Copy failed" : "Copy link"}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className={cx(secondaryButton, "text-[15px]")}>
          Open <ArrowUpRight size={16} aria-hidden />
        </a>
      </span>
      <span className="sr-only" aria-live="polite">
        {copied === "yes" ? "Link copied" : copied === "no" ? "Couldn't copy the link" : ""}
      </span>
    </section>
  );
}

/** A phone-width frame around the prospect page (read-only preview). */
export function PhoneFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="mx-auto w-full max-w-[404px]">
      <div className="rounded-[30px] bg-foreground p-[7px] shadow-[0_12px_32px_-12px_rgba(26,29,46,0.45)]">
        <div role="region" aria-label={label} tabIndex={0} className="h-[700px] max-h-[78vh] overflow-y-auto rounded-[24px] bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── The account's answers as discovery notes ───

export function DiscoveryNotes({ claims, sources, responses }: { claims: Claim[]; sources: ResearchSource[]; responses: Responses }) {
  const byId = new Map(sources.map((s) => [Number(s.id), s]));
  return (
    <ol className="flex flex-col gap-3" aria-label="Claims and the account's answers">
      {claims.map((c) => {
        const r = responses[c.id];
        return (
          <li key={c.id} className={cx("rounded-xl border bg-white p-4", r?.answer === "fix" ? "border-primary" : "border-border")}>
            <p className="font-mono text-xs font-semibold text-muted-foreground">
              {c.num} · {c.section}
            </p>
            <p className={cx("mt-1 text-[17px] leading-snug", r?.answer === "fix" ? "text-muted-foreground line-through" : "font-medium")}>{c.text}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {c.status && <EvidenceTag status={c.status} />}
              {c.date && <span className="inline-flex h-[26px] items-center rounded-md border border-[#D9D4C7] bg-white px-2 font-mono text-xs font-medium">{dateLabel(c.date)}</span>}
              {c.sources.map((n) => (
                <SourceChip key={n} n={n} source={byId.get(n)} />
              ))}
            </div>
            <Note response={r} />
          </li>
        );
      })}
    </ol>
  );
}

function Note({ response: r }: { response?: DealResponse }) {
  const when = agoText(r?.at);
  const head = (
    <p className="font-mono text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
      Discovery note{when ? ` · ${when}` : ""}
    </p>
  );
  if (!r) return <p className="mt-3 border-t border-dashed border-border pt-3 text-[15px] text-muted-foreground">No answer yet.</p>;
  if (r.answer === "fix") {
    return (
      <div className="mt-3 rounded-lg border border-brand bg-brand-tint px-3 py-2.5">
        {head}
        <p className="mt-1 flex gap-2 text-[15px] font-semibold leading-snug">
          <span className="font-mono font-bold text-primary" aria-hidden>
            +
          </span>
          <span>Corrected: {r.text}</span>
        </p>
        {r.note && <p className="mt-1 pl-5 text-[15px] leading-snug text-[#4A4F63]">Note: {r.note}</p>}
      </div>
    );
  }
  return (
    <div className="mt-3 border-t border-border pt-3">
      {head}
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[15px]">
        {r.answer === "right" ? (
          <EvidenceTag status="Account" />
        ) : (
          <>
            <span className="inline-flex h-[26px] items-center rounded-[4px] border border-dotted border-[#9097A6] px-2 text-xs font-semibold text-[#4A4F63]">Not sure</span>
            <span>Ask on the call.</span>
          </>
        )}
      </div>
      {r.note && <p className="mt-1.5 text-[15px] leading-snug text-[#4A4F63]">Note: {r.note}</p>}
    </div>
  );
}

// ─── What the answers change ───

export function PlanDiffCard({ rows, company }: { rows: DiffRow[]; company: string }) {
  return (
    <section aria-labelledby="plan-diff-title" className={sellerCard}>
      <Eyebrow className="text-foreground">Seller only</Eyebrow>
      <h2 id="plan-diff-title" className="mt-1 font-display text-[22px] font-semibold leading-tight">
        The plan, before and after
      </h2>
      {!rows.length ? (
        <p className="mt-2 text-[15px] text-muted-foreground">No plan changes yet. Lines change here as {company} answers.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {rows.map((d) => (
            <li key={d.id} className="overflow-hidden rounded-[10px] border border-border text-[15px]">
              <p className="bg-muted px-3 py-1.5 font-mono text-xs font-semibold text-[#4A4F63]">
                {d.num} · {d.field}
              </p>
              <p className="flex gap-2.5 px-3 py-2 text-[#4A4F63]">
                <span className="font-mono font-semibold" aria-hidden>
                  −
                </span>
                <span className="sr-only">Before: </span>
                <span className="line-through">{d.before}</span>
              </p>
              <p className="flex gap-2.5 border-t border-brand/40 bg-brand-tint px-3 py-2">
                <span className="font-mono font-bold text-primary" aria-hidden>
                  +
                </span>
                <span className="sr-only">After: </span>
                <span className="font-semibold">{d.after}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function QuestionsCard({ answered, open }: { answered: ClaimQuestion[]; open: ClaimQuestion[] }) {
  return (
    <section aria-labelledby="answered-title" className={sellerCard}>
      <Eyebrow className="text-foreground">Seller only</Eyebrow>
      <h2 id="answered-title" className="mt-1 font-display text-[22px] font-semibold leading-tight">
        Questions now answered
      </h2>
      {!answered.length ? (
        <p className="mt-2 text-[15px] text-muted-foreground">None yet. Each claim the account marks right or fixes answers one.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2.5">
          {answered.map((q) => (
            <li key={q.id} className="flex gap-2.5 border-b border-border pb-2.5 last:border-b-0 last:pb-0">
              <span className="min-w-[26px] font-mono text-[13px] font-semibold text-primary">{q.num}</span>
              <span className="min-w-0 text-[15px] leading-snug">
                <span className="font-semibold">{q.question}</span>
                <span className={cx("mt-0.5 block", q.corrected ? "text-foreground" : "text-[#4A4F63]")}>{q.answer}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      {open.length > 0 && (
        <>
          <p className="mt-4 font-mono text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">Still open · ask on the call</p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {open.map((q) => (
              <li key={q.id} className="flex gap-2.5 text-[15px] leading-snug">
                <span className="min-w-[26px] font-mono text-[13px] font-semibold text-muted-foreground">{q.num}</span>
                {q.question}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// ─── The boundary ───

function Held({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="flex gap-2.5 py-2.5">
      <EyeOff size={16} aria-hidden className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 text-[15px] leading-snug">
        <p className="font-semibold">{label}</p>
        <div className="mt-0.5 text-[#4A4F63]">{children}</div>
      </div>
    </li>
  );
}

/** What stays with the seller: fit grade, critic takes, objections, the plan. Shown with the run's own values. */
export function BoundaryCard({ report }: { report: SavedReport }) {
  const b = report.brief;
  const critics = report.auto_analysis?.perspectives ?? [];
  const take = critics.find((p) => p.persona === "skeptic" && p.headline) ?? critics.find((p) => p.headline);
  const objection = plainText(b.migration_objection?.objection);
  const questions = Array.isArray(b.discovery_questions) ? b.discovery_questions.length : 0;
  return (
    <section aria-labelledby="boundary-title" className={sellerCard}>
      <p className="flex items-center gap-2 font-mono text-[13px] font-semibold uppercase tracking-[0.06em]">
        <Lock size={14} aria-hidden /> Seller only · never shared
      </p>
      <h2 id="boundary-title" className="mt-1 font-display text-[22px] font-semibold leading-tight">
        The prospect never sees
      </h2>
      <p className="mt-1 text-[15px] text-[#4A4F63]">Fit grade, critic takes, objections, your plan. The shared page shows the claims and their sources, nothing else.</p>
      <ul className="mt-2 divide-y divide-border">
        <Held label="Fit grade">
          {b.fit?.grade ? (
            <span className="flex items-start gap-2">
              <span className="shrink-0">
                <FitBadge grade={b.fit.grade} label={false} />
              </span>
              <span className="line-clamp-2">{plainText(b.fit.reason) || "Evidence and timing, not deal size."}</span>
            </span>
          ) : (
            "Not graded"
          )}
        </Held>
        <Held label="Critic takes">
          {take ? (
            <>
              <span className="line-clamp-2">“{plainText(take.headline)}”</span>
              <span className="font-mono text-xs text-muted-foreground">
                {criticFor("account", take.persona)?.name ?? take.persona} · synthetic · {critics.length} critics
              </span>
            </>
          ) : (
            "No critics ran on this account yet"
          )}
        </Held>
        <Held label="Objections">{objection ? <span className="line-clamp-2">“{objection}”</span> : "None written"}</Held>
        <Held label="Your plan">First-call plan, {questions ? `${questions} discovery questions` : "discovery questions"}, who to start with, and the people the sources name.</Held>
        <Held label="Also held back">The customer-list check, the three ways in (expand) and the one thing that matters (distill).</Held>
      </ul>
    </section>
  );
}
