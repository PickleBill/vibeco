import { useMemo, useState, type ReactNode } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { linkBtn, secondaryBtn } from "@/components/account/explorer/look";
import { CompanyLogo } from "../company/CompanyLogo";
import { cx } from "../style";
import { EvidenceTag, FieldPill, SourceChip } from "../ui";
import { PriceModel } from "./PriceModel";
import { casesFrom, fitText, priceCase, riffText, type CaseResult, type RiffPricing, type RiffResult } from "./model";

const asSource = (s: RiffResult["sources"][number]): ResearchSource => ({ id: s.id, title: s.title, url: s.url, snippet: s.snippet, kind: s.kind });

function Chips({ ids, sources }: { ids: number[]; sources: RiffResult["sources"] }) {
  const known = ids.map((i) => sources.find((s) => s.id === i)).filter((s): s is RiffResult["sources"][number] => !!s);
  if (!known.length) return null;
  return (
    <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">
      {known.map((s) => (
        <SourceChip key={s.id} n={s.id} source={asSource(s)} />
      ))}
    </span>
  );
}

/** A sticky note on the board: a mono label and its contents. */
function Note({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cx("min-w-0 rounded-xl border border-border bg-white p-4 shadow-[0_1px_0_rgba(26,29,46,0.04)] sm:p-5", className)}>
      <h3 className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-[#4A4F63]">{label}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Where analytics would live: a wireframe of the screen, labeled a sketch, with what their customer would see. */
function SurfaceSketch({ surface, sees, metrics }: { surface: string; sees: string; metrics: string[] }) {
  // "Messaging Insights (Message Logs, Usage pages)": the name on the bar, the detail under it.
  const [, name = surface, detail] = /^(.+?)\s*\(([^)]*)\)\s*$/.exec(surface) ?? [];
  return (
    <figure className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-[#C9C3B4] bg-white">
      <div className="flex items-center gap-1.5 border-b border-[#E4E0D6] bg-[#FBFAF7] px-3 py-2">
        <span aria-hidden className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2 w-2 rounded-full bg-[#D9D4C7]" />
          ))}
        </span>
        <figcaption title={surface} className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-foreground">
          {name}
        </figcaption>
        <span className="rounded-[4px] border border-dashed border-[#9097A6] px-1.5 font-mono text-[11px] text-[#4A4F63]">sketch</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        {detail && <p className="-mb-1.5 text-[13px] leading-snug text-[#4A4F63]">{detail}</p>}
        <p className="text-[15px] leading-snug text-foreground">{sees}</p>
        {metrics.length > 0 && (
          <ul className="mt-auto grid grid-cols-2 gap-2">
            {metrics.map((m) => (
              <li key={m} className="rounded-md border border-dashed border-[#C9C3B4] px-2 py-1.5">
                <span className="block truncate text-xs font-medium text-[#4A4F63]">{m}</span>
                <span aria-hidden className="mt-1.5 block h-1.5 w-2/3 rounded bg-[#E9E5DA]" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </figure>
  );
}

const CONFIDENCE: Record<string, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

/**
 * One partnership riff on the whiteboard: the idea, where analytics would
 * live in their product, the company, its stack, a price model you can edit,
 * a SWOT and the next move. Every claim carries its source; an inferred one
 * says so. When embedded doesn't fit, the internal play leads.
 */
export function RiffCard({ result, seller, onFresh, fresh }: { result: RiffResult; seller: string; onFresh?: () => void; fresh?: boolean }) {
  const { riff, sources } = result;
  const [priced, setPriced] = useState<{ shape: RiffPricing; cases: { low: CaseResult; high: CaseResult } } | null>(null);
  const [copied, setCopied] = useState(false);
  const notFit = riff.embedded_fit.verdict === "not_a_fit";
  const [sketchAnyway, setSketchAnyway] = useState(false);
  // The riff's own numbers, for a copy made before (or without) the price model.
  const asGiven = useMemo(() => {
    const c = casesFrom(riff.gtm.assumptions);
    const shape = riff.gtm.pricing_shape;
    return { shape, cases: { low: priceCase(c.low, shape), high: priceCase(c.high, shape) } };
  }, [riff]);
  const article = /^[aeiou]/i.test(seller) ? "an" : "a";

  const copy = async () => {
    const p = priced ?? asGiven;
    if (await copyToClipboard(riffText(result, p.shape, p.cases, seller))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const grounding =
    riff.grounding === "illustrative" ? "Illustrative example" : riff.grounding === "model-knowledge" ? "Model knowledge, unverified" : `${sources.length} source${sources.length === 1 ? "" : "s"}`;
  const when = result.savedAt ? new Date(result.savedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;

  const internal = riff.internal_play && (
    <Note label="The internal play">
      <p className="text-[15px] leading-relaxed text-foreground">{riff.internal_play}</p>
    </Note>
  );

  return (
    <article
      aria-labelledby="riff-title"
      className="rounded-2xl border border-foreground bg-[#F4F2EC] p-3 sm:p-5"
      style={{ backgroundImage: "radial-gradient(#D9D4C7 1px, transparent 1px)", backgroundSize: "18px 18px" }}
    >
      {/* The idea, pinned at the top. */}
      <div className="rounded-xl border border-foreground bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <CompanyLogo domain={result.domain} name={riff.company} size={40} />
          <h2 id="riff-title" className="min-w-0 font-display text-[1.75rem] font-bold leading-tight tracking-[-0.02em]">
            {riff.company}
          </h2>
        </div>
        <ul aria-label="About this riff" className="mt-3 flex flex-wrap items-center gap-2">
          <li>
            <FieldPill className={cx(riff.embedded_fit.verdict === "strong" && "border-[#16703F] text-[#16703F]")}>Embedded fit: {fitText(riff.embedded_fit.verdict)}</FieldPill>
          </li>
          <li>
            <FieldPill>{CONFIDENCE[riff.confidence]}</FieldPill>
          </li>
          <li>
            <FieldPill className={cx(riff.grounding !== "sources" && "border-dashed")}>{grounding}</FieldPill>
          </li>
          {(result.example || when) && (
            <li>
              <FieldPill>{result.example ? "Made-up company" : `Saved riff · ${when}`}</FieldPill>
            </li>
          )}
          {fresh && result.latencyMs != null && (
            <li>
              <FieldPill>Live · {Math.round(result.latencyMs / 1000)}s</FieldPill>
            </li>
          )}
        </ul>
        <p className="mt-4 max-w-4xl font-display text-xl font-semibold leading-snug tracking-[-0.01em] text-foreground sm:text-2xl">{riff.headline}</p>
        {riff.embedded_fit.why && <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#4A4F63]">{riff.embedded_fit.why}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button type="button" onClick={copy} className={cx(secondaryBtn, "min-h-10 text-[15px]")}>
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            {copied ? "Copied" : "Copy for a rep"}
          </button>
          {onFresh && (
            <button type="button" onClick={onFresh} className={cx(linkBtn, "text-[#4A4F63] hover:text-foreground")}>
              <RotateCcw size={14} aria-hidden /> Riff it fresh
            </button>
          )}
        </div>
      </div>

      {notFit && (
        <p role="note" className="mt-4 rounded-xl border-2 border-foreground bg-white px-4 py-3 text-[15px] leading-relaxed text-foreground">
          <b>Not an embedded fit.</b> {riff.embedded_fit.why} The play here is internal analytics.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {notFit && internal && <div className="lg:col-span-12">{internal}</div>}

        {riff.embedded_opportunity.length > 0 && (
          <Note label={notFit ? "If they ever ship a customer product" : "Where it lives in their product"} className="lg:col-span-12">
            <div className={cx("grid grid-cols-1 gap-3", riff.embedded_opportunity.length > 1 && "sm:grid-cols-2", riff.embedded_opportunity.length > 2 && "xl:grid-cols-3")}>
              {riff.embedded_opportunity.map((o) => (
                <SurfaceSketch key={o.surface} surface={o.surface} sees={o.end_customer_sees} metrics={o.metrics} />
              ))}
            </div>
          </Note>
        )}

        {riff.situation.length > 0 && (
          <Note label="The situation" className="lg:col-span-6">
            <ul className="flex flex-col gap-2.5">
              {riff.situation.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px] leading-snug">
                  <EvidenceTag status={s.basis === "known" ? "Known" : "Inferred"} className="mt-0.5 shrink-0" />
                  <span>
                    {s.claim}
                    <Chips ids={s.sources} sources={sources} />
                  </span>
                </li>
              ))}
            </ul>
          </Note>
        )}

        <Note label="Integration landscape" className={riff.situation.length ? "lg:col-span-6" : "lg:col-span-12"}>
          {riff.integration.stack.length > 0 ? (
            <ul aria-label="Stack" className="flex flex-wrap gap-2">
              {riff.integration.stack.map((s) => (
                <li key={s.tool} className="flex items-center gap-1.5">
                  <EvidenceTag status={s.status} />
                  <span className="text-[15px] font-semibold">{s.tool}</span>
                  <Chips ids={s.sources} sources={sources} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] text-[#4A4F63]">No source names its data stack.</p>
          )}
          {riff.integration.incumbent && (
            <p className="mt-3 text-[15px]">
              <span className="font-semibold">Today&rsquo;s reporting:</span> {riff.integration.incumbent.name}
              {riff.integration.incumbent.status === "Inferred" ? " (inferred)" : ""}
              <Chips ids={riff.integration.incumbent.sources} sources={sources} />
            </p>
          )}
          {riff.integration.omni_fit && (
            <p className="mt-3 text-[15px] leading-relaxed">
              <span className="font-semibold">Fit with {seller}:</span> {riff.integration.omni_fit}
            </p>
          )}
        </Note>

        <Note label="Price to value" className="lg:col-span-12">
          {riff.gtm.monetization.length > 0 && (
            <ul className="mb-4 flex flex-col gap-1.5">
              {riff.gtm.monetization.map((m) => (
                <li key={m} className="flex gap-2 text-[15px] leading-snug">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {m}
                </li>
              ))}
            </ul>
          )}
          {notFit && !sketchAnyway ? (
            <button type="button" onClick={() => setSketchAnyway(true)} className={cx(linkBtn)}>
              Sketch the embedded price anyway
            </button>
          ) : (
            <PriceModel riff={riff} seller={seller} onChange={(shape, cases) => setPriced({ shape, cases })} />
          )}
        </Note>

        {(riff.swot.strengths.length > 0 || riff.swot.threats.length > 0) && (
          <Note label="SWOT" className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["Strengths", riff.swot.strengths],
                  ["Weaknesses", riff.swot.weaknesses],
                  ["Opportunities", riff.swot.opportunities],
                  ["Threats", riff.swot.threats],
                ] as const
              ).map(([name, items]) => (
                <div key={name} className="rounded-lg bg-[#FBFAF7] p-3">
                  <p className="text-sm font-bold">{name}</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {items.map((x) => (
                      <li key={x} className="text-[15px] leading-snug text-foreground">
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Note>
        )}

        <Note label="Next move" className={riff.swot.strengths.length || riff.swot.threats.length ? "lg:col-span-5" : "lg:col-span-12"}>
          <p className="text-[15px]">
            <span className="font-semibold">Call:</span> {riff.next_move.who}
          </p>
          <p className="mt-2 font-display text-lg font-semibold leading-snug">&ldquo;{riff.next_move.first_question}&rdquo;</p>
          {!notFit && riff.internal_play && (
            <p className="mt-3 border-t border-border pt-3 text-[15px] leading-relaxed">
              <span className="font-semibold">Internal play:</span> {riff.internal_play}
            </p>
          )}
        </Note>
      </div>

      <footer className="mt-4 rounded-xl border border-border bg-white px-4 py-3 sm:px-5">
        {sources.length > 0 && (
          <ol aria-label="Sources" className="mb-2.5 flex flex-col gap-1">
            {sources.map((s) => (
              <li key={s.id} className="flex items-baseline gap-2 text-sm">
                <span className="font-mono text-xs font-semibold">{s.id}</span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-foreground underline-offset-2 hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        )}
        <p className="text-[13px] text-[#4A4F63]">Exploratory brief. Not {article} {seller} product; figures are estimates.</p>
      </footer>
    </article>
  );
}
