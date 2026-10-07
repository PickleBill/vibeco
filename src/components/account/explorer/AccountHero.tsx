import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { ReadMore } from "@/components/territory/Memo";
import type { ThreeWhys } from "@/components/territory/qualification/model";
import { cx } from "@/components/territory/style";
import { EvidenceTag, Eyebrow, FieldPill } from "@/components/territory/ui";
import { Cited, GradeBox, type AccountBrief } from "../AccountViews";
import { label } from "./look";
import { monthLabel, stripMarks } from "./model";

/** The fit grade, the motion it's for, and what it means (evidence and timing, not deal size). */
function Fit({ fit }: { fit?: AccountBrief["fit"] }) {
  if (!fit?.grade) return null;
  const forMotion = fit.motion === "Internal" || fit.motion === "Embedded" ? `for the ${fit.motion.toLowerCase()} motion` : "motion unclear";
  return (
    <div className="flex items-center gap-3" title={`Fit ${fit.grade}, ${forMotion}: how strong the evidence and the timing are. Not deal size.`}>
      <GradeBox grade={fit.grade} size="lg" />
      <span className="text-sm leading-snug text-[#4A4F63]">
        <span className="block text-[15px] font-semibold text-foreground">Fit {forMotion}</span>
        Evidence and timing, not deal size
      </span>
    </div>
  );
}

/** One of the three whys: a label, its evidence tag, and the text clamped to three lines. */
function Why({ title, tag, children }: { title: string; tag?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-background px-4 py-3.5">
      <p className="flex flex-wrap items-center justify-between gap-2">
        <span className={label}>{title}</span>
        {tag && <EvidenceTag status={tag} className="h-6" />}
      </p>
      {children}
    </div>
  );
}

const pendingLine = (
  <p className="flex items-center gap-2 text-[15px] text-[#4A4F63]">
    <Loader2 size={14} className="motion-safe:animate-spin text-foreground" aria-hidden /> Fills in when the agents finish
  </p>
);

/**
 * Why change, why now, why the seller: the pain and the seller's thesis are
 * hypotheses from the agents (and the simulated meeting, once it has run);
 * why now is the freshest dated trigger, verified by its source.
 */
function WhyStrip({ whys, pending, sellerName, sources }: { whys: ThreeWhys; pending?: boolean; sellerName?: string; sources: ResearchSource[] }) {
  const cells: ReactNode[] = [];
  if (whys.change || pending)
    cells.push(
      <Why key="change" title="Why change" tag={whys.change ? "Hypothesis" : undefined}>
        {whys.change ? (
          <ReadMore lines={3} className="text-[15px] leading-relaxed text-foreground">
            <Cited text={whys.change} sources={sources} />
          </ReadMore>
        ) : (
          pendingLine
        )}
      </Why>,
    );
  cells.push(
    <Why key="now" title="Why now" tag={whys.now ? "Verified" : undefined}>
      {whys.now ? (
        <ReadMore lines={3} className="text-[15px] leading-relaxed text-foreground">
          <span className="mr-1.5 font-mono text-[13px] font-semibold">{monthLabel(whys.now.date)}</span>
          <Cited text={whys.now.text} sources={sources} />
        </ReadMore>
      ) : (
        <p className="text-[15px] text-[#4A4F63]">No dated trigger in the sources. Ask what&rsquo;s changing this year.</p>
      )}
    </Why>,
  );
  if (whys.omni || pending)
    cells.push(
      <Why key="seller" title={`Why ${sellerName || "us"}`} tag={whys.omni ? "Hypothesis" : undefined}>
        {whys.omni ? (
          <ReadMore lines={3} className="text-[15px] leading-relaxed text-foreground">
            <Cited text={whys.omni} sources={sources} />
          </ReadMore>
        ) : (
          pendingLine
        )}
      </Why>,
    );
  return (
    <div data-tour="whys" className={cx("mt-5 grid gap-3", cells.length === 3 ? "md:grid-cols-3" : cells.length === 2 ? "md:grid-cols-2" : "")}>
      {cells}
    </div>
  );
}

/**
 * The answer first: who the account is to this seller, which way they'd sell,
 * how good the fit is, the three whys, and the one question to open with.
 */
export function AccountHero({
  company,
  domain,
  brief,
  sources,
  sellerName,
  whys,
  whysPending,
}: {
  company: string;
  domain?: string;
  brief: AccountBrief;
  sources: ResearchSource[];
  sellerName?: string;
  whys: ThreeWhys;
  /** The agents are still writing change and the seller's why. */
  whysPending?: boolean;
}) {
  const motion = brief.motion;
  const graded = brief.fit?.motion === "Embedded" ? "embedded" : "internal";
  const opener = stripMarks(motion?.[graded]?.question || brief.discovery_questions?.[0] || "");
  const list = brief.customer_list;
  const role = (brief.start_with?.role ?? "").replace(/[.\s]+$/, "");
  return (
    <section aria-labelledby="hero-title" className="overflow-hidden rounded-xl border border-foreground bg-card">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-border bg-muted px-4 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <Eyebrow>First-call plan{sellerName ? ` · for ${/^[aeiou]/i.test(sellerName) ? "an" : "a"} ${sellerName} seller` : ""}</Eyebrow>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="hero-title" className="font-display text-[2rem] font-bold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
              {company}
            </h2>
            {domain && <span className="font-mono text-sm text-[#4A4F63]">{domain}</span>}
          </div>
          {(motion?.label || (list && sellerName)) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {motion?.label && <FieldPill>Motion: {motion.label}</FieldPill>}
              {list && sellerName && (
                <FieldPill glyph={list.on_list ? "✓" : "○"}>
                  {list.on_list ? `On ${sellerName}'s public customer list` : `Not on ${sellerName}'s public customer list`}
                </FieldPill>
              )}
            </div>
          )}
        </div>
        <Fit fit={brief.fit} />
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        {brief.account_line && (
          <p className="max-w-4xl text-lg leading-relaxed text-foreground sm:text-xl sm:leading-relaxed">
            <Cited text={brief.account_line} sources={sources} />
          </p>
        )}

        <WhyStrip whys={whys} pending={whysPending} sellerName={sellerName} sources={sources} />

        {(opener || role) && (
          <div className="mt-5 grid gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
            {opener && (
              <div className="rounded-xl border border-border bg-background px-4 py-3.5">
                <p className={label}>Open with</p>
                <p className="mt-1 font-display text-[17px] font-semibold leading-snug text-foreground sm:text-lg">
                  &ldquo;
                  <Cited text={opener} sources={sources} />
                  &rdquo;
                </p>
              </div>
            )}
            {role && (
              <div className="px-1 lg:border-l lg:border-border lg:py-3.5 lg:pl-6">
                <p className={label}>Start with</p>
                <p className="mt-1 text-[15px] font-semibold leading-snug text-foreground">
                  <Cited text={role} sources={sources} />
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
