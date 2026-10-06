import { useState } from "react";
import { Check, Copy, FileText, Quote, Users } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SourcesList, { type ResearchSource } from "@/components/simulator/SourcesList";
import { AccountSections, Cited, MotionPanel, ScanCard, type AccountBrief } from "../AccountViews";
import { StackMap } from "./StackMap";
import { monthLabel, stripMarks, whyNowItems } from "./model";

/**
 * The First-call plan as tabs, drawn from the brief's fields (so nothing is
 * cut mid-sentence). "Copy plan" copies the plan text.
 */
export function PlanTabs({ company, plan, brief, sources }: { company: string; plan: string | null; brief: AccountBrief; sources: ResearchSource[] }) {
  const [copied, setCopied] = useState(false);
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

  return (
    <section aria-labelledby="plan-tabs-title" className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="plan-tabs-title" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
          <FileText size={18} className="text-primary" aria-hidden /> The first-call plan
        </h3>
        {plan && (
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copied ? <Check size={14} className="text-primary" aria-hidden /> : <Copy size={14} aria-hidden />}
            {copied ? "Copied" : "Copy plan"}
          </button>
        )}
      </div>
      <Tabs defaultValue="call" className="mt-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto p-1">
          <TabsTrigger value="call" className="text-sm">First call</TabsTrigger>
          <TabsTrigger value="stack" className="text-sm">Stack</TabsTrigger>
          <TabsTrigger value="now" className="text-sm">Why now</TabsTrigger>
          <TabsTrigger value="objection" className="text-sm">{onList ? "Expansion risk" : "Objection"}</TabsTrigger>
          <TabsTrigger value="research" className="text-sm">Research</TabsTrigger>
          <TabsTrigger value="sources" className="text-sm">Sources ({live})</TabsTrigger>
        </TabsList>

        <TabsContent value="call" className="mt-4 space-y-5">
          <MotionPanel motion={brief.motion} fit={brief.fit} research={brief.research} />
          {(brief.start_with?.role || brief.start_with?.why) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Who to start with</p>
              <p className="mt-1 text-[15px] leading-relaxed text-foreground">
                {brief.start_with?.role && <span className="font-semibold">{brief.start_with.role.replace(/[.\s]+$/, "")}. </span>}
                <Cited text={brief.start_with?.why} sources={sources} />
              </p>
              {people.length > 0 && (
                <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                  <Users size={13} className="text-primary" aria-hidden />
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
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {questions.length === 7 ? "Seven discovery questions" : `${questions.length} discovery questions`}
              </p>
              <ol className="mt-2 grid gap-2 md:grid-cols-2">
                {questions.map((q, i) => (
                  <li key={i} className="flex gap-2.5 rounded-lg border border-border bg-surface-elevated p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">{i + 1}</span>
                    <span className="text-[15px] leading-snug text-foreground">
                      <Cited text={q} sources={sources} />
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {perMotion.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">One question per motion</p>
              <ul className="mt-2 space-y-1.5 text-[15px] leading-snug text-foreground">
                {perMotion.map((x) => (
                  <li key={x.id}>
                    <span className="font-semibold">{x.id === "internal" ? "Internal" : "Embedded"}:</span> <Cited text={x.q} sources={sources} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stack" className="mt-4 space-y-4">
          <StackMap lines={brief.core_features} motion={brief.motion} sources={sources} />
          <ScanCard scan={brief.research?.scan} company={company} />
        </TabsContent>

        <TabsContent value="now" className="mt-4">
          {whyNow.length ? (
            <ol className="relative space-y-4 border-l-2 border-primary/20 pl-5">
              {whyNow.map((w, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[1.6rem] top-1.5 h-3 w-3 rounded-full border-2 border-card bg-primary" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{w.date ? monthLabel(w.date) : "Date not found"}</p>
                  <p className="mt-0.5 text-[15px] leading-relaxed text-foreground">
                    <Cited text={w.text} sources={sources} />
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No dated trigger events in the sources. Ask what&rsquo;s changing this year.</p>
          )}
        </TabsContent>

        <TabsContent value="objection" className="mt-4">
          {objection.objection ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{onList ? "The risk to expanding" : "They'll say"}</p>
                <p className="mt-1.5 flex gap-2 text-[15px] leading-relaxed text-foreground">
                  <Quote size={15} className="mt-1 shrink-0 text-primary/60" aria-hidden />
                  <span className="italic">
                    <Cited text={stripMarks(objection.objection)} sources={sources} />
                  </span>
                </p>
              </div>
              {objection.honest_answer && (
                <div className="rounded-lg border border-primary/25 bg-accent/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Honest answer</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-foreground">
                    <Cited text={objection.honest_answer} sources={sources} />
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No objection was written for this run.</p>
          )}
        </TabsContent>

        <TabsContent value="research" className="mt-4">
          <AccountSections brief={brief} />
        </TabsContent>

        <TabsContent value="sources" className="mt-4 space-y-4">
          <SourcesList research={brief.research} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
