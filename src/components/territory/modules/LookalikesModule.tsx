import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { MotionConfig, useReducedMotion } from "framer-motion";
import type { MotionLabel } from "@/components/account/AccountViews";
import type { Segment } from "@/lib/sellers";
import { Constellation } from "../lookalikes/Constellation";
import { FingerprintCard } from "../lookalikes/FingerprintCard";
import { LookalikeCard } from "../lookalikes/LookalikeCard";
import { fingerprintOf, rankLookalikes, TRAIT_LABEL, WEIGHTS, type TraitId } from "../lookalikes/model";
import { defaultSeed, seedOptions, useSeedRow } from "../lookalikes/useSeed";
import { datedSources, startOfDay } from "../radar/evidence";
import { OmniRing } from "../radar/segments";
import { MissingNote } from "../radar/States";
import { Memo } from "../Memo";
import { OMNI_TEXT, segmentsOf } from "../model";
import { moduleHref } from "../nav";
import { NextStep } from "../NextStep";
import { PageHeader } from "../PageHeader";
import { cx, primaryButton, secondaryButton } from "../style";
import type { ModuleProps } from "./types";

type MotionFilter = "Any" | MotionLabel;
const MIN_SCORES = [0, 25, 50, 75];

const RULES: Record<TraitId, string> = {
  motion: "Same motion. Half when one side is Both and the other Internal or Embedded.",
  warehouse: "Same confirmed warehouse. Half when both have one, but different.",
  bi: "Same confirmed BI tool, the same tool moved off, or they run what the seed moved off. Half when they have a different confirmed BI tool. The seller's own tool never counts.",
  trigger: "Same kind of dated trigger (funding, acquisition, leadership hire, launch, hiring). Half when both had a different one in the last 90 days.",
  embedded: "Both ship analytics to their own customers, per a source.",
};

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-11 items-center rounded-full px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on ? "border-2 border-primary bg-brand-tint font-bold text-foreground" : "border border-[#D9D4C7] bg-white font-medium text-foreground hover:border-foreground/40",
      )}
    >
      {children}
    </button>
  );
}

/**
 * 05 · Lookalikes: start from a customer on the seller's public list, an
 * account whose own run names Omni (or any territory account), read its
 * fingerprint from its saved run, and rank the rest of the territory by the
 * traits that matter, points shown per trait. Results filter by motion,
 * score and segment.
 */
