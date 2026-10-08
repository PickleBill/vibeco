import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { AGENTS, relabelSeats, teaserFor } from "@/components/account/explorer/model";
import { ranAt } from "@/components/account/explorer/savedRuns";
import { CompanyName } from "../company/CompanyName";
import { OMNI_TEXT, omniLines } from "../model";
import { moduleHref } from "../nav";
import { cx, primaryButton, secondaryButton } from "../style";
import { EvidenceTag, FieldPill, FitBadge, HqLine } from "../ui";
import { dayLabel } from "./evidence";
import { MOTION_LINE, motionSources, shortText, type RadarAccount } from "./model";
import { Chips } from "./pieces";
import { OmniRing, SegmentTag } from "./segments";

interface Claim {
  key: string;
  /** An evidence tag, or a date for a dated event (not a tag: why-now lines aren't checked like stack lines). */
  status?: string;
  date?: string;
  text: string;
  sources: number[];
}

/** 3 to 5 claims: the trigger, the stack a source backs (then inferred lines), the motion. */
function claimsFor(a: RadarAccount): Claim[] {
  const out: Claim[] = [];
  if (a.trigger) out.push({ key: "why", date: dayLabel(a.trigger.date), text: `Why now: ${a.trigger.text}`, sources: a.trigger.sources });
  const inferred = a.row.stack.filter((s) => s.status === "Inferred" && s.sources.length);
  for (const s of [...a.stack, ...inferred].slice(0, 3)) {
    out.push({ key: `${s.category}-${s.tool}`, status: s.status, text: `${s.category}: ${s.tool}`, sources: s.sources });
  }
  out.push({ key: "motion", status: "Inferred", text: `Motion: ${a.row.motion} (${MOTION_LINE[a.row.motion]})`, sources: motionSources(a.row) });
  return out.slice(0, 5);
}

/**
 * One account up close, opened from a blip, a card or a row: who it is, what
 * a source backs, and the seven agents and verdict stored with its run.
 */
export function FocusPanel({
  account,
  seller,
  segmentNote,
  onClose,
}: {
  account: RadarAccount;
  seller: string;
  /** "5,000+ employees", for the account's segment. */
  segmentNote?: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { row } = account;
  const analysis = row.report.auto_analysis;
  const list = row.report.brief?.customer_list;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }, [row.id, reduce]);

  const agents = [
    ...AGENTS.map((a) => ({ id: a.id as string, name: a.name, teaser: account.redact(teaserFor(a.id, analysis)) })),
    { id: "verdict", name: "Verdict", teaser: account.redact(relabelSeats(analysis?.synthesis?.executive_summary ?? "").split(/(?<=[.!?])\s+/)[0] ?? "") },
  ];
  const done = agents.filter((a) => a.teaser).length;

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="focus-title"
      className="mb-6 scroll-mt-4 overflow-hidden rounded-xl border border-foreground bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-border bg-muted px-4 py-4 sm:px-[18px]">
        <h2 id="focus-title" className="font-display text-2xl font-bold tracking-[-0.01em]">
          <CompanyName row={row} seller={seller} />
        </h2>
        <HqLine hq={row.hq} />
        {row.segment && <SegmentTag segment={row.segment} note={segmentNote} />}
        <FieldPill>Motion: {row.motion}</FieldPill>
        <FitBadge grade={row.fit} />
        <span className={cx("inline-flex flex-wrap items-center gap-1.5 text-sm", row.omni === "None found" ? "text-[#4A4F63]" : "font-semibold text-foreground")}>
          <OmniRing status={row.omni} />
          {row.omni === "Confirmed" && list?.source ? (
            <a href={list.source} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {OMNI_TEXT.Confirmed.full}
            </a>
          ) : (
            <span>{OMNI_TEXT[row.omni].full}</span>
          )}
          {row.omni === "Likely" && <Chips ids={[...new Set(omniLines(row.stack).flatMap((s) => s.sources))].slice(0, 2)} sources={account.sources} />}
        </span>
        <span className="flex-1" />
        <button type="button" onClick={onClose} className={cx(secondaryButton, "min-h-10 border-[#D9D4C7] px-3.5 text-sm")}>
          <X size={15} aria-hidden /> Close<span className="sr-only"> {row.name}</span>
        </button>
      </div>

      <div className="grid gap-5 p-4 sm:p-[18px] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <ul aria-label={`What the sources say about ${row.name}`} className="flex min-w-0 flex-col">
          {claimsFor(account).map((c) => (
            <li key={c.key} className="flex flex-wrap items-center gap-2 border-b border-[#ECE8DE] py-2.5 last:border-b-0">
              {c.status ? (
                <EvidenceTag status={c.status} />
              ) : (
                <span className="inline-flex h-[26px] items-center rounded-[4px] border border-foreground px-2 font-mono text-xs font-semibold">{c.date}</span>
              )}
              <span className="min-w-0 flex-[1_1_220px] text-[15px]">{c.text}</span>
              <Chips ids={c.sources.slice(0, 3)} sources={account.sources} />
            </li>
          ))}
        </ul>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-bold">Account lens · 7 agents + Verdict</span>
            <span className="font-mono text-xs text-muted-foreground">synthetic</span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {agents.map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-sm">
                <span aria-hidden className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", a.teaser ? "bg-brand" : "bg-[#C9C4B6]")} />
                <span className="min-w-0">
                  <span className="font-semibold">{a.name}</span>
                  {a.teaser ? <span className="text-[#4A4F63]"> · {shortText(a.teaser, 110)}</span> : <span className="text-muted-foreground"> · not in this run</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-[#4A4F63]">
            {done >= agents.length
              ? `All seven agents finished${row.ranAt ? ` · ${ranAt(row.ranAt)}` : ""}. Verdict ready.`
              : done
                ? `${done} of ${agents.length} finished in this run.`
                : "The seven agents haven't run on this account yet."}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Link to={moduleHref(seller, "committee", row.id)} className={cx(primaryButton, "text-[15px]")}>
              Simulate the committee <ArrowRight size={16} aria-hidden />
            </Link>
            <Link to={moduleHref(seller, "deal", row.id)} className={cx(secondaryButton, "text-[15px]")}>
              Build a Deal Room brief
            </Link>
          </div>
          <Link to={moduleHref(seller, "account", row.id)} className="inline-flex min-h-11 items-center gap-1 self-start text-[15px] font-semibold text-primary hover:underline">
            Open the full run <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
