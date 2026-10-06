import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { MotionBadge } from "../AccountViews";
import { stripMarks } from "./model";
import { loadReport, ranAt, type RunRef, type SavedReport } from "./savedRuns";

/** Plain text of a one-liner, citations dropped, for a small card. */
const plain = (t?: string) => stripMarks(t ?? "").replace(/\s*\[[\d,\s]+\]/g, "");

/**
 * Accounts already run, as small cards: motion, fit and the one-line reason
 * to look. Opening one shows the whole run at once, with no AI calls, so it
 * also stands in when a live run is slow.
 */
export function TerritoryStrip({
  runs,
  title,
  activeId,
  onOpen,
}: {
  runs: RunRef[];
  title: string;
  activeId?: string | null;
  onOpen: (report: SavedReport) => void;
}) {
  const [reports, setReports] = useState<Record<string, SavedReport | null | undefined>>({});
  const [opening, setOpening] = useState<string | null>(null);
  const ids = runs.map((r) => r.reportId).join(",");

  useEffect(() => {
    let live = true;
    for (const r of runs) {
      loadReport(r.reportId).then((rep) => {
        if (live) setReports((m) => ({ ...m, [r.reportId]: rep }));
      });
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the list of ids changes
  }, [ids]);

  const shown = runs.filter((r) => reports[r.reportId] !== null);
  if (!shown.length) return null;

  const open = async (r: RunRef) => {
    const loaded = reports[r.reportId];
    if (loaded) return onOpen(loaded);
    setOpening(r.reportId);
    const rep = await loadReport(r.reportId);
    setOpening(null);
    if (rep) onOpen(rep);
  };

  return (
    <section aria-labelledby="strip-title" className="mt-8">
      <p id="strip-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-3">
        {shown.map((r) => {
          const rep = reports[r.reportId];
          const brief = rep?.brief;
          const active = activeId === r.reportId;
          return (
            <li key={r.reportId}>
              <button
                type="button"
                onClick={() => open(r)}
                aria-pressed={active}
                className={`group flex h-full w-full flex-col rounded-lg border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-sm ${
                  active ? "border-primary/60 ring-1 ring-primary/20" : "border-border"
                }`}
              >
                <span className="flex w-full items-start justify-between gap-2">
                  <span className="font-display text-base font-bold text-foreground">{r.company.replace(/\s*\([^)]*\)\s*$/, "")}</span>
                  {brief?.fit?.grade ? (
                    <span className="font-display text-lg font-bold leading-none text-primary" title="Fit: evidence and timing, not deal size">
                      {brief.fit.grade}
                    </span>
                  ) : opening === r.reportId || rep === undefined ? (
                    <Loader2 size={14} className="animate-spin text-muted-foreground" aria-label="Loading" />
                  ) : null}
                </span>
                {brief?.motion?.label && (
                  <span className="mt-1">
                    <MotionBadge label={brief.motion.label} />
                  </span>
                )}
                {brief?.account_line ? (
                  <span className="mt-1.5 line-clamp-2 text-sm leading-snug text-muted-foreground">{plain(brief.account_line)}</span>
                ) : (
                  <span className="mt-1.5 h-8 w-full animate-pulse rounded bg-muted" aria-hidden />
                )}
                <span className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <span>{rep?.created_at ? `Ran ${ranAt(rep.created_at)}` : ""}</span>
                  <span className="inline-flex items-center gap-0.5 font-medium text-primary">
                    Open <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
