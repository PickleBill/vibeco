import { useState } from "react";
import { Check, Copy, Quote, Users } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copyToClipboard";
import SourcesList, { type ResearchSource } from "@/components/simulator/SourcesList";
import { cx } from "@/components/territory/style";
import { Eyebrow, Sheet, WorkbookTabs } from "@/components/territory/ui";
import { AccountSections, Cited, MotionPanel, ScanCard, type AccountBrief } from "../AccountViews";
import { label, secondaryBtn, title } from "./look";
import { StackMap } from "./StackMap";
import { monthLabel, stripMarks, whyNowItems } from "./model";

type Tab = "call" | "stack" | "now" | "objection" | "research" | "sources";

/** A numbered square, as the plan's lists use it. */
const Num = ({ n }: { n: number }) => (
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-foreground font-mono text-[13px] font-semibold text-foreground">{n}</span>
);

/**
 * The First-call plan as workbook tabs, drawn from the brief's fields (so
 * nothing is cut mid-sentence). "Copy plan" copies the plan text.
 */
export function PlanTabs({ company, plan, brief, sources }: { company: string; plan: string | null; brief: AccountBrief; sources: ResearchSource[] }) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>("call");
  const onList = !!brief.customer_list?.on_list;
  const copy = async () => {
    if (plan && (await copyToClipboard(plan))) {
      setCopied(true);
      toast.success("Plan copied");
      window.setTimeout(() => setCopied(false), 2000);
    } else toast.error("Couldn't copy.");
  };
  const questions = (brief.discovery_questions ?? []).filter(Boolean);
  const perMotion = brief.motion
    ? (["internal", "embedded"] as const).map((id) => ({ id, q: brief.motion![id]?.question })).filter((x) => x.q)
    : [];
  const people = Array.isArray(brief.people) ? brief.people : [];
  const whyNow = whyNowItems(brief.revenue_model);
  const objection = brief.migration_objection ?? {};
  const live = sources.filter((s) => !s.off_topic).length;
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "call", label: "First call" },
    { id: "stack", label: "Stack" },
    { id: "now", label: "Why now" },
    { id: "objection", label: onList ? "Expansion risk" : "Objection" },
    { id: "research", label: "Research" },
    { id: "sources", label: "Sources", count: live },
  ];

  return (
    <section aria-labelledby="plan-tabs-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Seller only · {company}</Eyebrow>
          <h3 id="plan-tabs-title" className={cx(title, "mt-1")}>
            The first-call plan
          </h3>
        </div>
        {plan && (
          <button type="button" onClick={copy} className={secondaryBtn}>
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            {copied ? "Copied" : "Copy plan"}
          </button>
        )}
      </div>

      <div className="mt-4">
        <WorkbookTabs<Tab> tabs={tabs} value={tab} onChange={setTab} label="The first-call plan" />
        <Sheet>
          <div role="tabpanel" aria-label={tabs.find((t) => t.id === tab)?.label}>
            {tab === "call" && (
              <div className="space-y-7">
                <MotionPanel motion={brief.motion} fit={brief.fit} research={brief.research} />
                {(brief.start_with?.role || brief.start_with?.why) && (
                  <div className="border-t border-border pt-5">
                    <p className={label}>Who to start with</p>
                    <p className="mt-1.5 max-w-4xl text-base leading-relaxed text-foreground">
                      {brief.start_with?.role && <span className="font-semibold">{brief.start_with.role.replace(/[.\s]+$/, "")}. </span>}
                      <Cited text={brief.start_with?.why} sources={sources} />
                    </p>
                    {people.length > 0 && (
                      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[15px] text-[#4A4F63]">
                        <Users size={14} aria-hidden />
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
                )}
                {questions.length > 0 && (
                  <div className="border-t border-border pt-5">
                    <p className={label}>{questions.length === 7 ? "Seven discovery questions" : `${questions.length} discovery questions`}</p>
                    <ol className="mt-3 grid gap-x-8 gap-y-3 md:grid-cols-2">
                      {questions.map((q, i) => (
                        <li key={i} className="flex gap-3 border-b border-border pb-3">
                          <Num n={i + 1} />
                          <span className="text-[15px] leading-relaxed text-foreground">
                            <Cited text={q} sources={sources} />
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {perMotion.length > 0 && (
                  <div className="border-t border-border pt-5">
                    <p className={label}>One question per motion</p>
                    <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-foreground">
                      {perMotion.map((x) => (
                        <li key={x.id}>
                          <span className="font-semibold">{x.id === "internal" ? "Internal" : "Embedded"}:</span> <Cited text={x.q} sources={sources} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {tab === "stack" && (
              <div className="space-y-6">
                <StackMap lines={brief.core_features} motion={brief.motion} sources={sources} />
                <ScanCard scan={brief.research?.scan} company={company} />
              </div>
            )}

            {tab === "now" &&
              (whyNow.length ? (
                <ol className="divide-y divide-border border-y border-border">
                  {whyNow.map((w, i) => (
                    <li key={i} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-5">
                      <span className={cx("w-28 shrink-0 font-mono text-[13px] font-semibold", w.date ? "text-foreground" : "text-[#6B7080]")}>
                        {w.date ? monthLabel(w.date) : "Date not found"}
                      </span>
                      <span className="text-[15px] leading-relaxed text-foreground">
                        <Cited text={w.text} sources={sources} />
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rounded-xl border border-dotted border-[#9097A6] px-4 py-3 text-[15px] text-[#4A4F63]">
                  No dated trigger events in the sources. Ask what&rsquo;s changing this year.
                </p>
              ))}

            {tab === "objection" &&
              (objection.objection ? (
                <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
                  <div>
                    <p className={label}>{onList ? "The risk to expanding" : "They'll say"}</p>
                    <p className="mt-2 flex gap-2.5 font-display text-lg font-semibold leading-snug text-foreground">
                      <Quote size={17} className="mt-1 shrink-0 text-muted-foreground" aria-hidden />
                      <span>
                        <Cited text={stripMarks(objection.objection)} sources={sources} />
                      </span>
                    </p>
                  </div>
                  {objection.honest_answer && (
                    <div className="border-l-4 border-foreground pl-4">
                      <p className={label}>Honest answer</p>
                      <p className="mt-2 text-base leading-relaxed text-foreground">
                        <Cited text={objection.honest_answer} sources={sources} />
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-dotted border-[#9097A6] px-4 py-3 text-[15px] text-[#4A4F63]">No objection was written for this run.</p>
              ))}

            {tab === "research" && <AccountSections brief={brief} />}

            {tab === "sources" && <SourcesList research={brief.research} />}
          </div>
        </Sheet>
      </div>
    </section>
  );
}
