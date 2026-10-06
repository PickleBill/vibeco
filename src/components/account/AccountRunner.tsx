import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ArrowRight, Check, Link2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { ensureSession } from "@/lib/ensureSession";
import { copyToClipboard } from "@/lib/copyToClipboard";
import type { SellerConfig } from "@/lib/sellers";
import SourcesList, { type BriefResearch } from "@/components/simulator/SourcesList";
import {
  AccountSections,
  CriticsPanel,
  PlanCard,
  ScanCard,
  StackTable,
  StatusTag,
  type AccountAnalysis,
  type AccountBrief,
} from "./AccountViews";

/**
 * Target-account express run: sources first, then the First-call plan, then
 * the five critics, with no clicks in between.
 *   1. simulate-idea {type: "research"}  → job-board scan + live web sources
 *   2. simulate-idea {type: "initial"}   → brief + plan, reusing those sources
 *   3. orchestrate                        → critics, boil-down, synthesis
 * The run is saved to idea_reports so it opens at /report/:id.
 */

type Step = "sources" | "plan" | "critics";
type Status = "idle" | "running" | "done" | "error";

const STEPS: { id: Step; label: string; typical: number }[] = [
  { id: "sources", label: "Live sources", typical: 6_000 },
  { id: "plan", label: "First-call plan", typical: 12_000 },
  { id: "critics", label: "Five critics", typical: 18_000 },
];

// "fast" puts Gemini 3 Flash first, with 2.5 Pro as the server's fallback.
const MODE = "fast";

class CallError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

async function callOnce<T>(name: string, body: Record<string, unknown>, signal: AbortSignal): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body, signal });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const status = ctx && typeof ctx.status === "number" ? ctx.status : 0;
    let message = "";
    if (ctx && typeof ctx.json === "function") {
      try {
        const j = await ctx.json();
        if (j?.error) message = String(j.error);
      } catch {
        // no JSON body
      }
    }
    if (!status) throw new CallError("Couldn't reach VibeCo. Check your connection and try again.", true);
    throw new CallError(message || "Something went wrong on our side.", status >= 500);
  }
  if ((data as { error?: string } | null)?.error) throw new CallError((data as { error: string }).error, false);
  return data as T;
}

/** One retry for network blips and server errors; never for bad input or rate limits. */
async function callFunction<T>(name: string, body: Record<string, unknown>, signal: AbortSignal): Promise<T> {
  try {
    return await callOnce<T>(name, body, signal);
  } catch (e) {
    if (signal.aborted || !(e instanceof CallError) || !e.retryable) throw e;
    await new Promise((r) => setTimeout(r, 800));
    return await callOnce<T>(name, body, signal);
  }
}

async function saveReport(company: string, brief: AccountBrief, plan: string): Promise<string | null> {
  try {
    const userId = await ensureSession();
    const { data, error } = await supabase
      .from("idea_reports")
      .insert({
        idea: company,
        title: company,
        brief: brief as unknown as Json,
        rounds: [{ brief, questions: [], answers: null }] as unknown as Json,
        lovable_prompt: plan,
        highlights: [],
        status: "prompt-ready",
        ...(userId ? { user_id: userId } : {}),
      })
      .select("id")
      .single();
    if (error) throw error;
    return data?.id ?? null;
  } catch (e) {
    console.error("Account report save failed:", e);
    return null;
  }
}

const secs = (ms?: number) => (ms === undefined ? "" : `${(ms / 1000).toFixed(1)}s`);

function cleanCompany(raw: string): string {
  return raw.replace(/["“”]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
}

const reveal = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: "easeOut" } } as const;

