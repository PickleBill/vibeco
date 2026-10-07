import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { Cited } from "@/components/account/AccountViews";
import { Fold } from "../Memo";
import { cx } from "../style";
import { EvidenceTag } from "../ui";
import type { QualRow, QualStatus, Qualification } from "./model";

// Shape and color together: Confirmed solid green, Inferred dashed amber, Gap dotted grey.
const TILE: Record<QualStatus, string> = {
  Confirmed: "border-[1.5px] border-solid border-[#16703F] bg-[#16703F] text-white",
  Inferred: "border-[1.5px] border-dashed border-[#B45309] bg-[#FFF4E0] text-foreground",
  Gap: "border-[1.5px] border-dotted border-[#9097A6] bg-white text-[#6B7080]",
};

function Letter({ row, size = "md" }: { row: QualRow; size?: "md" | "sm" }) {
  return (
    <span
      data-testid="meddpicc-letter"
      title={`${row.name}: ${row.status}`}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-md font-mono font-semibold",
        size === "md" ? "h-9 w-8 text-base sm:h-10 sm:w-9 sm:text-lg" : "h-7 w-7 text-sm",
        TILE[row.status],
      )}
    >
      <span aria-hidden>{row.letter}</span>
      <span className="sr-only">
        {row.name}: {row.status}.{" "}
      </span>
    </span>
  );
}

/**
 * MEDDPICC as a deal review would read it: eight letters, each solid, dashed
 * or dotted by what's known, and a one-line summary. Open, each row gives the
 * evidence (sourced, or a hint from the simulated meeting) and the question
 * or step that would close it.
 */
export function QualificationCard({
  qualification: q,
  sources,
  defaultOpen = false,
  className,
}: {
  qualification: Qualification;
  sources: ResearchSource[];
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `meddpicc-${useId().replace(/:/g, "")}`;
  return (
    <section data-tour="meddpicc" aria-labelledby={`${id}-title`} className={cx("rounded-xl border border-foreground bg-white", className)}>
      <h3 id={`${id}-title`} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full flex-col gap-3 rounded-xl px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:gap-5 sm:px-5"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">Qualification · MEDDPICC</span>
            <span className="mt-0.5 block font-display text-xl font-semibold leading-snug tracking-[-0.01em] text-foreground">
              {q.known} of 8 known · {q.gaps} {q.gaps === 1 ? "gap" : "gaps"}
            </span>
            {q.biggest && <span className="mt-0.5 block text-[15px] text-[#4A4F63]">Biggest gap: {q.biggest.name}</span>}
          </span>
          <span className="flex items-center gap-1 sm:gap-1.5">
            {q.rows.map((r) => (
              <Letter key={r.id} row={r} />
            ))}
            <ChevronDown size={18} aria-hidden className={cx("ml-1.5 shrink-0 text-foreground transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} />
          </span>
        </button>
      </h3>
      <Fold open={open} id={id}>
        <ol className="border-t border-border px-4 sm:px-5">
          {q.rows.map((r) => (
            <li key={r.id} className="flex gap-3 border-b border-border py-3.5 last:border-b-0 sm:gap-4">
              <Letter row={r} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-foreground">{r.name}</span>
                  <EvidenceTag status={r.status} className="h-6" />
                  {r.simulated && <span className="font-mono text-xs text-muted-foreground">simulated hint</span>}
                </p>
                <p className="mt-1 text-[15px] leading-relaxed text-foreground">
                  <Cited text={r.evidence} sources={sources} />
                </p>
                <p className="mt-1 text-[15px] leading-relaxed text-[#4A4F63]">
                  <span className="mr-1.5 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-primary">Next</span>
                  <Cited text={r.next} sources={sources} />
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground sm:px-5">
          Confirmed: a public source says it. Inferred: the agents&rsquo; read of the sources, to test on a call. Gap: unknown until the account says, whatever the simulated meeting hints.
        </p>
      </Fold>
    </section>
  );
}
