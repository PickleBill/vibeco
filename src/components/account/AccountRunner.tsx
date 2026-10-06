import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { ensureSession } from "@/lib/ensureSession";
import type { SellerConfig } from "@/lib/sellers";
import SourcesList, { type BriefResearch } from "@/components/simulator/SourcesList";
import { AccountSections, CriticsPanel, PlanCard, StackTable, type AccountAnalysis, type AccountBrief } from "./AccountViews";

/**
 * Target-account express run: sources first, then the First-call plan, then
 * the five critics, with no clicks in between.
 *   1. simulate-idea {type: "research"}  → live sources (shown at once)
 *   2. simulate-idea {type: "initial"}   → brief + plan, reusing those sources
 *   3. orchestrate                        → critics, boil-down, synthesis
 * The run is saved to idea_reports so it opens at /report/:id.
 */

type Step = "sources" | "plan" | "critics";
type Status = "idle" | "running" | "done" | "error";

const STEPS: { id: Step; label: string }[] = [
  { id: "sources", label: "Live sources" },
  { id: "plan", label: "First-call plan" },
  { id: "critics", label: "Five critics" },
];

// "fast" puts Gemini 3 Flash first, with 2.5 Pro as the server's fallback.
const MODE = "fast";

async function callFunction<T>(name: string, body: Record<string, unknown>, signal: AbortSignal): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body, signal });
  if (error) {
    let message = error.message || "Something went wrong.";
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const j = await ctx.json();
        if (j?.error) message = String(j.error);
      } catch {
        // keep the generic message
      }
    }
    throw new Error(message);
  }
  if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
  return data as T;
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

interface Props {
  seller?: SellerConfig;
  initialCompany?: string;
  /** Rendered between the form and the results (e.g. saved runs). */
  afterForm?: React.ReactNode;
}

const AccountRunner = ({ seller, initialCompany = "", afterForm }: Props) => {
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
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

      // 2. The plan, from the same sources.
      current = "plan";
      setStep("plan");
      const result = await callFunction<{ brief: AccountBrief; lovable_prompt: string }>(
        "simulate-idea",
        {
          type: "initial",
          lens: "account",
          idea: name,
          seller: seller?.id,
          research: found.research,
          excerpts: found.excerpts,
          mode: MODE,
        },
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
        const { error: saveErr } = await supabase
          .from("idea_reports")
          .update({ auto_analysis: critics as unknown as Json })
          .eq("id", id);
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

  const running = status === "running";
  const sellerName = seller?.name;
  const plural = (research?.sources.length ?? 0) === 1 ? "" : "s";

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(input);
        }}
        className="max-w-2xl"
      >
        <label htmlFor="account-company" className="text-sm font-semibold text-foreground">
          Which company?
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="account-company"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Company name or domain"
            autoComplete="off"
            maxLength={120}
            className="min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={running || !cleanCompany(input)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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

      <div ref={resultsRef} className="scroll-mt-24">
        {status !== "idle" && (
          <div className="mt-10" aria-live="polite">
            <ol className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border pb-4 text-sm">
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
                      {done ? secs(marks[s.id]) : active ? secs(elapsed) : ""}
                    </span>
                  </li>
                );
              })}
            </ol>

            {status === "error" && error && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-destructive" aria-hidden />
                <div>
                  <p className="text-foreground">
                    {step === "critics" && plan ? "The plan is ready, but the critics didn't finish: " : "This run stopped: "}
                    {error}
                  </p>
                  <button type="button" onClick={() => run(company)} className="mt-1 text-xs text-primary underline-offset-4 hover:underline">
                    Try {company} again
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
              {/* Phones: sources on top until the plan lands, then below it. Desktop: right column. */}
              <aside className={`lg:sticky lg:top-24 lg:order-last ${plan ? "order-last" : "order-first"}`}>
                {research ? (
                  <SourcesList research={research} compact />
                ) : running ? (
                  <div className="rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground">
                    <Loader2 size={14} className="mr-2 inline animate-spin" aria-hidden />
                    Searching the web for {company}&rsquo;s stack, data hiring and news…
                  </div>
                ) : null}
              </aside>

              <div className="min-w-0 space-y-6">
                {plan && brief ? (
                  <>
                    <PlanCard company={company} plan={plan} brief={brief} sellerName={sellerName} />
                    <p className="text-xs text-muted-foreground">
                      {reportId ? (
                        <Link to={`/report/${reportId}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                          Open the shareable report <ArrowRight size={12} aria-hidden />
                        </Link>
                      ) : saveFailed ? (
                        "This run couldn't be saved, so there's no shareable link. Copy the plan instead."
                      ) : (
                        "Saving a shareable link…"
                      )}
                    </p>
                    <StackTable lines={brief.core_features} research={brief.research} />
                  </>
                ) : running && research ? (
                  <div className="rounded-lg border border-dashed border-primary/30 bg-accent/40 p-5 text-sm text-foreground/80">
                    <Loader2 size={14} className="mr-2 inline animate-spin text-primary" aria-hidden />
                    Reading {research.sources.length} source{plural} and writing the first-call plan…
                  </div>
                ) : null}

                {brief && running && step === "critics" && (
                  <div className="rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground">
                    <Loader2 size={14} className="mr-2 inline animate-spin" aria-hidden />
                    Five critics are reading the plan: Head of Data, CFO, incumbent BI vendor, business user and analytics engineer…
                  </div>
                )}
                <CriticsPanel analysis={analysis} brief={brief} />
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
