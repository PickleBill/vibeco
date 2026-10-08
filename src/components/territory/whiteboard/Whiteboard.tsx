import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { label, primaryBtn, toggle } from "@/components/account/explorer/look";
import { CompanyLogo } from "../company/CompanyLogo";
import { PageHeader } from "../PageHeader";
import { cx } from "../style";
import { EXAMPLES } from "./examples";
import { domainOf, fetchRiff, RiffError, type RiffResult } from "./model";
import { RiffCard } from "./RiffCard";

type State =
  | { status: "idle" }
  | { status: "loading"; company: string; startedAt: number }
  | { status: "done"; result: RiffResult; fresh: boolean }
  | { status: "error"; company: string; message: string };

const RECENT_KEY = "vibeco.whiteboard.recent";
const keyOf = (company: string) => (domainOf(company) ?? company.trim().toLowerCase()).replace(/\s+/g, " ");
// Riffs already on this page, by company: going back to one is instant.
const seen = new Map<string, RiffResult>();

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function remember(company: string) {
  try {
    const next = [company, ...readRecent().filter((c) => keyOf(c) !== keyOf(company))].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Private windows: nothing to remember.
  }
}

const STEPS = [
  { at: 0, text: "Reading its company profile, its own product pages and its job posts" },
  { at: 6, text: "Sketching where analytics would live in its product" },
  { at: 14, text: "Pricing it and sizing it" },
];

