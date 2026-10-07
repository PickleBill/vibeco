import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { MotionConfig, useReducedMotion } from "framer-motion";
import type { MotionLabel } from "@/components/account/AccountViews";
import { toggle } from "@/components/account/explorer/look";
import type { Segment } from "@/lib/sellers";
import { AccountSwitcher } from "../AccountSwitcher";
import { CompanyLogo } from "../company/CompanyLogo";
import { BeyondTerritory } from "../lookalikes/BeyondTerritory";
import { Constellation } from "../lookalikes/Constellation";
import { FingerprintCard } from "../lookalikes/FingerprintCard";
import { LookalikeCard } from "../lookalikes/LookalikeCard";
import { fingerprintOf, rankLookalikes, TRAIT_LABEL, WEIGHTS, type TraitId } from "../lookalikes/model";
import { defaultSeed, seedOptions, useSeedRow, type SeedOption } from "../lookalikes/useSeed";
import { startOfDay } from "../radar/evidence";
import { MissingNote } from "../radar/States";
import { Memo } from "../Memo";
import { segmentsOf } from "../model";
import { moduleHref } from "../nav";
import { NextStep } from "../NextStep";
import { PageHeader } from "../PageHeader";
import { cx, primaryButton, secondaryButton } from "../style";
import type { ModuleProps } from "./types";

type MotionFilter = "Any" | MotionLabel;
/** Ranked cards shown before "Show all". */
const TOP = 10;

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

/** A seed card's one short status line. */
const seedStatus = (o: SeedOption) => (o.kind === "recent" ? "Just ran" : !o.reportId ? "No saved run yet" : o.omni === "Likely" ? "Named in job posts" : "On the public list");

/**
 * 03 · Lookalikes: start from a customer on the seller's public list, an
 * account whose own run names Omni, or any territory account. The main
 * action finds new companies like it beyond the territory; below, the rest
 * of the territory is ranked against the seed's traits, points per trait
 * behind each score. Results filter by motion and segment.
 */
