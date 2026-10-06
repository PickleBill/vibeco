import { CalendarClock, MessageSquareQuote, UserRound } from "lucide-react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { Cited, MotionBadge, type AccountBrief } from "../AccountViews";
import { monthLabel, stripMarks, whyNowItems } from "./model";

/** The fit grade, the motion it's for, and what it means (evidence and timing, not deal size). */
function Fit({ fit }: { fit?: AccountBrief["fit"] }) {
  if (!fit?.grade) return null;
  const forMotion = fit.motion === "Internal" || fit.motion === "Embedded" ? `for the ${fit.motion.toLowerCase()} motion` : "motion unclear";
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-elevated px-3 py-2"
      title={`Fit ${fit.grade}, ${forMotion}: how strong the evidence and the timing are. Not deal size.`}
    >
      <span className="font-display text-3xl font-bold leading-none text-primary">{fit.grade}</span>
      <span className="text-xs leading-tight text-muted-foreground">
        <span className="block font-semibold uppercase tracking-[0.12em] text-foreground">Fit {forMotion}</span>
        Evidence and timing, not deal size
      </span>
    </div>
  );
}

/**
 * The answer first: who the account is to this seller, which way they'd sell,
 * how good the fit is, why now, and the one question to open with.
 */
export function AccountHero({ company, brief, sources, sellerName }: { company: string; brief: AccountBrief; sources: ResearchSource[]; sellerName?: string }) {
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
    <section aria-labelledby="hero-title" className="rounded-xl border border-primary/25 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">First-call plan{sellerName ? ` · for ${/^[aeiou]/i.test(sellerName) ? "an" : "a"} ${sellerName} seller` : ""}</p>
          <h2 id="hero-title" className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {company}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {motion?.label && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Motion <MotionBadge label={motion.label} />
              </span>
            )}
            {list && sellerName && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  list.on_list ? "border-primary/40 bg-accent text-primary" : "border-border bg-muted/60 text-foreground/80"
                }`}
              >
                {list.on_list ? `On ${sellerName}'s public customer list` : `Not on ${sellerName}'s public customer list`}
              </span>
            )}
          </div>
        </div>
        <Fit fit={brief.fit} />
      </div>

      {brief.account_line && (
        <p className="mt-4 text-lg leading-relaxed text-foreground">
          <Cited text={brief.account_line} sources={sources} />
        </p>
      )}

      {whyNow.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Why now">
          {whyNow.map((w, i) => (
            <li key={i} className="flex max-w-full items-start gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-sm text-foreground/90">
              <CalendarClock size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0">
                <span className="font-semibold text-foreground">{w.date ? monthLabel(w.date) : "Undated"}</span>{" "}
                <span className="line-clamp-2 inline">
                  <Cited text={w.text} sources={sources} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {(opener || role) && (
        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          {opener && (
            <p className="flex gap-2 rounded-lg border border-primary/25 bg-accent/50 px-3 py-2.5 text-[15px] leading-snug text-foreground">
              <MessageSquareQuote size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="font-semibold">Open with: </span>
                <Cited text={opener} sources={sources} />
              </span>
            </p>
          )}
          {role && (
            <p className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground">
              <UserRound size={15} className="shrink-0 text-primary" aria-hidden />
              <span>
                <span className="font-semibold">Start with: </span>
                <Cited text={role} sources={sources} />
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