export function LookalikesModule({ seller, territory, reportId }: ModuleProps) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const options = useMemo(() => seedOptions(seller, territory.rows), [seller, territory.rows]);
  const seedId = reportId ?? defaultSeed(options);
  const seed = useSeedRow(seedId, territory.rows, options);
  const [motion, setMotion] = useState<MotionFilter>("Any");
  const [minScore, setMinScore] = useState(0);
  const [segment, setSegment] = useState<Segment | undefined>(undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const cards = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    setSelected(null);
  }, [seedId]);

  const seedFp = useMemo(() => (seed.row ? fingerprintOf(seed.row, seller.name, startOfDay()) : undefined), [seed.row, seller.name]);
  const ranked = useMemo(() => {
    if (!seedFp) return [];
    const now = startOfDay();
    return rankLookalikes(
      seedFp,
      territory.rows.map((r) => fingerprintOf(r, seller.name, now)),
    );
  }, [seedFp, territory.rows, seller.name]);
  const domains = useMemo(() => Object.fromEntries(territory.rows.map((r) => [r.id, r.domain])), [territory.rows]);

  const keep = (m: MotionFilter, min: number, seg = segment) => ranked.filter((l) => (m === "Any" || l.fp.motion === m) && l.score >= min && (!seg || l.fp.segment === seg));
  const shown = keep(motion, minScore);
  const segments = segmentsOf(seller.territory).filter((sg) => ranked.some((l) => l.fp.segment === sg.id));
  const motions: MotionFilter[] = ["Any", "Internal", "Embedded", "Both", ...(ranked.some((l) => l.fp.motion === "Unclear") ? (["Unclear"] as const) : [])];
  const pickStar = (id: string) => {
    setSelected(id);
    cards.current[id]?.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  };
  const seedOpt = options.find((o) => o.reportId === seedId);
  // The territory picker, grouped by segment (A to Z within each) when the territory has them.
  const picks = options.filter((o) => o.kind === "territory" && o.reportId).sort((a, b) => a.name.localeCompare(b.name));
  const allSegments = segmentsOf(seller.territory);
  const pickerGroups = picks.some((o) => o.segment)
    ? [
        ...allSegments.map((sg) => ({ key: sg.id as string, label: `${sg.label} · ${sg.note}`, options: picks.filter((o) => o.segment === sg.id) })),
        { key: "other", label: "Other accounts", options: picks.filter((o) => !allSegments.some((sg) => sg.id === o.segment)) },
      ].filter((g) => g.options.length)
    : [{ key: "all", label: "", options: picks }];

  return (
    <MotionConfig reducedMotion="user">
      <PageHeader eyebrow="Lookalikes · scored trait by trait" title={seed.row ? `Accounts that look like ${seed.row.name}` : "More like your customers"}>
        Start from a customer on {seller.name}&rsquo;s public list, an account whose job posts name {seller.name}, or any account in the territory. Its saved run gives a
        fingerprint; every other account is scored against it, trait by trait.
      </PageHeader>

      <div data-tour="lookalikes-seed" className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-3">
        <div role="group" aria-label="Start from a customer" className="flex flex-wrap items-center gap-2">
          {options
            .filter((o) => o.kind === "customer")
            .map((o) => {
              const on = o.reportId === seedId;
              return (
                <button
                  key={`customer-${o.reportId ?? o.name}`}
                  type="button"
                  aria-pressed={on}
                  disabled={!o.reportId}
                  onClick={() => o.reportId && navigate(moduleHref(seller.id, "lookalikes", o.reportId))}
                  className={cx(
                    "inline-flex min-h-[46px] flex-wrap items-center gap-x-2 gap-y-0.5 rounded-[10px] bg-white px-4 py-1.5 text-left text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
                    on ? "border-2 border-primary font-bold" : "border border-[#D9D4C7] font-semibold hover:border-foreground/40",
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    {o.omni && o.reportId && <OmniRing status={o.omni} />}
                    {o.name}
                  </span>
                  <span className="text-[13px] font-medium text-[#4A4F63]">
                    {!o.reportId ? "no saved run yet" : o.omni === "Likely" ? OMNI_TEXT.Likely.full : `On ${seller.name}'s public customer list`}
                  </span>
                </button>
              );
            })}
        </div>
        {options.some((o) => o.kind === "territory") && (
          <label className="flex w-full flex-col gap-1 sm:w-auto">
            <span className="font-mono text-xs font-semibold text-[#4A4F63]">or a territory account</span>
            <select
              value={seedOpt?.kind === "territory" ? seedId : ""}
              onChange={(e) => e.target.value && navigate(moduleHref(seller.id, "lookalikes", e.target.value))}
              className={cx(
                "min-h-[46px] rounded-[10px] bg-white px-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                seedOpt?.kind === "territory" ? "border-2 border-primary font-bold" : "border border-[#D9D4C7] font-semibold",
              )}
            >
              <option value="">Choose an account…</option>
              {pickerGroups.map((g) =>
                g.label ? (
                  <optgroup key={g.key} label={g.label}>
                    {g.options.map((o) => (
                      <option key={o.reportId} value={o.reportId}>
                        {o.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  g.options.map((o) => (
                    <option key={o.reportId} value={o.reportId}>
                      {o.name}
                    </option>
                  ))
                ),
              )}
            </select>
          </label>
        )}
        {territory.loading && <Loader2 size={16} className="mb-3.5 animate-spin text-muted-foreground" aria-label="Loading accounts" />}
      </div>

      <MissingNote missing={territory.missing} shown={territory.rows.length} className="mt-5" />

      {seed.loading && (
        <div aria-busy="true" className="mt-5 flex flex-col gap-3 rounded-[14px] border border-border bg-white p-5">
          <span className="font-display text-xl font-semibold">Reading {seedOpt?.name ?? "the seed"}&rsquo;s saved run…</span>
          {[60, 85, 45].map((w) => (
            <span key={w} aria-hidden className="block h-3.5 rounded bg-muted" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}
      {seed.failed && (
        <div role="alert" className="mt-5 rounded-[10px] border-2 border-foreground bg-background px-4 py-3.5">
          <p className="text-[17px] font-bold">That saved run couldn&rsquo;t be read</p>
          <p className="mt-1 text-[15px] text-[#4A4F63]">Pick another starting point above.</p>
        </div>
      )}

      {seed.row && seedFp && (
        <>
          <div className="mt-5">
            <FingerprintCard fp={seedFp} sources={datedSources(seed.row)} sellerName={seller.name} domain={seed.row.domain} />
          </div>

          <Memo className="mt-3" title="How the score works" count="five traits, out of 100">
            <div className="text-[15px] text-[#4A4F63]">
              <p>
                Each trait adds its points when it matches (✓), half when it partly matches (½), nothing otherwise (–). A trait the seed has no evidence for (?) adds nothing for
                anyone. Out of 100:
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {(Object.keys(WEIGHTS) as TraitId[]).map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="w-24 shrink-0 font-semibold text-foreground">
                      {TRAIT_LABEL[t]} <span className="font-mono text-sm">{WEIGHTS[t]}</span>
                    </span>
                    <span>{RULES[t]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Memo>

          <section aria-label="Filters" className="mt-4 flex flex-wrap items-start gap-x-5 gap-y-3">
            <div role="group" aria-label="Motion" className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 font-mono text-xs font-semibold text-[#4A4F63]">Motion</span>
              {motions.map((m) => (
                <Toggle key={m} on={motion === m} onClick={() => setMotion(m)}>
                  {m}
                </Toggle>
              ))}
            </div>
            <div role="group" aria-label="Minimum score" className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 font-mono text-xs font-semibold text-[#4A4F63]">Min score</span>
              {MIN_SCORES.map((s) => (
                <Toggle key={s} on={minScore === s} onClick={() => setMinScore(s)}>
                  {s ? `${s}+` : "Any"}
                </Toggle>
              ))}
            </div>
            {segments.length > 0 && (
              <div role="group" aria-label="Segment" className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 font-mono text-xs font-semibold text-[#4A4F63]">Segment</span>
                {[undefined, ...segments.map((sg) => sg.id)].map((id) => (
                  <Toggle key={id ?? "all"} on={segment === id} onClick={() => setSegment(id)}>
                    {id ?? "All"}
                    <span className="ml-1.5 font-mono text-xs font-normal text-[#4A4F63]">{keep(motion, minScore, id).length}</span>
                  </Toggle>
                ))}
              </div>
            )}
          </section>

          {!ranked.length ? (
            <div className="mt-5 rounded-xl border border-dotted border-[#9097A6] bg-white p-6 text-center">
              <h2 className="font-display text-[22px] font-semibold">No other accounts to compare yet</h2>
              <p className="mt-1.5 text-[15px] text-[#4A4F63]">Lookalikes rank the territory&rsquo;s saved runs. Run more accounts and they show up here.</p>
            </div>
          ) : (
            <div className="mt-5 grid items-start gap-7 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] xl:grid-cols-[minmax(280px,440px)_minmax(0,1fr)]">
              <section aria-label="Constellation" className="lg:sticky lg:top-4">
                <div className="mx-auto max-w-[440px]">
                  <Constellation seed={seedFp} items={shown} selected={selected} onPick={pickStar} />
                  <p className="mt-3 text-[15px] text-[#4A4F63]">Closer to the center = more alike. Size = fit.</p>
                  <p className="mt-2 rounded-[10px] border border-dotted border-[#9097A6] px-3 py-2.5 text-[15px] text-[#4A4F63]">
                    Ranked from this territory&rsquo;s saved runs. A live version would search the web for new companies like this one.
                  </p>
                </div>
              </section>

              <section aria-labelledby="ranked-title" className="flex min-w-0 flex-col gap-3">
                <h2 id="ranked-title" className="font-display text-[22px] font-semibold tracking-[-0.01em]">
                  {shown.length ? `Ranked lookalikes · ${shown.length}` : "No matches"}
                </h2>
                {shown.length ? (
                  shown.map((l, i) => (
                    <LookalikeCard
                      key={l.fp.id}
                      ref={(el) => {
                        cards.current[l.fp.id] = el;
                      }}
                      item={l}
                      rank={i + 1}
                      seller={seller.id}
                      domain={domains[l.fp.id]}
                      selected={selected === l.fp.id}
                      onPick={() => setSelected(l.fp.id)}
                    />
                  ))
                ) : (
                  <EmptyFilters
                    seedName={seedFp.name}
                    seedMotion={seedFp.motion}
                    motion={motion}
                    minScore={minScore}
                    segment={segment}
                    countWithout={{ motion: keep("Any", minScore).length, score: keep(motion, 0).length, segment: keep(motion, minScore, undefined).length }}
                    onDropMotion={() => setMotion("Any")}
                    onDropScore={() => setMinScore(0)}
                    onDropSegment={() => setSegment(undefined)}
                    onReset={() => {
                      setMotion("Any");
                      setMinScore(0);
                      setSegment(undefined);
                    }}
                  />
                )}
              </section>
            </div>
          )}
        </>
      )}
      <NextStep seller={seller.id} from="lookalikes" />
    </MotionConfig>
  );
}

/** Filters left nothing: say why, and offer the one change that brings matches back. */
function EmptyFilters({
  seedName,
  seedMotion,
  motion,
  minScore,
  segment,
  countWithout,
  onDropMotion,
  onDropScore,
  onDropSegment,
  onReset,
}: {
  seedName: string;
  seedMotion: MotionLabel;
  motion: MotionFilter;
  minScore: number;
  segment?: Segment;
  countWithout: { motion: number; score: number; segment: number };
  onDropMotion: () => void;
  onDropScore: () => void;
  onDropSegment: () => void;
  onReset: () => void;
}) {
  const kind = segment ? `${segment} account` : "account";
  const why =
    motion !== "Any" && motion !== seedMotion
      ? `${seedName}'s fingerprint is ${seedMotion.toLowerCase()}, and no ${motion.toLowerCase()} ${kind} clears the bar.`
      : minScore
        ? `No ${kind} scores ${minScore} or more against ${seedName}.`
        : segment
          ? `No ${kind} in the territory matches these filters.`
          : "No account matches these filters.";
  const dropMotion = motion !== "Any" && countWithout.motion > 0;
  const dropScore = minScore > 0 && countWithout.score > 0 && !dropMotion;
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-xl border border-dotted border-[#9097A6] bg-white p-6 text-center">
      <h3 className="font-display text-[22px] font-semibold">No lookalikes match these filters</h3>
      <p className="text-[15px] text-[#4A4F63]">{why}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {dropMotion && (
          <button type="button" onClick={onDropMotion} className={cx(primaryButton, "text-[15px]")}>
            Drop &ldquo;{motion}&rdquo;: {countWithout.motion} match{countWithout.motion === 1 ? "" : "es"}
          </button>
        )}
        {dropScore && (
          <button type="button" onClick={onDropScore} className={cx(primaryButton, "text-[15px]")}>
            Any score: {countWithout.score} match{countWithout.score === 1 ? "" : "es"}
          </button>
        )}
        {segment && countWithout.segment > 0 && !dropMotion && !dropScore && (
          <button type="button" onClick={onDropSegment} className={cx(primaryButton, "text-[15px]")}>
            All segments: {countWithout.segment} match{countWithout.segment === 1 ? "" : "es"}
          </button>
        )}
        <button type="button" onClick={onReset} className={cx(secondaryButton, "text-[15px]")}>
          Reset filters
        </button>
      </div>
    </div>
  );
}
