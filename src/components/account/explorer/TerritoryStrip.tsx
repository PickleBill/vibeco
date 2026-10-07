import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cx } from "@/components/territory/style";
import { Eyebrow, FitBadge } from "@/components/territory/ui";
import { MotionBadge } from "../AccountViews";
import { card } from "./look";
import { stripMarks } from "./model";
import { loadReport, ranAt, type RunRef, type SavedReport } from "./savedRuns";

/** Plain text of a one-liner, citations dropped, for a small card. */
const plain = (t?: string) => stripMarks(t ?? "").replace(/\s*\[[\d,\s]+\]/g, "");

/**
 * Accounts already run, as small cards: motion, fit and the one-line reason
 * to look (or, `compact`, one row of pills once a run is open). Opening one
 * shows the whole run at once, with no AI calls, so it also stands in when a
 * live run is slow.
 */
export function TerritoryStrip({
  runs,
  title,
  activeId,
  onOpen,
  compact,
}: {
  runs: RunRef[];
  title: string;
  activeId?: string | null;
  onOpen: (report: SavedReport) => void;
  compact?: boolean;
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
  const name = (r: RunRef) => r.company.replace(/\s*\([^)]*\)\s*$/, "");

  if (compact) {
    return (
      <section aria-labelledby="strip-title" className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p id="strip-title" className="font-mono text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {title}
        </p>
        <ul className="flex flex-wrap gap-2">
          {shown.map((r) => {
            const rep = reports[r.reportId];
            const active = activeId === r.reportId;
            return (
              <li key={r.reportId}>
                <button
                  type="button"
                  onClick={() => open(r)}
                  aria-pressed={active}
                  className={cx(
                    "inline-flex min-h-11 items-center gap-2 rounded-full pl-4 pr-2 text-[15px] text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active ? "border-2 border-primary bg-brand-tint font-bold" : "border border-[#9097A6] bg-card font-semibold hover:border-foreground",
                  )}
                >
                  {name(r)}
                  {rep?.brief?.fit?.grade ? (
                    <FitBadge grade={rep.brief.fit.grade} label={false} />
                  ) : opening === r.reportId || rep === undefined ? (
                    <Loader2 size={14} className="animate-spin text-muted-foreground" aria-label="Loading" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <section aria-labelledby="strip-title" className="mt-10">
      <Eyebrow>
        <span id="strip-title">{title}</span>
      </Eyebrow>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
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
                className={cx(
                  active ? "rounded-xl border-2 border-primary bg-brand-tint" : cx(card, "hover:border-foreground"),
                  "group flex h-full w-full flex-col p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                )}
              >
                <span className="flex w-full items-start justify-between gap-2">
                  <span className="font-display text-lg font-semibold leading-tight tracking-[-0.01em] text-foreground">{name(r)}</span>
                  {brief?.fit?.grade ? (
                    <FitBadge grade={brief.fit.grade} />
                  ) : opening === r.reportId || rep === undefined ? (
                    <Loader2 size={14} className="animate-spin text-muted-foreground" aria-label="Loading" />
                  ) : null}
                </span>
                {brief?.motion?.label && (
                  <span className="mt-2">
                    <MotionBadge label={brief.motion.label} />
                  </span>
                )}
                {brief?.account_line ? (
                  <span className="mt-2 line-clamp-2 text-[15px] leading-snug text-[#4A4F63]">{plain(brief.account_line)}</span>
                ) : (
                  <span className="mt-2 h-9 w-full rounded bg-muted" aria-hidden />
                )}
                <span className="mt-auto flex items-center justify-between pt-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{rep?.created_at ? `Ran ${ranAt(rep.created_at)}` : ""}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-primary">
                    Open <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
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