/** The right-hand panel before a run: what happens, how long, and what "Confirmed" means. */
function HowItWorks() {
  const rows = [
    {
      title: "Live sources",
      time: "~5s",
      body: "Its own job posts on Greenhouse, Lever or Ashby, plus the web and the last 12 months of news.",
    },
    {
      title: "First-call plan",
      time: "~15s",
      body: "Stack read, why now, who to start with, seven discovery questions, the migration objection and a fit grade.",
    },
    {
      title: "Five critics",
      time: "~30s",
      body: "Head of Data, CFO, incumbent BI vendor, business user and analytics engineer pressure-test it.",
    },
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">How a run works</p>
      <ol className="mt-4 space-y-4">
        {rows.map((r, i) => (
          <li key={r.title} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">{i + 1}</span>
            <div className="min-w-0">
              <p className="flex items-baseline gap-2 text-sm font-semibold text-foreground">
                {r.title} <span className="text-xs font-normal tabular-nums text-muted-foreground">{r.time}</span>
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 border-t border-border pt-4">
        <div className="flex flex-wrap gap-1.5">
          <StatusTag status="Confirmed" />
          <StatusTag status="Inferred" />
          <StatusTag status="Not found" />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          A tool is Confirmed only when a source names it at this company, checked in code. A job post that lists it as one option among several
          doesn&rsquo;t count.
        </p>
      </div>
    </div>
  );
}

interface Props {
  seller?: SellerConfig;
  initialCompany?: string;
  /** Headline and intro, shown beside the "how it works" panel. */
  intro?: React.ReactNode;
  /** Rendered between the form and the results (e.g. saved runs). */
  afterForm?: React.ReactNode;
}

const AccountRunner = ({ seller, initialCompany = "", intro, afterForm }: Props) => {
  const [input, setInput] = useState(initialCompany);
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [step, setStep] = useState<Step>("sources");
  const [marks, setMarks] = useState<Partial<Record<Step, number>>>({});
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [research, setResearch] = useState<BriefResearch | null>(null);
  const [brief, setBrief] = useState<AccountBrief | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [analysis, setAnalysis] = useState<AccountAnalysis | null>(null);
  const startRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => setElapsed(performance.now() - startRef.current), 100);
    return () => window.clearInterval(id);
  }, [status]);

  const run = async (raw: string) => {
    const name = cleanCompany(raw);
    if (!name || status === "running") return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setInput(name);
    setCompany(name);
    setStatus("running");
    setStep("sources");
    setMarks({});
    setElapsed(0);
    setError(null);
    setResearch(null);
    setBrief(null);
    setPlan(null);
    setReportId(null);
    setSaveFailed(false);
    setAnalysis(null);
    startRef.current = performance.now();
    const mark = (s: Step) => setMarks((m) => ({ ...m, [s]: performance.now() - startRef.current }));
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

    let current: Step = "sources";
    try {
      // 1. Sources first.
      const found = await callFunction<{ research: BriefResearch; excerpts: string[] }>(
        "simulate-idea",
        { type: "research", lens: "account", idea: name, seller: seller?.id },
        ctrl.signal,
      );
      setResearch(found.research);
      mark("sources");

      // 2. The plan, from the same sources.
      current = "plan";
      setStep("plan");
      const result = await callFunction<{ brief: AccountBrief; lovable_prompt: string }>(
        "simulate-idea",
        { type: "initial", lens: "account", idea: name, seller: seller?.id, research: found.research, excerpts: found.excerpts, mode: MODE },
        ctrl.signal,
      );
      setBrief(result.brief);
      setPlan(result.lovable_prompt);
      mark("plan");

      // 3. Save, then the critics (no extra click).
      current = "critics";
      setStep("critics");
      const id = await saveReport(name, result.brief, result.lovable_prompt);
      setReportId(id);
      setSaveFailed(!id);
      const critics = await callFunction<AccountAnalysis>(
        "orchestrate",
        { idea: name, brief: result.brief, report_id: id ?? undefined, mode: MODE },
        ctrl.signal,
      );
      setAnalysis(critics);
      mark("critics");
      setStatus("done");
      if (id) {
        const { error: saveErr } = await supabase.from("idea_reports").update({ auto_analysis: critics as unknown as Json }).eq("id", id);
        if (saveErr) console.error("Saving the critics failed:", saveErr.message);
      }
    } catch (e) {
      if (ctrl.signal.aborted) return;
      console.error("Account run failed:", e);
      setStep(current);
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  };

  const copyLink = async () => {
    if (!reportId) return;
    const ok = await copyToClipboard(`${window.location.origin}/report/${reportId}`);
    if (ok) toast.success("Link copied");
    else toast.error("Couldn't copy the link.");
  };

  const running = status === "running";
  const started = status !== "idle";
  const sellerName = seller?.name;

  // Progress: finished steps count fully; the current one fills toward 90% of its share over its typical time.
  const share = 100 / STEPS.length;
  const stepIndex = Math.max(0, STEPS.findIndex((s) => s.id === step));
  const prevMark = stepIndex > 0 ? marks[STEPS[stepIndex - 1].id] ?? 0 : 0;
  const progress =
    status === "done" ? 100 : stepIndex * share + (running ? Math.min(0.9, (elapsed - prevMark) / STEPS[stepIndex].typical) * share : 0);

  return (
    <div>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
        <div>
          {intro}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(input);
            }}
            className="mt-8"
          >
            <label htmlFor="account-company" className="text-sm font-semibold text-foreground">
              Which company?
            </label>
            <div className="mt-2 flex flex-col gap-2 rounded-xl border border-border bg-surface-elevated p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                <Search size={17} className="shrink-0 text-muted-foreground" aria-hidden />
                <input
                  id="account-company"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Company name or domain"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={120}
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={running || !cleanCompany(input)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
                {running ? "Working" : "Build the plan"}
                {!running && <ArrowRight size={15} aria-hidden />}
              </button>
            </div>
            {seller && seller.examples.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Try:</span>
                {seller.examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    disabled={running}
                    onClick={() => run(ex)}
                    className="rounded-full border border-border bg-surface-elevated px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </form>
          {afterForm}
        </div>
        <div className={`lg:pt-14 ${started ? "hidden lg:block" : ""}`}>
          <HowItWorks />
        </div>
      </div>

      <div ref={resultsRef} className="scroll-mt-24">
        {started && (
          <div className="mt-12" aria-live="polite">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">{company}</h2>
              {reportId && (
                <div className="flex items-center gap-3 text-xs">
                  <Link to={`/report/${reportId}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                    Open the shareable report <ArrowRight size={12} aria-hidden />
                  </Link>
                  <button type="button" onClick={copyLink} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                    <Link2 size={12} aria-hidden /> Copy link
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4">
              <div
                className="h-1 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Run progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-out ${status === "error" ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <ol className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {STEPS.map((s, i) => {
                  const done = marks[s.id] !== undefined;
                  const active = running && step === s.id;
                  const failed = status === "error" && step === s.id;
                  return (
                    <li key={s.id} className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                          done ? "bg-primary text-primary-foreground" : failed ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? <Check size={12} aria-hidden /> : active ? <Loader2 size={12} className="animate-spin" aria-hidden /> : i + 1}
                      </span>
                      <span className={done || active ? "font-medium text-foreground" : "text-muted-foreground"}>{s.label}</span>
                      <span className="tabular-nums text-xs text-muted-foreground">{done ? secs(marks[s.id]) : active ? secs(elapsed) : ""}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {status === "error" && error && (
              <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-destructive" aria-hidden />
                <div>
                  <p className="text-foreground">
                    {step === "critics" && plan ? "The plan is ready, but the critics didn't finish. " : "This run stopped. "}
                    {error}
                  </p>
                  <button type="button" onClick={() => run(company)} className="mt-1 text-xs font-medium text-primary underline-offset-4 hover:underline">
                    Run {company} again
                  </button>
                </div>
              </div>
            )}
            {saveFailed && (
              <p className="mt-4 text-xs text-muted-foreground">This run couldn&rsquo;t be saved, so there&rsquo;s no shareable link. Copy the plan instead.</p>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
              {/* Phones: sources on top until the plan lands, then below it. Desktop: right column. */}
              <aside className={`space-y-4 lg:sticky lg:top-24 lg:order-last ${plan ? "order-last" : "order-first"}`}>
                <AnimatePresence>
                  {research ? (
                    <motion.div key="sources" {...reveal} className="space-y-4">
                      <ScanCard scan={research.scan} company={company} />
                      <SourcesList research={research} compact />
                    </motion.div>
                  ) : running ? (
                    <div className="space-y-3 rounded-lg border border-border bg-card/40 p-4">
                      <p className="text-sm text-muted-foreground">
                        <Loader2 size={14} className="mr-2 inline animate-spin" aria-hidden />
                        Reading {company}&rsquo;s job board, stack, data hiring and news…
                      </p>
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${90 - i * 12}%` }} />
                      ))}
                    </div>
                  ) : null}
                </AnimatePresence>
              </aside>

              <div className="min-w-0 space-y-6">
                {plan && brief ? (
                  <motion.div {...reveal} className="space-y-6">
                    <PlanCard company={company} plan={plan} brief={brief} sellerName={sellerName} />
                    <StackTable lines={brief.core_features} research={brief.research} />
                  </motion.div>
                ) : running && research ? (
                  <div className="rounded-lg border border-dashed border-primary/30 bg-accent/40 p-5">
                    <p className="text-sm text-foreground/80">
                      <Loader2 size={14} className="mr-2 inline animate-spin text-primary" aria-hidden />
                      Reading {research.sources.length} source{research.sources.length === 1 ? "" : "s"} and writing the first-call plan…
                    </p>
                    <div className="mt-4 space-y-2.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-3 animate-pulse rounded bg-primary/10" style={{ width: `${95 - i * 9}%` }} />
                      ))}
                    </div>
                  </div>
                ) : null}

                {brief && running && step === "critics" && (
                  <div className="rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground">
                    <Loader2 size={14} className="mr-2 inline animate-spin" aria-hidden />
                    Five critics are reading the plan: Head of Data, CFO, incumbent BI vendor, business user and analytics engineer…
                  </div>
                )}
                {analysis && (
                  <motion.div {...reveal} className="space-y-6">
                    <CriticsPanel analysis={analysis} brief={brief} />
                  </motion.div>
                )}
                {brief && <AccountSections brief={brief} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountRunner;
