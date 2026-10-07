import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Loader2 } from "lucide-react";
import { linkBtn } from "@/components/account/explorer/look";
import { CompanyLogo } from "../company/CompanyLogo";
import type { TerritoryRow } from "../model";
import { cx, primaryButton, secondaryButton } from "../style";
import { EvidenceTag, FieldPill } from "../ui";
import { asSeed, excludeFrom, fetchSuggestions, researchHref, SuggestError, type BeyondSeed, type Suggestion, type SuggestResult } from "./beyond";

/** The function takes 10–25 seconds; give up after a minute. */
const TIMEOUT_MS = 60_000;
const DEFAULT_REGION = "Southeast US";

type State =
  | { status: "idle" }
  | { status: "loading"; startedAt: number }
  | { status: "error"; message: string }
  | { status: "done"; list: Suggestion[]; grounded: boolean; funnel?: SuggestResult["funnel"] };

/** Seconds since `startedAt`, ticking once a second. */
function Elapsed({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return <span className="font-mono text-sm tabular-nums text-[#4A4F63]">{Math.max(0, Math.round((now - startedAt) / 1000))}s</span>;
}

/** One suggestion, compact: who, where, why (a hypothesis), the motion guess, and research it live. */
function SuggestionCard({ s, seller, seedTools }: { s: Suggestion; seller: string; seedTools: string[] }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3.5">
      <div className="flex items-center gap-2.5">
        <CompanyLogo domain={s.domain} name={s.name} size={28} />
        <div className="min-w-0">
          <h3 className="font-display text-[17px] font-semibold leading-tight">{s.name}</h3>
          {(s.hq || s.employees) && (
            <p className="text-[13px] text-[#4A4F63]" title={s.employees ? "Headcount from the page's company data" : undefined}>
              {[s.hq, s.employees ? `about ${s.employees.toLocaleString("en-US")} people` : ""].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
      <p className="text-[15px] leading-snug">
        <EvidenceTag status="Hypothesis" className="mr-1.5 h-[22px] align-[1px]" />
        {s.why}
      </p>
      {s.listedTools && (
        <p className="text-[13px] text-[#4A4F63]" title="From Exa's company data, a third-party list. Not checked yet: research it live to confirm.">
          Its company data lists{" "}
          {s.listedTools.map((t, i) => (
            <span key={t}>
              {i > 0 && ", "}
              <span className={seedTools.includes(t) ? "font-semibold text-foreground" : undefined}>{t}</span>
            </span>
          ))}
        </p>
      )}
      {s.source && (
        <a href={s.source.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 self-start rounded text-[13px] text-[#4A4F63] underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Found on the web
          <ArrowUpRight size={13} aria-hidden />
        </a>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3">
        <FieldPill>Motion guess: {s.motion_guess}</FieldPill>
        <Link to={researchHref(seller, s)} className={linkBtn}>
          Research it live
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </li>
  );
}

/**
 * Beyond the territory, the view's main action: on request, AI names a
 * handful of real companies that may look like the seed and aren't in the
 * territory. Each is a hypothesis, not researched, with one click to research
 * it live. Nothing is stored; a new seed clears the results.
 */
export function BeyondTerritory({ seller, seed, rows, region }: { seller: string; seed: TerritoryRow | BeyondSeed; rows: Pick<TerritoryRow, "name" | "domain">[]; region?: string }) {
  const s = useMemo(() => asSeed(seed), [seed]);
  const seedKey = `${s.name}|${s.domain ?? ""}`;
  const [state, setState] = useState<State>({ status: "idle" });
  const call = useRef<AbortController | null>(null);

  // A new seed clears the results and drops a call in flight.
  useEffect(() => {
    setState({ status: "idle" });
    return () => {
      call.current?.abort();
      call.current = null;
    };
  }, [seedKey]);

  const run = async () => {
    call.current?.abort();
    const ctrl = new AbortController();
    call.current = ctrl;
    const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    setState({ status: "loading", startedAt: Date.now() });
    try {
      const found = await fetchSuggestions({ seed: s, exclude: excludeFrom(rows, s), ...(region ? { region } : {}) }, ctrl.signal);
      if (call.current === ctrl) setState({ status: "done", ...found });
    } catch (e) {
      if (call.current !== ctrl) return;
      const message = e instanceof SuggestError ? e.message : ctrl.signal.aborted ? "No answer after a minute." : "Suggestions aren’t available right now.";
      setState({ status: "error", message });
    } finally {
      window.clearTimeout(timer);
      if (call.current === ctrl) call.current = null;
    }
  };

  return (
    <section data-tour="lookalikes-find" aria-labelledby="beyond-title" className="rounded-xl border border-border bg-white px-4 py-3.5 sm:px-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <h2 id="beyond-title" className="min-w-0 font-display text-lg font-semibold leading-snug sm:text-xl">
          Companies like {s.name} that aren&rsquo;t in your territory yet
        </h2>
        {state.status === "idle" && (
          <button type="button" onClick={run} className={cx(primaryButton, "w-full text-[15px] sm:w-auto")}>
            Find new companies like {s.name}
          </button>
        )}
        {state.status === "done" && (
          <button type="button" onClick={run} className={cx(secondaryButton, "w-full text-[15px] sm:w-auto")}>
            Find again
          </button>
        )}
      </div>

      {state.status === "loading" && (
        <div role="status" aria-live="polite" className="mt-3 flex items-start gap-3 rounded-xl border border-dotted border-[#9097A6] bg-background px-4 py-3">
          <Loader2 size={18} aria-hidden className="mt-0.5 shrink-0 motion-safe:animate-spin" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">
              Searching the web for companies like {s.name} in the {region ?? DEFAULT_REGION}, then checking each one…
            </p>
            <p className="mt-0.5 text-[15px] text-[#4A4F63]">Usually 10 to 25 seconds.</p>
          </div>
          <Elapsed startedAt={state.startedAt} />
        </div>
      )}

      {state.status === "error" && (
        <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border-2 border-foreground bg-background px-4 py-3">
          <div>
            <p className="text-[17px] font-bold">No suggestions this time</p>
            <p className="mt-0.5 text-[15px] text-[#4A4F63]">{state.message}</p>
          </div>
          <button type="button" onClick={run} className={cx(secondaryButton, "text-[15px]")}>
            Try again
          </button>
        </div>
      )}

      {state.status === "done" &&
        (state.list.length ? (
          <>
            <ul aria-label={`Suggestions like ${s.name}`} className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {state.list.map((x) => (
                <SuggestionCard key={x.domain} s={x} seller={seller} seedTools={s.tools} />
              ))}
            </ul>
            <p className="mt-2.5 text-[15px] text-[#4A4F63]">
              {state.grounded
                ? `${state.funnel ? `Exa found ${state.funnel.found} companies on the web · ${state.funnel.inRegion} in the ${region ?? DEFAULT_REGION} · ${state.funnel.kept} kept. ` : "Found on the web with Exa. "}AI picked and phrased them; code checked the place and the website. Not researched yet.`
                : "AI suggestions, not researched yet. Each website answered when checked."}
            </p>
          </>
        ) : (
          <p className="mt-3 rounded-xl border border-dotted border-[#9097A6] bg-background px-4 py-3 text-[15px] text-[#4A4F63]">
            No suggestion passed the checks this time (outside the territory, a website that answers). Find again for a new list.
          </p>
        ))}
    </section>
  );
}
