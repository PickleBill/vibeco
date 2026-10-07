import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import type { MotionLabel } from "@/components/account/AccountViews";
import { ranAt } from "@/components/account/explorer/savedRuns";
import type { Segment } from "@/lib/sellers";
import { segmentFromParam, segmentsOf } from "../model";
import { AccountsTable } from "../radar/AccountsTable";
import { FreshList } from "../radar/ChangeCards";
import { useRunDiffs } from "../radar/diff";
import { Digest } from "../radar/Digest";
import { startOfDay } from "../radar/evidence";
import { FocusPanel } from "../radar/FocusPanel";
import { HalfLife } from "../radar/HalfLife";
import { byFreshness, FRESH_DAYS, toRadarAccount } from "../radar/model";
import { StatTile } from "../radar/pieces";
import { RadarChart } from "../radar/RadarChart";
import { SegmentFilter } from "../radar/segments";
import { MissingNote, RadarEmpty, RadarLoading } from "../radar/States";
import { NextStep } from "../NextStep";
import { PageHeader } from "../PageHeader";
import { cx, secondaryButton } from "../style";
import { Sheet, WorkbookTabs } from "../ui";
import type { ModuleProps } from "./types";

type Tab = "fresh" | "accounts";

const MOTIONS: MotionLabel[] = ["Internal", "Embedded", "Both"];

/**
 * 01 · Radar, the front door: every account's latest saved run, read for what
 * is dated and fresh. Rings are trigger age, sectors are motions. "What's
 * fresh" holds a card per account worth a call this week; "All accounts" is
 * the whole territory as a sortable sheet. When an account has an earlier run,
 * the evidence-backed changes between the two lead. A segment filter
 * (?segment=strategic) narrows everything on the page to one segment.
 */
