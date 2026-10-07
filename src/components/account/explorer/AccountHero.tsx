import type { ResearchSource } from "@/components/simulator/SourcesList";
import { cx } from "@/components/territory/style";
import { Eyebrow, FieldPill } from "@/components/territory/ui";
import { Cited, GradeBox, type AccountBrief } from "../AccountViews";
import { label } from "./look";
import { monthLabel, stripMarks, whyNowItems } from "./model";

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

/**
 * The answer first: who the account is to this seller, which way they'd sell,
 * how good the fit is, why now, and the one question to open with.
 */
export function AccountHero({
  company,
  domain,
  brief,
  sources,
  sellerName,
}: {
  company: string;
  domain?: string;
  brief: AccountBrief;
  sources: ResearchSource[];
  sellerName?: string;
}) {
  const motion = brief.motion;
  const graded = brief.fit?.motion === "Embedded" ? "embedded" : "internal";
  const opener = stripMarks(motion?.[graded]?.question || brief.discovery_questions?.[0] || "");
  // Dated triggers first; undated ones only when nothing is dated.
  const items = whyNowItems(brief.revenue_model);
  const dated = items.filter((w) => w.date);
  const whyNow = (dated.length ? dated : items).slice(0, dated.length ? 3 : 2);
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

        {whyNow.length > 0 && (
          <div className="mt-5">
            <p className={label}>Why now</p>
            <ul className="mt-1.5 divide-y divide-border border-y border-border" aria-label="Why now">
              {whyNow.map((w, i) => (
                <li key={i} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
                  <span className={cx("w-24 shrink-0 font-mono text-[13px] font-semibold", w.date ? "text-foreground" : "text-[#6B7080]")}>
                    {w.date ? monthLabel(w.date) : "Undated"}
                  </span>
                  <span className="min-w-0 text-[15px] leading-relaxed text-foreground">
                    <Cited text={w.text} sources={sources} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

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