export function LookalikesModule({ seller, territory, reportId, justRan }: ModuleProps) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const options = useMemo(() => seedOptions(seller, territory.rows, justRan), [seller, territory.rows, justRan]);
  const seedId = reportId ?? defaultSeed(options);
  const seed = useSeedRow(seedId, territory.rows, options);
  const [motion, setMotion] = useState<MotionFilter>("Any");
  const [segment, setSegment] = useState<Segment | undefined>(undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const cards = useRef<Record<string, HTMLElement | null>>({});
  // A star picked past the top ten opens the full list, then scrolls to its card.
  const scrollTo = useRef<string | null>(null);

  useEffect(() => {
    setSelected(null);
    setAll(false);
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
  const rowsById = useMemo(() => Object.fromEntries(territory.rows.map((r) => [r.id, r])), [territory.rows]);

  const keep = (m: MotionFilter, seg = segment) => ranked.filter((l) => (m === "Any" || l.fp.motion === m) && (!seg || l.fp.segment === seg));
  const shown = keep(motion);
  const visible = all ? shown : shown.slice(0, TOP);
  const segments = segmentsOf(seller.territory).filter((sg) => ranked.some((l) => l.fp.segment === sg.id));
  const motions: MotionFilter[] = ["Any", "Internal", "Embedded", "Both", ...(ranked.some((l) => l.fp.motion === "Unclear") ? (["Unclear"] as const) : [])];

  useEffect(() => {
    const id = scrollTo.current;
    if (!id || !cards.current[id]) return;
    scrollTo.current = null;
    cards.current[id]?.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }, [selected, all, reduce]);
  const pickStar = (id: string) => {
    scrollTo.current = id;
    setSelected(id);
    if (shown.findIndex((l) => l.fp.id === id) >= TOP) setAll(true);
  };

  const seedOpt = options.find((o) => o.reportId === seedId);
  const pickIds = new Set(options.filter((o) => o.kind === "territory" && o.reportId).map((o) => o.reportId));
  const pickRows = territory.rows.filter((r) => pickIds.has(r.id));

  return (
    <MotionConfig reducedMotion="user">
      <PageHeader eyebrow="Lookalikes" title={seed.row ? `Accounts that look like ${seed.row.name}` : "More like your customers"}>
        Pick an account to start from, then find more like it.
      </PageHeader>

      <div data-tour="lookalikes-seed" className="mt-5 flex flex-col gap-3">
        <div role="group" aria-label="Start from a customer" className="flex flex-wrap items-center gap-2">
          {options
            .filter((o) => o.kind === "customer" || o.kind === "recent")
            .map((o) => {
              const on = o.reportId === seedId;
              return (
                <button
                  key={`customer-${o.reportId ?? o.name}`}
                  type="button"
                  aria-pressed={on}
                  disabled={!o.reportId}
                  onClick={() => o.reportId && navigate(moduleHref(seller.id, "lookalikes", o.reportId))}
                  className={cx(toggle(on), "pl-2.5 disabled:cursor-not-allowed disabled:opacity-60")}
                >
                  <CompanyLogo domain={o.domain ?? (o.reportId ? seed.domains[o.reportId] : undefined)} name={o.name} />
                  {o.name}
                  <span className="text-[13px] font-medium text-[#4A4F63]">{seedStatus(o)}</span>
                </button>
              );
            })}
        </div>
        {pickRows.length > 0 && (
          <AccountSwitcher
            rows={pickRows}
            activeId={seedOpt?.kind === "territory" ? seedId : undefined}
            hrefFor={(id) => moduleHref(seller.id, "lookalikes", id)}
            loading={territory.loading}
            label="or a territory account"
            segments={segmentsOf(seller.territory)}
          />
        )}
        {territory.loading && !pickRows.length && <Loader2 size={16} className="animate-spin text-muted-foreground" aria-label="Loading accounts" />}
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
            <BeyondTerritory seller={seller.id} seed={seed.row} rows={territory.rows} />
          </div>

          <div className="mt-8">
            <FingerprintCard fp={seedFp} row={seed.row} seller={seller.id} sellerName={seller.name} />
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
            {segments.length > 0 && (
              <div role="group" aria-label="Segment" className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 font-mono text-xs font-semibold text-[#4A4F63]">Segment</span>
                {[undefined, ...segments.map((sg) => sg.id)].map((id) => (
                  <Toggle key={id ?? "all"} on={segment === id} onClick={() => setSegment(id)}>
                    {id ?? "All"}
                    <span className="ml-1.5 font-mono text-xs font-normal text-[#4A4F63]">{keep(motion, id).length}</span>
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
                </div>
              </section>

              <section aria-labelledby="ranked-title" className="flex min-w-0 flex-col gap-2.5">
                <h2 id="ranked-title" className="font-display text-[22px] font-semibold tracking-[-0.01em]">
                  {shown.length ? `In your territory · ${shown.length}` : "No matches"}
                </h2>
                {shown.length ? (
                  <>
                    {visible.map((l, i) => (
                      <LookalikeCard
                        key={l.fp.id}
                        ref={(el) => {
                          cards.current[l.fp.id] = el;
                        }}
                        item={l}
                        rank={i + 1}
                        seller={seller.id}
                        row={rowsById[l.fp.id]}
                        selected={selected === l.fp.id}
                        onPick={() => setSelected(l.fp.id)}
                      />
                    ))}
                    {shown.length > TOP && (
                      <button type="button" aria-expanded={all} onClick={() => setAll((v) => !v)} className={cx(secondaryButton, "self-start text-[15px]")}>
                        {all ? `Show the top ${TOP}` : `Show all ${shown.length}`}
                      </button>
                    )}
                  </>
                ) : (
                  <EmptyFilters
                    seedName={seedFp.name}
                    seedMotion={seedFp.motion}
                    motion={motion}
                    segment={segment}
                    countWithout={{ motion: keep("Any").length, segment: keep(motion, undefined).length }}
                    onDropMotion={() => setMotion("Any")}
                    onDropSegment={() => setSegment(undefined)}
                    onReset={() => {
                      setMotion("Any");
                      setSegment(undefined);
                    }}
                  />
                )}
              </section>
            </div>
          )}
        </>
      )}
      <NextStep seller={seller.id} from="lookalikes" account={shown[0] ? { id: shown[0].fp.id, name: shown[0].fp.name } : seed.row && { id: seed.row.id, name: seed.row.name }} />
    </MotionConfig>
  );
}

/** Filters left nothing: say why, and offer the one change that brings matches back. */
function EmptyFilters({
  seedName,
  seedMotion,
  motion,
  segment,
  countWithout,
  onDropMotion,
  onDropSegment,
  onReset,
}: {
  seedName: string;
  seedMotion: MotionLabel;
  motion: MotionFilter;
  segment?: Segment;
  countWithout: { motion: number; segment: number };
  onDropMotion: () => void;
  onDropSegment: () => void;
  onReset: () => void;
}) {
  const kind = segment ? `${segment} account` : "account";
  const why =
    motion !== "Any" && motion !== seedMotion
      ? `${seedName} is ${seedMotion.toLowerCase()}, and no ${motion.toLowerCase()} ${kind} is in the saved runs.`
      : segment
        ? `No ${kind} in the territory matches these filters.`
        : "No account matches these filters.";
  const dropMotion = motion !== "Any" && countWithout.motion > 0;
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
        {segment && countWithout.segment > 0 && !dropMotion && (
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