export function RadarModule({ seller, territory }: ModuleProps) {
  const [params, setParams] = useSearchParams();
  const demo = params.has("demo");
  const segments = segmentsOf(seller.territory);
  const segment = segmentFromParam(params.get("segment"), segments);
  const [tab, setTab] = useState<Tab>("fresh");
  const [focusId, setFocusId] = useState<string | null>(null);
  const diffs = useRunDiffs(territory.rows);

  const everyone = useMemo(() => {
    const now = startOfDay();
    return territory.rows.map((r) => toRadarAccount(r, diffs[r.id] ?? [], now)).sort(byFreshness);
  }, [territory.rows, diffs]);
  const accounts = useMemo(() => (segment ? everyone.filter((a) => a.row.segment === segment) : everyone), [everyone, segment]);

  const setSegment = (s?: Segment) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (s) next.set("segment", s.toLowerCase());
        else next.delete("segment");
        return next;
      },
      { replace: true },
    );

  const name = seller.territory?.name ?? "Territory";
  const total = seller.territory?.accounts.length ?? 0;
  const n = accounts.length;
  const fresh = accounts.filter((a) => a.trigger && a.trigger.days <= FRESH_DAYS).length;
  const moved = accounts.filter((a) => a.changes.length).length;
  const comparable = accounts.some((a) => a.row.previousId);
  const latest = territory.rows.reduce<string | null>((a, r) => (!a || r.ranAt > a ? r.ranAt : a), null);
  const focus = accounts.find((a) => a.row.id === focusId);
  const where = segment ? `${name} · ${segment}` : name;
  const segmentNote = segments.find((s) => s.id === segment)?.note;

  if (!everyone.length && territory.loading) {
    return (
      <div>
        <PageHeader className="mb-6" eyebrow={`Radar · ${name}`} title="Reading the territory" />
        <RadarLoading loaded={territory.rows.length + territory.missing.length} total={total} />
      </div>
    );
  }
  if (!everyone.length) {
    return (
      <div>
        <PageHeader className="mb-6" eyebrow={`Radar · ${name}`} title="Nothing on the radar" />
        <MissingNote missing={territory.missing} shown={0} className="mb-5" />
        <RadarEmpty seller={seller.id} />
      </div>
    );
  }

  /** "accounts", "Strategic accounts". */
  const noun = (k: number) => `${segment ? `${segment} ` : ""}account${k === 1 ? "" : "s"}`;
  const headline = !n
    ? `No ${noun(2)} on the radar yet`
    : moved
      ? `${moved} ${noun(moved)} moved since the last run`
      : fresh
        ? `${fresh} of ${n} ${noun(n)} ${fresh === 1 ? "has" : "have"} a trigger in the last ${FRESH_DAYS} days`
        : `${n} ${noun(n)}, none with a trigger in the last ${FRESH_DAYS} days`;
  const subline = comparable
    ? "Each account's latest run, compared with the run before it. Only changes a source backs count."
    : "Each account's latest saved run, read for what is dated and fresh. No account has an earlier run to compare yet, so nothing is marked as changed.";
  const split = Object.fromEntries(MOTIONS.map((m) => [m, accounts.filter((a) => a.row.motion === m).length])) as Record<MotionLabel, number>;
  const unclear = accounts.filter((a) => a.row.motion === "Unclear").length;
  const subject = `${headline} · ${accounts
    .filter((a) => a.fresh)
    .slice(0, 3)
    .map((a) => a.row.name)
    .join(", ")}`.replace(/ · $/, "");
  const counts = Object.fromEntries(segments.map((s) => [s.id, everyone.filter((a) => a.row.segment === s.id).length])) as Partial<Record<Segment, number>>;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader className="min-w-0 flex-[1_1_440px]" eyebrow={`Radar · ${where}${latest ? ` · latest run ${ranAt(latest)}` : ""}`} title={headline}>
          {subline}
        </PageHeader>
        <div className="flex flex-wrap gap-2">
          <StatTile value={n} label={n === 1 ? "account" : "accounts"} />
          <StatTile value={moved || fresh} label={moved ? "moved" : "fresh triggers"} hot={(moved || fresh) > 0} />
          <StatTile label="motion split">
            <div className="flex items-baseline gap-3 font-mono leading-tight">
              {MOTIONS.map((m) => (
                <span key={m} className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold">{split[m]}</span>
                  <span className="text-xs text-[#4A4F63]">{m}</span>
                </span>
              ))}
              {unclear > 0 && (
                <span className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold">{unclear}</span>
                  <span className="text-xs text-[#4A4F63]">Unclear</span>
                </span>
              )}
            </div>
          </StatTile>
        </div>
      </div>

      {segments.length > 0 && <SegmentFilter className="mt-5" segments={segments} counts={counts} total={everyone.length} value={segment} onChange={setSegment} />}

      <MissingNote missing={territory.missing} shown={everyone.length} className="mt-5" />

      {!n ? (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-dotted border-[#9097A6] bg-white p-5 sm:p-6">
          <h2 className="font-display text-[22px] font-semibold">No {segment} accounts have a saved run yet</h2>
          <p className="max-w-[620px] text-base text-[#4A4F63]">
            {segment} accounts{segmentNote ? ` (${segmentNote.toLowerCase()})` : ""} show here once they&rsquo;re run.
          </p>
          <button type="button" onClick={() => setSegment(undefined)} className={cx(secondaryButton, "text-[15px]")}>
            Show all {everyone.length} accounts
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <WorkbookTabs<Tab>
            label="Radar views"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "fresh", label: "What's fresh", count: accounts.filter((a) => a.fresh).length },
              { id: "accounts", label: "All accounts", count: n },
            ]}
          />
          <Sheet className={cx(tab === "accounts" && "!p-0")}>
            <div role="tabpanel" aria-label={tab === "fresh" ? "What's fresh" : "All accounts"}>
              {focus && (
                <div className={cx(tab === "accounts" && "px-4 pt-4 sm:px-6 sm:pt-5")}>
                  <FocusPanel account={focus} seller={seller.id} segmentNote={segments.find((s) => s.id === focus.row.segment)?.note} onClose={() => setFocusId(null)} />
                </div>
              )}
              {tab === "fresh" ? (
                <>
                  <div className="grid items-start gap-7 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:grid-cols-[minmax(300px,400px)_minmax(0,1fr)]">
                    <div data-tour="radar" className="lg:sticky lg:top-4">
                      <RadarChart accounts={accounts} focusId={focusId} onFocus={setFocusId} />
                    </div>
                    <FreshList accounts={accounts} seller={seller.id} onFocus={setFocusId} />
                  </div>
                  {!demo && (
                    <>
                      <HalfLife accounts={accounts} />
                      <Digest accounts={accounts} territory={where} subject={subject} />
                    </>
                  )}
                </>
              ) : (
                <AccountsTable accounts={accounts} seller={seller.id} segments={segments} focusId={focusId} onFocus={setFocusId} />
              )}
            </div>
          </Sheet>
        </div>
      )}
      {territory.loading && <p className="mt-3 text-sm text-muted-foreground">Still reading {total - everyone.length - territory.missing.length} more saved run(s)…</p>}
      <NextStep seller={seller.id} from="radar" account={accounts[0] && { id: accounts[0].row.id, name: accounts[0].row.name }} />
    </MotionConfig>
  );
}
