// Small pieces the radar views share: source chips by number, the pink
// "fresh" pill, a stack chip.
import type { ReactNode } from "react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import type { StackChip } from "../model";
import { cx } from "../style";
import { SourceChip } from "../ui";
import { startOfDay } from "./evidence";

/** Numbered source chips for the cited ids that exist in the run (dates already as days). */
export function Chips({ ids, sources, className }: { ids: number[]; sources: ResearchSource[]; className?: string }) {
  const now = startOfDay();
  const found = ids.map((n) => ({ n, s: sources.find((x) => x.id === n) })).filter((x) => x.s);
  if (!found.length) return null;
  return (
    <span className={cx("inline-flex flex-wrap gap-1.5", className)}>
      {found.map(({ n, s }) => (
        <SourceChip key={n} n={n} source={s} now={now} />
      ))}
    </span>
  );
}

/** Pink fill, readable pink text: "Fresh trigger · 6d", "Changed since last run". */
export function FreshPill({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-[26px] shrink-0 items-center rounded-[4px] border border-brand bg-brand-tint px-2 text-xs font-bold text-primary">{children}</span>;
}

/** "● Snowflake" for Confirmed, struck grey for Former. */
export function StackPill({ chip }: { chip: StackChip }) {
  const former = chip.status === "Former";
  return (
    <span
      title={`${chip.category}: ${chip.tool} (${chip.status})${chip.sources.length ? ` · source ${chip.sources.join(", ")}` : ""}`}
      className={cx(
        "inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-xl border px-2 py-0.5 text-[13px] leading-tight",
        former ? "border-[#9097A6] bg-white text-[#5C6175] line-through" : "border-[#16703F] bg-white font-semibold text-foreground",
      )}
    >
      <span aria-hidden className={cx("h-1.5 w-1.5 shrink-0 rounded-full", former ? "border border-[#9097A6]" : "bg-[#16703F]")} />
      {chip.tool}
      <span className="sr-only">{former ? " (former: they moved off it)" : " (confirmed)"}</span>
    </span>
  );
}

/** A section heading in the sheet. */
export function SectionTitle({ children, aside, id }: { children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
      <h2 id={id} className="font-display text-[22px] font-semibold tracking-[-0.01em]">
        {children}
      </h2>
      {aside && <span className="font-mono text-[13px] text-muted-foreground">{aside}</span>}
    </div>
  );
}
