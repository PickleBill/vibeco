import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Check, History, Link2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { ensureSession } from "@/lib/ensureSession";
import { copyToClipboard } from "@/lib/copyToClipboard";
import type { SellerConfig } from "@/lib/sellers";
import type { BriefResearch } from "@/components/simulator/SourcesList";
import { StatusTag, type AccountAnalysis, type AccountBrief } from "./AccountViews";
import { AccountExplorer } from "./explorer/AccountExplorer";
import { ResearchFeed } from "./explorer/ResearchFeed";
import { TerritoryStrip } from "./explorer/TerritoryStrip";
import { useAgentBoard } from "./explorer/useAgentBoard";
import { loadReport, recentRuns, rememberReport, rememberRun, type RunRef, type SavedReport } from "./explorer/savedRuns";

/**
 * Target-account express run: sources first, then the First-call plan, then
 * seven agents in parallel and their verdict, with no clicks in between.
 *   1. simulate-idea {type: "research"}  → job-board scan + live web sources
 *   2. simulate-idea {type: "initial"}   → brief + plan, reusing those sources
 *   3. orchestrate                        → five critics, Expand, Distill, then synthesis
 * The run is saved to idea_reports so it opens at /report/:id; its agents'
 * progress arrives through agent_events while orchestrate runs.
 */

type Step = "sources" | "plan" | "critics";
type Status = "idle" | "running" | "done" | "error";

// Typical times on the live site (sources ~2-7s, plan ~30-40s, agents ~15-20s).
const STEPS: { id: Step; label: string; typical: number }[] = [
  { id: "sources", label: "Live sources", typical: 5_000 },
  { id: "plan", label: "First-call plan", typical: 38_000 },
  { id: "critics", label: "Seven agents + verdict", typical: 18_000 },
];

/** Past this, a slow run offers the saved one. */
const SLOW_MS = 50_000;

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