function Waiting({ company, startedAt }: { company: string; startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.round((now - startedAt) / 1000));
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 rounded-2xl border border-foreground bg-[#F4F2EC] p-5"
      style={{ backgroundImage: "radial-gradient(#D9D4C7 1px, transparent 1px)", backgroundSize: "18px 18px" }}
    >
      <div className="rounded-xl border border-border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[17px] font-semibold">
            <Loader2 size={18} className="animate-spin text-primary motion-reduce:animate-none" aria-hidden />
            Riffing on {company}
          </p>
          <span className="font-mono text-sm tabular-nums text-[#4A4F63]">{secs}s · usually 10 to 25s</span>
        </div>
        <ol className="mt-3 flex flex-col gap-1.5">
          {STEPS.map((s) => (
            <li key={s.text} className={cx("text-[15px]", secs >= s.at ? "text-foreground" : "text-[#9097A6]")}>
              {secs >= s.at ? "· " : "  "}
              {s.text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * The whiteboard: type a company and get a partnership riff, or open one of
 * two saved ones at once. A riff that fails or takes too long never leaves a
 * blank board: the saved ones are right there.
 */
export function Whiteboard({ seller, account }: { seller: string; account?: { name: string; typed: string } }) {
  const [params, setParams] = useSearchParams();
  const asked = params.get("riff")?.trim() ?? "";
  const [input, setInput] = useState(asked);
  const [state, setState] = useState<State>({ status: "idle" });
  const [recent, setRecent] = useState<string[]>(() => readRecent());
  const run = useRef(0);

  const show = (result: RiffResult, fresh: boolean) => setState({ status: "done", result, fresh });

  const riff = async (company: string, fresh = false) => {
    const typed = company.replace(/["“”<>]/g, "").replace(/\s+/g, " ").trim();
    if (!typed) return;
    const id = ++run.current;
    const example = EXAMPLES.find((e) => keyOf(e.label) === keyOf(typed));
    if (example && !fresh) return show(example.result, false);
    const hit = seen.get(keyOf(typed));
    if (hit && !fresh) return show(hit, false);
    setState({ status: "loading", company: typed, startedAt: Date.now() });
    try {
      const result = await fetchRiff(typed, fresh);
      if (run.current !== id) return;
      seen.set(keyOf(typed), result);
      remember(typed);
      setRecent(readRecent());
      show(result, !result.cached);
    } catch (e) {
      if (run.current !== id) return;
      setState({ status: "error", company: typed, message: e instanceof RiffError ? e.message : "The whiteboard didn't answer this time." });
    }
  };

  // The URL carries the company (?riff=…), so a riff can be linked and Back works.
  useEffect(() => {
    if (!asked) {
      setState({ status: "idle" });
      return;
    }
    setInput(asked);
    riff(asked);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per company in the URL
  }, [asked]);

  const go = (company: string) => {
    const typed = company.trim();
    if (!typed) return;
    if (typed === asked) riff(typed);
    else
      setParams(
        (p) => {
          const next = new URLSearchParams(p);
          next.set("riff", typed);
          return next;
        },
        { replace: false },
      );
  };

  const busy = state.status === "loading";
  const picks = (
    <div className="mt-4 space-y-3">
      <div>
        <p id="wb-examples" className={label}>
          Open instantly
        </p>
        <div role="group" aria-labelledby="wb-examples" className="mt-2 grid grid-cols-2 gap-2 sm:max-w-md">
          {EXAMPLES.map((e) => (
            <button
              key={e.id}
              type="button"
              disabled={busy}
              onClick={() => go(e.label)}
              className="flex min-w-0 items-center gap-2.5 rounded-[10px] border border-border bg-card p-3 text-left transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <CompanyLogo domain={e.result.domain} name={e.label} size={28} />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold">{e.label}</span>
                <span className="block truncate text-sm text-muted-foreground">{e.note}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      {(account || recent.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {account && (
            <button type="button" disabled={busy} onClick={() => go(account.typed)} className={cx(toggle(false), "disabled:opacity-50")}>
              Riff {account.name}
            </button>
          )}
          {recent
            .filter((c) => !account || keyOf(c) !== keyOf(account.typed))
            .map((c) => (
              <button key={c} type="button" disabled={busy} onClick={() => go(c)} className={cx(toggle(false), "disabled:opacity-50")}>
                {c.replace(/\s*\([^)]*\)\s*$/, "")}
              </button>
            ))}
        </div>
      )}
    </div>
  );

  const company = state.status === "done" ? state.result.riff.company : state.status === "loading" || state.status === "error" ? state.company.replace(/\s*\([^)]*\)\s*$/, "") : "";
  return (
    <div>
      <PageHeader eyebrow="Whiteboard · embedded partnerships" title={`What if ${company || "a company"} put ${seller} inside its own product?`}>
        Type a company. The whiteboard sketches where analytics could live in its product, what it could charge and what that&rsquo;s worth, from its own pages and job posts.
      </PageHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(input);
        }}
        className="mt-6"
      >
        <label htmlFor="wb-company" className="text-[15px] font-bold text-foreground">
          Which company?
        </label>
        <div className="mt-2 flex flex-col gap-2 rounded-xl border border-[#9097A6] bg-card p-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring sm:max-w-2xl sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
            <Search size={17} className="shrink-0 text-muted-foreground" aria-hidden />
            <input
              id="wb-company"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Company name or website"
              autoComplete="off"
              spellCheck={false}
              maxLength={120}
              data-1p-ignore=""
              data-lpignore="true"
              data-bwignore=""
              data-form-type="other"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-[#6B7080] focus:outline-none"
            />
          </div>
          <button type="submit" disabled={busy || !input.trim()} className={cx(primaryBtn, "shrink-0 disabled:cursor-not-allowed")}>
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
            {busy ? "Riffing" : "Riff it"}
            {!busy && <ArrowRight size={16} aria-hidden />}
          </button>
        </div>
      </form>
      {picks}

      {state.status === "loading" && <Waiting company={state.company} startedAt={state.startedAt} />}

      {state.status === "error" && (
        <div role="alert" className="mt-6 rounded-xl border-2 border-foreground bg-white px-4 py-3">
          <p className="text-[17px] font-bold">No riff on {state.company} this time</p>
          <p className="mt-0.5 text-[15px] text-[#4A4F63]">{state.message} Try again, or open one of the saved whiteboards above.</p>
          <button type="button" onClick={() => riff(state.company, true)} className={cx(toggle(false), "mt-3")}>
            Try {state.company} again
          </button>
        </div>
      )}

      {state.status === "done" && (
        <div className="mt-6">
          <RiffCard
            key={state.result.riff.company}
            result={state.result}
            seller={seller}
            fresh={state.fresh}
            onFresh={state.result.example ? undefined : () => riff(asked || input || state.result.riff.company, true)}
          />
        </div>
      )}
    </div>
  );
}
