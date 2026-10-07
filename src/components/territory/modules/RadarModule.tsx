import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import type { MotionLabel } from "@/components/account/AccountViews";
import { ranAt } from "@/components/account/explorer/savedRuns";
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
import { MissingNote, RadarEmpty, RadarLoading } from "../radar/States";
import { cx } from "../style";
import { Eyebrow, Sheet, WorkbookTabs } from "../ui";
import type { ModuleProps } from "./types";

type Tab = "fresh" | "accounts";

const MOTIONS: MotionLabel[] = ["Internal", "Embedded", "Both"];

/**
 * 01 · Radar, the front door: every account's latest saved run, read for what
 * is dated and fresh. Rings are trigger age, sectors are motions. "What's
 * fresh" holds a card per account worth a call this week; "All accounts" is
 * the whole territory as a sortable sheet. When an account has an earlier run,
 * the evidence-backed changes between the two lead.
 */
export function RadarModule({ seller, territory }: ModuleProps) {
  const { search } = useLocation();
  const demo = new URLSearchParams(search).has("demo");
  const [tab, setTab] = useState<Tab>("fresh");
  const [focusId, setFocusId] = useState<string | null>(null);
  const diffs = useRunDiffs(territory.rows);

  const accounts = useMemo(() => {
    const now = startOfDay();
    return territory.rows.map((r) => toRadarAccount(r, diffs[r.id] ?? [], now)).sort(byFreshness);
  }, [territory.rows, diffs]);

  const name = seller.territory?.name ?? "Territory";
  const total = seller.territory?.accounts.length ?? 0;
  const n = accounts.length;
  const fresh = accounts.filter((a) => a.trigger && a.trigger.days <= FRESH_DAYS).length;
  const moved = accounts.filter((a) => a.changes.length).length;
  const comparable = accounts.some((a) => a.row.previousId);
  const latest = territory.rows.reduce<string | null>((a, r) => (!a || r.ranAt > a ? r.ranAt : a), null);
  const focus = accounts.find((a) => a.row.id === focusId);

  if (!n && territory.loading) {
    return (
      <div>
        <Eyebrow>Radar · {name}</Eyebrow>
        <h1 className="mb-6 mt-2 font-display text-[2.1rem] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[2.75rem]">Reading the territory</h1>
        <RadarLoading loaded={territory.rows.length + territory.missing.length} total={total} />
      </div>
    );
  }
  if (!n) {
    return (
      <div>
        <Eyebrow>Radar · {name}</Eyebrow>
        <h1 className="mb-6 mt-2 font-display text-[2.1rem] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[2.75rem]">Nothing on the radar</h1>
        <MissingNote missing={territory.missing} shown={0} className="mb-5" />
        <RadarEmpty seller={seller.id} />
      </div>
    );
  }

  const headline = moved
    ? `${moved} account${moved === 1 ? "" : "s"} moved since the last run`
    : fresh
      ? `${fresh} of ${n} accounts ${fresh === 1 ? "has" : "have"} a trigger in the last ${FRESH_DAYS} days`
      : `${n} accounts, none with a trigger in the last ${FRESH_DAYS} days`;
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

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-[1_1_440px]">
          <Eyebrow>
            Radar · {name}
            {latest ? ` · latest run ${ranAt(latest)}` : ""}
          </Eyebrow>
          <h1 className="mt-2 font-display text-[2.1rem] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[2.75rem]">{headline}</h1>
          <p className="mt-3 max-w-[660px] text-base text-[#4A4F63] sm:text-[17px]">{subline}</p>
        </div>
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

      <MissingNote missing={territory.missing} shown={n} className="mt-5" />

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
                <FocusPanel account={focus} seller={seller.id} sellerName={seller.name} onClose={() => setFocusId(null)} />
              </div>
            )}
            {tab === "fresh" ? (
              <>
                <div className="grid items-start gap-7 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:grid-cols-[minmax(300px,400px)_minmax(0,1fr)]">
                  <div className="lg:sticky lg:top-4">
                    <RadarChart accounts={accounts} focusId={focusId} onFocus={setFocusId} />
                  </div>
                  <FreshList accounts={accounts} seller={seller.id} onFocus={setFocusId} />
                </div>
                {!demo && (
                  <>
                    <HalfLife accounts={accounts} />
                    <Digest accounts={accounts} territory={name} subject={subject} />
                  </>
                )}
              </>
            ) : (
              <AccountsTable accounts={accounts} seller={seller.id} focusId={focusId} onFocus={setFocusId} />
            )}
          </div>
        </Sheet>
        {territory.loading && <p className="mt-3 text-sm text-muted-foreground">Still reading {total - n - territory.missing.length} more saved run(s)…</p>}
      </div>
    </MotionConfig>
  );
}
