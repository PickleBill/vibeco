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

function Letter({ row }: { row: QualRow }) {
  return (
    <span
      data-testid="meddpicc-letter"
      title={`${row.name}: ${row.status}`}
      className={cx("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-sm font-semibold", TILE[row.status])}
    >
      <span aria-hidden>{row.letter}</span>
      <span className="sr-only">
        {row.name}: {row.status}.{" "}
      </span>
    </span>
  );
}

/**
 * MEDDPICC as a slim reference bar: eight letters, each solid, dashed or
 * dotted by what's known, and one line. Public research reads about the same
 * for most accounts (Competition, then Pain and Champion), so it stays shut.
 * Open, each row gives the evidence (sourced, or a hint from the simulated
 * meeting) and the question or step that would close it.
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
    <section data-tour="meddpicc" aria-labelledby={`${id}-title`} className={cx("rounded-xl border border-border bg-white", className)}>
      <h3 id={`${id}-title`} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-3 py-2 text-left hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4"
        >
          <span className="flex items-center gap-1">
            {q.rows.map((r) => (
              <Letter key={r.id} row={r} />
            ))}
          </span>
          <span className="min-w-0 flex-[1_1_260px] text-[15px] leading-snug text-[#4A4F63]">
            <span className="font-semibold text-foreground">MEDDPICC</span> · {q.known} of 8 from public research. The rest is discovery.
          </span>
          <ChevronDown size={18} aria-hidden className={cx("ml-auto shrink-0 text-foreground transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} />
        </button>
      </h3>
      <Fold open={open} id={id}>
        <ol className="border-t border-border px-4 sm:px-5">
          {q.rows.map((r) => (
            <li key={r.id} className="flex gap-3 border-b border-border py-3.5 last:border-b-0 sm:gap-4">
              <Letter row={r} />
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
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground sm:px-5">Gaps close on a call, not from research.</p>
      </Fold>
    </section>
  );
}