/** The right-hand panel before a run: what happens, how long, and what "Confirmed" means. */
function HowItWorks() {
  const rows = [
    {
      title: "Live sources",
      time: "~5s",
      body: "Its own job posts on Greenhouse, Lever or Ashby, its product pages, the web and the last 12 months of news.",
    },
    {
      title: "First-call plan",
      time: "~35s",
      body: "The motion (internal, embedded, both or unclear), stack read, why now, who to start with, discovery questions, the objection and a fit grade. Code checks every stack claim against its source.",
    },
    {
      title: "Seven agents, then a verdict",
      time: "~15s",
      body: "Five critics (Head of Data, CFO, incumbent BI vendor, business user, analytics engineer), Expand and Distill run in parallel. Pick a seat and answer it.",
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
          <StatusTag status="Former" />
          <StatusTag status="Not found" />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          A tool is Confirmed only when a source names it plainly at this company, checked in code. A job post that lists it as one option among
          several, or as a nice-to-have, doesn&rsquo;t count. Former means a source says the company moved off it.
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
}

/** "Relay (relaypro.com)" and "relay" are the same account. */
const sameAccount = (a: string, b: string) => {
  const norm = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
  return norm(a) === norm(b);
};

const AccountRunner = ({ seller, initialCompany = "", intro }: Props) => {
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
  /** A saved run opened from the strip (no live calls). */
  const [saved, setSaved] = useState<SavedReport | null>(null);
  const [recent, setRecent] = useState<RunRef[]>(() => recentRuns(seller?.id));
  const { board, listen, settle, reset, fail } = useAgentBoard();
  const startRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => setElapsed(performance.now() - startRef.current), 100);
    return () => window.clearInterval(id);
  }, [status]);

  // Pinned runs first, then this browser's recent ones; three at most.
  const pinned = useMemo(() => seller?.savedRuns ?? [], [seller]);
  const runs = useMemo(() => {
    const out = [...pinned];
    for (const r of recent) if (!out.some((x) => x.reportId === r.reportId || sameAccount(x.company, r.company))) out.push(r);
    return out.slice(0, 3);
  }, [pinned, recent]);

  const scrollToResults = () => requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  /** Seven agents in parallel, then the verdict; the board fills as each finishes. */
  const runAgents = async (name: string, b: AccountBrief, p: string, id: string | null, signal: AbortSignal) => {
    await listen(id);
    const critics = await callFunction<AccountAnalysis>("orchestrate", { idea: name, brief: b, report_id: id ?? undefined, mode: MODE }, signal);
    setAnalysis(critics);
    settle(critics);
    if (id) {
      const { error: saveErr } = await supabase.from("idea_reports").update({ auto_analysis: critics as unknown as Json }).eq("id", id);
      if (saveErr) console.error("Saving the agents' results failed:", saveErr.message);
      rememberReport({ id, idea: name, brief: b, lovable_prompt: p, auto_analysis: critics, created_at: new Date().toISOString() });
      rememberRun(seller?.id, { company: name, reportId: id });
      setRecent(recentRuns(seller?.id));
    }
  };

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
    setSaved(null);
    reset();
    startRef.current = performance.now();
    const mark = (s: Step) => setMarks((m) => ({ ...m, [s]: performance.now() - startRef.current }));
    scrollToResults();

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

      // 3. Save, then the seven agents (no extra click).
      current = "critics";
      setStep("critics");
      const id = await saveReport(name, result.brief, result.lovable_prompt);
      setReportId(id);
      setSaveFailed(!id);
      await runAgents(name, result.brief, result.lovable_prompt, id, ctrl.signal);
      mark("critics");
      setStatus("done");
    } catch (e) {
      if (ctrl.signal.aborted) return;
      console.error("Account run failed:", e);
      if (current === "critics") fail();
      setStep(current);
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  };

  /** The plan is in but the agents didn't finish: run just them again. */
  const retryAgents = async () => {
    if (!brief || !plan || status === "running") return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("running");
    setStep("critics");
    setError(null);
    try {
      await runAgents(company, brief, plan, reportId, ctrl.signal);
      setStatus("done");
    } catch (e) {
      if (ctrl.signal.aborted) return;
      fail();
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  };

  /** A saved run, shown at once from stored data: no AI calls. */
  const openSaved = (report: SavedReport) => {
    abortRef.current?.abort();
    setInput(report.idea);
    setCompany(report.idea);
    setStatus("done");
    setStep("critics");
    setMarks({});
    setError(null);
    setResearch(report.brief.research ?? null);
    setBrief(report.brief);
    setPlan(report.lovable_prompt);
    setReportId(report.id);
    setSaveFailed(false);
    setAnalysis(report.auto_analysis);
    setSaved(report);
    if (report.auto_analysis) settle(report.auto_analysis, { replay: true });
    else reset();
    scrollToResults();
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

  // Progress: finished steps count fully; the current one eases toward its share and never parks.
  const share = 100 / STEPS.length;
  const stepIndex = Math.max(0, STEPS.findIndex((s) => s.id === step));
  const prevMark = stepIndex > 0 ? marks[STEPS[stepIndex - 1].id] ?? 0 : 0;
  const inStep = Math.max(0, elapsed - prevMark);
  const progress =
    status === "done" ? 100 : stepIndex * share + (running ? Math.min(0.97, 1 - Math.exp((-2.3 * inStep) / STEPS[stepIndex].typical)) * share : 0);

  // A slow live run offers the saved run for the same account (or any saved run).
  const fallback = runs.find((r) => sameAccount(r.company, company)) ?? runs[0];
  const slow = running && !plan && elapsed > SLOW_MS && !!fallback;
  const openFallback = async () => {
    if (!fallback) return;
    const rep = await loadReport(fallback.reportId);
    if (rep) openSaved(rep);
  };

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
            <p className="mt-2 text-xs text-muted-foreground">
              Add its domain when the name is a common word: <span className="font-mono">Relay (relaypro.com)</span>.
            </p>
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
        </div>
        <div className={`lg:pt-14 ${started ? "hidden lg:block" : ""}`}>
          <HowItWorks />
        </div>
      </div>

      {runs.length > 0 && (
        <TerritoryStrip
          runs={runs}
          title={pinned.length ? "Saved runs · open instantly, no AI calls" : "Your recent runs · open instantly"}
          activeId={saved?.id}
          onOpen={openSaved}
        />
      )}

      <div ref={resultsRef} className="scroll-mt-24">
        {started && (
          <div className="mt-10" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {saved ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <History size={15} className="text-primary" aria-hidden />
                  Saved run, opened instantly from stored results.
                  <button type="button" onClick={() => run(saved.idea)} className="font-medium text-primary underline-offset-4 hover:underline">
                    Run it live
                  </button>
                </p>
              ) : (
                <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">{plan ? "" : company}</h2>
              )}
              {reportId && !running && (
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

            {!saved && (
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
                        <span className="tabular-nums text-xs text-muted-foreground">
                          {done ? secs((marks[s.id] ?? 0) - (i > 0 ? marks[STEPS[i - 1].id] ?? 0 : 0)) : active ? secs(inStep) : ""}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {status === "error" && error && !(step === "critics" && plan) && (
              <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-destructive" aria-hidden />
                <div>
                  <p className="text-foreground">This run stopped. {error}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
                    <button type="button" onClick={() => run(company)} className="text-primary underline-offset-4 hover:underline">
                      Run {company} again
                    </button>
                    {fallback && (
                      <button type="button" onClick={openFallback} className="text-primary underline-offset-4 hover:underline">
                        Open the saved {fallback.company.replace(/\s*\([^)]*\)\s*$/, "")} run
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {slow && fallback && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-accent/50 px-4 py-3 text-sm">
                <p className="text-foreground">This one is taking longer than usual. The live run keeps going.</p>
                <button
                  type="button"
                  onClick={openFallback}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
                >
                  <History size={14} aria-hidden /> Show the saved {fallback.company.replace(/\s*\([^)]*\)\s*$/, "")} run
                </button>
              </div>
            )}
            {saveFailed && (
              <p className="mt-4 text-xs text-muted-foreground">This run couldn&rsquo;t be saved, so there&rsquo;s no shareable link. Copy the plan instead.</p>
            )}

            <div className="mt-6">
              {plan && brief ? (
                <AccountExplorer
                  key={reportId ?? company}
                  company={company.replace(/\s*\([^)]*\)\s*$/, "")}
                  brief={brief}
                  plan={plan}
                  analysis={analysis}
                  board={board}
                  sellerName={sellerName}
                  notice={
                    status === "error" && step === "critics" ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                        <p className="text-foreground">The plan is ready, but the agents didn&rsquo;t finish. {error}</p>
                        <button type="button" onClick={retryAgents} className="font-medium text-primary underline-offset-4 hover:underline">
                          Run the seven agents again
                        </button>
                      </div>
                    ) : null
                  }
                />
              ) : (
                <ResearchFeed
                  research={research}
                  company={company.replace(/\s*\([^)]*\)\s*$/, "")}
                  researchMs={marks.sources}
                  writingMs={running && step === "plan" ? inStep : undefined}
                  typicalMs={STEPS[1].typical}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountRunner;
