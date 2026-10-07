import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadReport, type SavedReport } from "@/components/account/explorer/savedRuns";
import { whyNowItems } from "@/components/account/explorer/model";
import { AccountSwitcher } from "../AccountSwitcher";
import { CommitteeView } from "../committee/CommitteeView";
import { possessive } from "../committee/model";
import { CitedLine } from "../committee/parts";
import { splitCompany } from "../model";
import { moduleHref } from "../nav";
import { Eyebrow, FieldPill, FitBadge } from "../ui";
import type { ModuleProps } from "./types";

/**
 * 03 · Committee: simulate one account's buying room. Five synthetic critics
 * take the seats, argue from the account's evidence in three rounds, and the
 * view shows who moved, the path to yes and what blocks it. The account comes
 * from the URL (/for/omni/committee/<id>), else the territory's first.
 */
export function CommitteeModule({ seller, territory, reportId }: ModuleProps) {
  const accounts = seller.territory?.accounts ?? [];
  const activeId = reportId ?? accounts[0]?.reportId;
  const inTerritory = accounts.some((a) => a.reportId === activeId);
  const row = territory.rows.find((r) => r.id === activeId);

  // A run outside the territory (a link to any saved account run) loads on its own.
  const [other, setOther] = useState<{ id: string; report: SavedReport | null } | null>(null);
  useEffect(() => {
    if (!activeId || inTerritory) return;
    let live = true;
    loadReport(activeId).then((report) => {
      if (live) setOther({ id: activeId, report });
    });
    return () => {
      live = false;
    };
  }, [activeId, inTerritory]);

  const report = row?.report ?? (other?.id === activeId ? other.report : undefined);
  const waiting = report === undefined && (inTerritory ? territory.loading : !!activeId);
  const name = row?.name ?? (report ? splitCompany(report.idea).name : "");
  const brief = report?.brief;
  const trigger = whyNowItems(brief?.revenue_model).find((i) => i.date);
  const sources = Array.isArray(brief?.research?.sources) ? brief!.research!.sources : [];

  return (
    <div className="mx-auto max-w-[1240px]">
      <Eyebrow>Committee · synthetic</Eyebrow>
      <h1 className="mt-2 font-display text-[2.1rem] font-bold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-[2.6rem]">
        {name ? `${possessive(name)} buying room` : "The buying room"}
      </h1>
      <p className="mt-3 max-w-[720px] text-base text-[#4A4F63] sm:text-[17px]">
        Five synthetic critics take the seats a buying committee would. Every argument cites {name ? `${possessive(name)}` : "the account’s"} evidence, and every stance can
        move.
      </p>

      <div className="mt-4">
        <AccountSwitcher rows={territory.rows} activeId={activeId} hrefFor={(id) => moduleHref(seller.id, "committee", id)} loading={territory.loading} />
      </div>

      {brief && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {row && <FieldPill>Motion: {row.motion}</FieldPill>}
          {brief.fit?.grade && <FitBadge grade={brief.fit.grade} />}
          {brief.customer_list?.sentence && (
            <span className="inline-flex min-h-[26px] items-center rounded-md border border-[#D9D4C7] bg-white px-2 text-[13px] font-medium text-foreground">
              {brief.customer_list.on_list ? `On ${seller.name}’s public customer list` : `Not on ${seller.name}’s public customer list`}
            </span>
          )}
          {trigger && (
            <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-1 text-sm text-foreground">
              <span className="font-mono text-xs text-muted-foreground">{trigger.date}</span>
              <CitedLine text={trigger.text} sources={sources} />
            </span>
          )}
        </div>
      )}

      <div className="mt-7">
        {report ? (
          <CommitteeView key={report.id} report={report} company={name} accountHref={moduleHref(seller.id, "account", report.id)} />
        ) : waiting ? (
          <p className="flex items-center gap-2 rounded-xl border border-dotted border-[#9097A6] bg-white p-5 text-base text-[#4A4F63]">
            <Loader2 size={16} className="motion-safe:animate-spin text-primary" aria-hidden /> Opening the saved run…
          </p>
        ) : (
          <div className="rounded-xl border border-dotted border-[#9097A6] bg-white p-5">
            <p className="font-display text-xl font-semibold text-foreground">This saved run couldn’t be read</p>
            <p className="mt-2 text-base text-[#4A4F63]">
              {activeId ? "The link may be old, or the run may no longer be shared." : "There are no accounts in this territory yet."}
              {territory.rows.length > 0 && " Pick another account above."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
