import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { cx } from "@/components/territory/style";
import { label, linkBtn, toggle } from "./explorer/look";
import { loadReport, type RunRef, type SavedReport } from "./explorer/savedRuns";

/** "Relay (relaypro.com)" → "Relay". */
const shortName = (company: string) => company.replace(/\s*\([^)]*\)\s*$/, "");

/**
 * Quick picks under the company box, two labeled rows of pills: the seller's
 * saved runs (open at once from stored data, no AI calls) and live examples
 * (a fresh run, about a minute). Then one link to the rest of the territory.
 * A saved run that can't be read drops out of its row.
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
  const rows = [
    shown.length > 0 && {
      id: "picks-saved",
      title: "Saved · opens instantly",
      pills: shown.map((r) => (
        <button key={r.reportId} type="button" disabled={disabled} onClick={() => open(r)} className={cx(toggle(false), "disabled:opacity-50")}>
          {shortName(r.company)}
          {opening === r.reportId && <Loader2 size={14} className="animate-spin text-muted-foreground" aria-label="Opening" />}
        </button>
      )),
    },
    live.length > 0 && {
      id: "picks-live",
      title: "Live · about a minute",
      pills: live.map((ex) => (
        <button key={ex} type="button" disabled={disabled} onClick={() => onRun(ex)} className={cx(toggle(false), "disabled:opacity-50")}>
          {ex}
        </button>
      )),
    },
  ].filter((r): r is { id: string; title: string; pills: JSX.Element[] } => !!r);

  return (
    <div className="mt-5">
      {rows.length > 0 && (
        <div className="grid gap-y-4 sm:grid-cols-[max-content_minmax(0,1fr)] sm:items-center sm:gap-x-4 sm:gap-y-2.5">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 sm:contents">
              <p id={r.id} className={label}>
                {r.title}
              </p>
              <div role="group" aria-labelledby={r.id} className="flex flex-wrap gap-2">
                {r.pills}
              </div>
            </div>
          ))}
        </div>
      )}
      {radar && radar.count > 0 && (
        <Link to={radar.href} className={cx(linkBtn, "mt-2")}>
          All {radar.count} territory accounts on the Radar <ArrowRight size={15} aria-hidden />
        </Link>
      )}
    </div>
  );
}
