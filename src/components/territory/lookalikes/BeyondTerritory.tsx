import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Loader2 } from "lucide-react";
import type { TerritoryRow } from "../model";
import { cx, secondaryButton } from "../style";
import { EvidenceTag, FieldPill } from "../ui";
import { asSeed, excludeFrom, fetchSuggestions, researchHref, SuggestError, type BeyondSeed, type Suggestion } from "./beyond";

/** The function takes 10–25 seconds; give up after a minute. */
const TIMEOUT_MS = 60_000;
const DEFAULT_REGION = "Southeast US";

type State = { status: "idle" } | { status: "loading"; startedAt: number } | { status: "error"; message: string } | { status: "done"; list: Suggestion[] };

/** Seconds since `startedAt`, ticking once a second. */
function Elapsed({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return <span className="font-mono text-sm tabular-nums text-[#4A4F63]">{Math.max(0, Math.round((now - startedAt) / 1000))}s</span>;
}

function SuggestionCard({ s, seller }: { s: Suggestion; seller: string }) {
  return (
    <li className="flex flex-col gap-2.5 rounded-xl border border-border bg-white p-4">
      <div>
        <h3 className="font-display text-[19px] font-semibold leading-tight">{s.name}</h3>
        <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-[#4A4F63]">
          <a
            href={`https://${s.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${s.domain} (opens in a new tab)`}
            className="inline-flex min-h-11 items-center gap-0.5 font-mono text-[13px] font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {s.domain}
            <ArrowUpRight size={14} aria-hidden />
          </a>
          {s.hq && (
            <>
              <span aria-hidden>·</span>
              <span>{s.hq}</span>
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <EvidenceTag status="Hypothesis" />
        <FieldPill>Motion guess: {s.motion_guess}</FieldPill>
      </div>
      <p className="text-[15px] leading-snug">{s.why}</p>
      <Link to={researchHref(seller, s)} className={cx(secondaryButton, "mt-auto self-start text-[15px]")}>
        Research it live
        <ArrowRight size={16} aria-hidden />
      </Link>
    </li>
  );
}

/**
 * Beyond the territory: on request, AI names a handful of real companies that
 * may look like the seed and aren't in the territory. Each is a hypothesis,
 * not researched, with one click to research it live. Nothing is stored; a
 * new seed clears the results.
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
      const list = await fetchSuggestions({ seed: s, exclude: excludeFrom(rows, s), ...(region ? { region } : {}) }, ctrl.signal);
      if (call.current === ctrl) setState({ status: "done", list });
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
    <section aria-labelledby="beyond-title" className="mt-8 border-t border-border pt-6">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id="beyond-title" className="font-display text-[22px] font-semibold tracking-[-0.01em]">
            Beyond the territory
          </h2>
          <p className="mt-1 text-[15px] text-[#4A4F63]">AI suggestions like {s.name}. Not researched yet.</p>
        </div>
        {(state.status === "idle" || state.status === "done") && (
          <button type="button" onClick={run} className={cx(secondaryButton, "text-[15px]")}>
            {state.status === "done" ? "Suggest again" : `Suggest companies like ${s.name}`}
          </button>
        )}
      </div>

      {state.status === "loading" && (
        <div role="status" aria-live="polite" className="mt-4 flex items-start gap-3 rounded-xl border border-dotted border-[#9097A6] bg-white px-4 py-3.5">
          <Loader2 size={18} aria-hidden className="mt-0.5 shrink-0 motion-safe:animate-spin" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">
              Asking AI for companies in the {region ?? DEFAULT_REGION} like {s.name}, then checking each website answers…
            </p>
            <p className="mt-0.5 text-[15px] text-[#4A4F63]">Usually 10 to 25 seconds.</p>
          </div>
          <Elapsed startedAt={state.startedAt} />
        </div>
      )}

      {state.status === "error" && (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border-2 border-foreground bg-background px-4 py-3">
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
            <ul aria-label={`Suggestions like ${s.name}`} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {state.list.map((x) => (
                <SuggestionCard key={x.domain} s={x} seller={seller} />
              ))}
            </ul>
            <p className="mt-3 text-[15px] text-[#4A4F63]">Each website answered when checked. Nothing else is checked until you research it.</p>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-dotted border-[#9097A6] bg-white px-4 py-3.5 text-[15px] text-[#4A4F63]">
            No suggestion passed the checks this time (outside the territory, a website that answers). Suggest again for a new list.
          </p>
        ))}
    </section>
  );
}
