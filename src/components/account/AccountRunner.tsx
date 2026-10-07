import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, History, Link2, Loader2, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { ensureSession } from "@/lib/ensureSession";
import { copyToClipboard } from "@/lib/copyToClipboard";
import type { SellerConfig } from "@/lib/sellers";
import type { BriefResearch } from "@/components/simulator/SourcesList";
import { moduleHref } from "@/components/territory/nav";
import { cx } from "@/components/territory/style";
import { Eyebrow, LivePill } from "@/components/territory/ui";
import { StatusTag, type AccountAnalysis, type AccountBrief } from "./AccountViews";
import { AccountExplorer } from "./explorer/AccountExplorer";
import { card, linkBtn, primaryBtn, secondaryBtn, toggle } from "./explorer/look";
import { QuickPicks } from "./QuickPicks";
import { resolveCompany } from "./resolveCompany";
import { RunMode } from "./RunMode";
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

/** The panel beside the form before a run: what happens, how long, and what "Confirmed" means. */
function HowItWorks() {
  const rows = [
    {
      title: "Live sources",
      time: "~5s",
      body: "Its own job posts on Greenhouse, Lever, Ashby or Workday, its product pages, the web and the last 12 months of news.",
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
    <div className={cx(card, "p-5 sm:p-6")}>
      <Eyebrow>How a run works</Eyebrow>
      <ol className="mt-4 space-y-4">
        {rows.map((r, i) => (
          <li key={r.title} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-foreground font-mono text-[13px] font-semibold text-white">{i + 1}</span>
            <div className="min-w-0">
              <p className="flex items-baseline gap-2 text-base font-semibold text-foreground">
                {r.title} <span className="font-mono text-xs font-medium text-muted-foreground">{r.time}</span>
              </p>
              <p className="mt-0.5 text-[15px] leading-relaxed text-[#4A4F63]">{r.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-[15px] text-[#4A4F63]">
        <StatusTag status="Confirmed" />
        <StatusTag status="Inferred" />
        <StatusTag status="Former" />
        <StatusTag status="Not found" />
        <span>Confirmed only when a source names it plainly.</span>
      </p>
    </div>
  );
}

/** The three steps of a live run, each with its time: done in ink, the current one live in pink. */
function RunSteps({
  marks,
  step,
  status,
  inStep,
  progress,
}: {
  marks: Partial<Record<Step, number>>;
  step: Step;
  status: Status;
  inStep: number;
  progress: number;
}) {
  const running = status === "running";
  return (
    <div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[#E4E0D6]"
        role="progressbar"
        aria-label="Run progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className={cx("h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none", status === "error" ? "bg-[#9097A6]" : "bg-foreground")}
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
        {STEPS.map((s, i) => {
          const done = marks[s.id] !== undefined;
          const active = running && step === s.id;
          const failed = status === "error" && step === s.id;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <span
                className={cx(
                  "flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-semibold",
                  done
                    ? "bg-foreground text-white"
                    : active
                    ? "border border-brand bg-brand-tint text-foreground"
                    : failed
                    ? "border-2 border-dotted border-foreground text-foreground"
                    : "border border-[#D9D4C7] text-muted-foreground",
                )}
              >
                {done ? <Check size={13} aria-hidden /> : active ? <Loader2 size={13} className="animate-spin" aria-hidden /> : i + 1}
              </span>
              <span className={done || active || failed ? "font-semibold text-foreground" : "text-[#4A4F63]"}>
                {s.label}
                {failed && <span className="font-normal text-[#4A4F63]"> · stopped</span>}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {done ? secs((marks[s.id] ?? 0) - (i > 0 ? marks[STEPS[i - 1].id] ?? 0 : 0)) : active ? secs(inStep) : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface Props {
  seller?: SellerConfig;
  initialCompany?: string;
  /** Headline and intro, shown beside the "how it works" panel before a run. */
  intro?: React.ReactNode;
  /** A saved run to open on arrival (e.g. from the territory radar). */
  initialReportId?: string;
  /** Inside the territory shell: no fixed site navbar to scroll clear of. */
  inShell?: boolean;
  /** The run on screen once it's saved (a saved run opened, or a live run finished), or null when a live run starts. */
  onRunChange?: (run: { id: string; company: string } | null) => void;
  /** A company to run live once, on arrival (a "research it live" link); the box shows it. */
  autoRun?: string;
}

/** "Relay (relaypro.com)" and "relay" are the same account. */
const sameAccount = (a: string, b: string) => {
  const norm = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
  return norm(a) === norm(b);
};

const AccountRunner = ({ seller, initialCompany = "", intro, initialReportId, inShell, onRunChange, autoRun }: Props) => {
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
  /** The saved run on screen, so arriving at its id doesn't open it twice. */
  const openedRef = useRef<string | null>(null);

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

  // Bring the run bar into view after the page collapses into it (an effect, so the new layout is in);
  // left alone when it's already near the top.
  const [scrollTick, setScrollTick] = useState(0);
  const scrollToResults = () => setScrollTick((t) => t + 1);
  useEffect(() => {
    const el = resultsRef.current;
    if (!scrollTick || !el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.4) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollTick]);

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
      openedRef.current = id;
      onRunChange?.({ id, company: name });
    }
  };

  const run = async (raw: string) => {
    const typed = cleanCompany(raw);
    if (!typed || status === "running") return;
    const resolved = resolveCompany(typed, seller);
    if (resolved.kind === "seller") {
      toast(`That's ${seller?.name} itself. Try a company ${seller?.name} would sell to.`);
      return;
    }
    const name = resolved.company;
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
    onRunChange?.(null);
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
    openedRef.current = report.id;
    onRunChange?.({ id: report.id, company: report.idea });
  };

  // Arriving with a saved run to open (from the territory): show it at once.
  // Until it loads, a placeholder bar stands in for the intro (no flash of the full page).
  const [arriving, setArriving] = useState(!!initialReportId);
  /** The saved run in the link couldn't be read: say so above the empty form. */
  const [unreadable, setUnreadable] = useState(false);
  useEffect(() => {
    if (!initialReportId || openedRef.current === initialReportId) return;
    openedRef.current = initialReportId;
    loadReport(initialReportId).then((rep) => {
      if (rep && openedRef.current === initialReportId) openSaved(rep);
      setUnreadable(!rep);
      setArriving(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once per id
  }, [initialReportId]);

  // Arriving with a company to research live: run it once.
  const autoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoRun || autoRef.current === autoRun) return;
    autoRef.current = autoRun;
    run(autoRun);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per company
  }, [autoRun]);

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

  const name = company.replace(/\s*\([^)]*\)\s*$/, "");
  const fallbackName = fallback?.company.replace(/\s*\([^)]*\)\s*$/, "");
  // With a saved run open and its company still in the box, the button re-runs it live (secondary);
  // type another company and it's the pink "Build the plan" again.
  const rerun = !!saved && !running && sameAccount(input, saved.idea);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(rerun && saved ? saved.idea : input);
  };
  const field = (
    <>
      <Search size={17} className="shrink-0 text-muted-foreground" aria-hidden />
      <input
        id="account-company"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Company name or domain"
        autoComplete="off"
        spellCheck={false}
        maxLength={120}
        className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-[#6B7080] focus:outline-none"
      />
    </>
  );
  const buildButton = rerun ? (
    <button type="submit" className={cx(secondaryBtn, "shrink-0")}>
      <RotateCcw size={16} aria-hidden /> Run it live
    </button>
  ) : (
    <button type="submit" disabled={running || !cleanCompany(input)} className={cx(primaryBtn, "shrink-0 disabled:cursor-not-allowed")}>
      {running ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
      {running ? "Working" : "Build the plan"}
      {!running && <ArrowRight size={16} aria-hidden />}
    </button>
  );

  return (
    <div>
      {!started && arriving && (
        <div className={cx(card, "p-4 sm:p-5")} aria-busy="true">
          <LivePill>Opening the saved run</LivePill>
          <div className="mt-4 space-y-2.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-3.5 rounded bg-muted" style={{ width: `${80 - i * 18}%` }} />
            ))}
          </div>
        </div>
      )}
      {!started && !arriving && (
        <>
          {unreadable && (
            <p role="status" className="mb-6 rounded-xl border border-dotted border-[#9097A6] bg-card px-4 py-3 text-[15px] text-[#4A4F63]">
              <span className="font-semibold text-foreground">That saved run couldn&rsquo;t be opened.</span> The link may be old. Type a company to run it live, or open a
              saved run below.
            </p>
          )}
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12">
            <div>
              {intro}
              <form data-tour="company-box" onSubmit={submit} className="mt-8">
                <label htmlFor="account-company" className="text-[15px] font-bold text-foreground">
                  Which company?
                </label>
                <div className="mt-2 flex flex-col gap-2 rounded-xl border border-[#9097A6] bg-card p-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-2 px-2">{field}</div>
                  {buildButton}
                </div>
                <p className="mt-2 text-[15px] text-[#4A4F63]">
                  Add its domain when the name is a common word: <span className="font-mono">Relay (relaypro.com)</span>.
                </p>
                {seller?.territory ? (
                  <QuickPicks
                    saved={pinned}
                    live={seller.examples}
                    disabled={running}
                    onOpen={openSaved}
                    onRun={run}
                    radar={{ href: moduleHref(seller.id, "radar"), count: seller.territory.accounts.length }}
                  />
                ) : (
                  seller &&
                  seller.examples.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="mr-1 font-mono text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">Try</span>
                      {seller.examples.map((ex) => (
                        <button key={ex} type="button" disabled={running} onClick={() => run(ex)} className={cx(toggle(false), "disabled:opacity-50")}>
                          {ex}
                        </button>
                      ))}
                    </div>
                  )
                )}
              </form>
            </div>
            <HowItWorks />
          </div>

          {/* With a territory, the quick picks and the radar link stand in for these cards. */}
          {!seller?.territory && runs.length > 0 && (
            <TerritoryStrip
              runs={runs}
              title={pinned.length ? "Saved runs · open instantly, no AI calls" : "Your recent runs · open instantly"}
              activeId={saved?.id}
              onOpen={openSaved}
            />
          )}
        </>
      )}

      <div ref={resultsRef} className={inShell ? "scroll-mt-4" : "scroll-mt-24"}>
        {started && (
          <>
            <h1 className="sr-only">First-call plan: {name}</h1>
            <section aria-label="Run" className={cx(card, "p-3 sm:p-4")}>
              {/* Which kind of run this is, first; the report links on the same line. */}
              <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1">
                {saved ? (
                  <RunMode kind="saved" savedAt={saved.created_at} />
                ) : (
                  <RunMode kind="live" status={running ? "running" : status === "done" ? "done" : "error"} ms={status === "done" ? marks.critics ?? elapsed : elapsed} />
                )}
                {reportId && !running && (
                  <div className="flex flex-wrap items-center gap-x-5">
                    <Link to={`/report/${reportId}`} className={linkBtn}>
                      Open the shareable report <ArrowRight size={15} aria-hidden />
                    </Link>
                    <button type="button" onClick={copyLink} className={cx(linkBtn, "text-foreground")}>
                      <Link2 size={15} aria-hidden /> Copy link
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={submit} className="mt-2.5 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="account-company" className="sr-only">
                  Which company?
                </label>
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-[#9097A6] bg-card px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring">
                  {field}
                </div>
                {buildButton}
              </form>

              {!saved && (
                <div className="mt-3 border-t border-border pt-3" aria-live="polite">
                  <RunSteps marks={marks} step={step} status={status} inStep={inStep} progress={progress} />
                </div>
              )}

              {/* In the command center, other accounts open from the Run tab, the Radar or a view's picker. */}
              {!inShell && runs.length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <TerritoryStrip compact runs={runs} title={pinned.length ? "Saved runs" : "Your recent runs"} activeId={saved?.id} onOpen={openSaved} />
                </div>
              )}
            </section>

            {status === "error" && error && !(step === "critics" && plan) && (
              <div role="alert" className="mt-4 rounded-xl border-2 border-foreground bg-card p-4 sm:p-5">
                <p className="text-base font-bold text-foreground">This run stopped.</p>
                <p className="mt-1 text-[15px] text-[#4A4F63]">{error}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => run(company)} className={primaryBtn}>
                    <RotateCcw size={16} aria-hidden /> Run {company} again
                  </button>
                  {fallback && (
                    <button type="button" onClick={openFallback} className={secondaryBtn}>
                      <History size={16} aria-hidden /> Open the saved {fallbackName} run
                    </button>
                  )}
                </div>
              </div>
            )}
            {slow && fallback && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand bg-brand-tint px-4 py-3">
                <p className="text-[15px] text-foreground">This one is taking longer than usual. The live run keeps going.</p>
                <button type="button" onClick={openFallback} className={primaryBtn}>
                  <History size={16} aria-hidden /> Show the saved {fallbackName} run
                </button>
              </div>
            )}
            {saveFailed && (
              <p className="mt-3 text-sm text-[#4A4F63]">This run couldn&rsquo;t be saved, so there&rsquo;s no shareable link. Copy the plan instead.</p>
            )}

            <div className="mt-6">
              {plan && brief ? (
                <AccountExplorer
                  key={reportId ?? company}
                  company={company}
                  brief={brief}
                  plan={plan}
                  analysis={analysis}
                  board={board}
                  sellerName={sellerName}
                  notice={
                    status === "error" && step === "critics" ? (
                      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-foreground bg-card px-4 py-3">
                        <p className="text-[15px] text-foreground">
                          <span className="font-semibold">The plan is ready, but the agents didn&rsquo;t finish.</span> {error}
                        </p>
                        <button type="button" onClick={retryAgents} className={secondaryBtn}>
                          <RotateCcw size={16} aria-hidden /> Run the seven agents again
                        </button>
                      </div>
                    ) : null
                  }
                />
              ) : (
                <ResearchFeed research={research} company={name} researchMs={marks.sources} writingMs={running && step === "plan" ? inStep : undefined} typicalMs={STEPS[1].typical} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountRunner;
