import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { accountMeta } from "@/components/territory/accountMeta";
import { CompanyLogo } from "@/components/territory/company/CompanyLogo";
import { splitCompany, toRow } from "@/components/territory/model";
import { cx } from "@/components/territory/style";
import { label, linkBtn, toggle } from "./explorer/look";
import { loadReport, type RunRef, type SavedReport } from "./explorer/savedRuns";

/**
 * Quick picks under the company box, two labeled rows: the seller's saved
 * runs as small cards (logo, name, motion and fit; open at once from stored
 * data, no AI calls) and live examples as pills (a fresh run, about a
 * minute). Then one link to the rest of the territory. A saved run that
 * can't be read drops out of its row.
 */
export function QuickPicks({
  saved,
  live,
  onOpen,
  onRun,
  disabled,
  radar,
}: {
  saved: RunRef[];
  live: string[];
  onOpen: (report: SavedReport) => void;
  onRun: (company: string) => void;
  disabled?: boolean;
  /** The radar view and how many accounts it holds. */
  radar?: { href: string; count: number };
}) {
  const [reports, setReports] = useState<Record<string, SavedReport | null>>({});
  const [opening, setOpening] = useState<string | null>(null);
  const ids = saved.map((r) => r.reportId).join(",");

  // Read them ahead (cached for the page), so a click opens at once.
  useEffect(() => {
    let on = true;
    for (const r of saved) {
      loadReport(r.reportId).then((rep) => {
        if (on) setReports((m) => ({ ...m, [r.reportId]: rep }));
      });
    }
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the list of ids changes
  }, [ids]);

  const open = async (r: RunRef) => {
    setOpening(r.reportId);
    const rep = await loadReport(r.reportId);
    setOpening(null);
    if (rep) onOpen(rep);
    else setReports((m) => ({ ...m, [r.reportId]: null }));
  };

  const shown = saved.filter((r) => reports[r.reportId] !== null);

  return (
    <div className="mt-5 space-y-4">
      {shown.length > 0 && (
        <div>
          <p id="picks-saved" className={label}>
            Saved · opens instantly
          </p>
          <div role="group" aria-labelledby="picks-saved" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {shown.map((r) => {
              const { name, domain } = splitCompany(r.company);
              const rep = reports[r.reportId];
              return (
                <button
                  key={r.reportId}
                  type="button"
                  disabled={disabled}
                  onClick={() => open(r)}
                  title={name}
                  className="relative flex min-w-0 flex-col items-start gap-2 rounded-[10px] lg:flex-row lg:items-center lg:gap-2.5 xl:flex-col xl:items-start xl:gap-2 border border-border bg-card p-3 text-left transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  <CompanyLogo domain={domain} name={name} size={28} />
                  <span className="block w-full min-w-0">
                    <span className="block truncate text-[15px] font-semibold leading-tight text-foreground">{name}</span>
                    <span className="mt-0.5 block h-5 truncate text-sm text-muted-foreground">{rep ? accountMeta(toRow(r, rep)) : ""}</span>
                  </span>
                  {opening === r.reportId && <Loader2 size={14} className="absolute right-2.5 top-2.5 animate-spin text-muted-foreground" aria-label="Opening" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {live.length > 0 && (
        <div>
          <p id="picks-live" className={label}>
            Live · about a minute
          </p>
          <div role="group" aria-labelledby="picks-live" className="mt-2 flex flex-wrap gap-2">
            {live.map((ex) => (
              <button key={ex} type="button" disabled={disabled} onClick={() => onRun(ex)} className={cx(toggle(false), "disabled:opacity-50")}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
      {radar && radar.count > 0 && (
        <Link to={radar.href} className={linkBtn}>
          All {radar.count} territory accounts on the Radar <ArrowRight size={15} aria-hidden />
        </Link>
      )}
    </div>
  );
}
