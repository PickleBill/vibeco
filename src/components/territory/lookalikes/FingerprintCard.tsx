import type { ReactNode } from "react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { cx } from "../style";
import { EvidenceTag } from "../ui";
import { dayLabel, TRIGGER_LABEL } from "../radar/evidence";
import { MOTION_LINE } from "../radar/model";
import { Chips } from "../radar/pieces";
import { OmniRing, SegmentTag } from "../radar/segments";
import { CompanyName } from "../company/CompanyName";
import { OMNI_TEXT, type TerritoryRow } from "../model";
import type { Fingerprint } from "./model";

function Pill({ k, children, status, ids, sources, struck }: { k: string; children: ReactNode; status?: string; ids?: number[]; sources: ResearchSource[]; struck?: boolean }) {
  return (
    <li className="inline-flex min-h-[34px] flex-wrap items-center gap-1.5 rounded-lg border border-[#D9D4C7] bg-background py-1 pl-2.5 pr-1.5 text-sm">
      <span className="font-mono text-xs text-muted-foreground">{k}</span>
      <span className={cx("font-semibold", struck && "text-[#4A4F63] line-through", status === "Not found" && "font-medium text-[#6B7080]")}>{children}</span>
      {status && <EvidenceTag status={status} className="h-[22px] px-2" />}
      {ids && <Chips ids={ids.slice(0, 2)} sources={sources} />}
    </li>
  );
}

/** The seed's traits as pills, each with its evidence tag and sources. */
export function FingerprintCard({ fp, row, seller, sources, sellerName }: { fp: Fingerprint; row: TerritoryRow; seller: string; sources: ResearchSource[]; sellerName: string }) {
  const toolIds = (t: { sources: number[] }[]) => [...new Set(t.flatMap((x) => x.sources))];
  return (
    <section aria-labelledby="fp-title" className="rounded-[14px] border border-foreground bg-white px-4 py-4 sm:px-[18px]">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="fp-title" className="inline-flex flex-wrap items-center gap-x-1.5 font-display text-xl font-semibold">
          <CompanyName row={row} seller={seller} logo={28} />
          <span>· fingerprint</span>
        </h2>
        {row.domain && <span className="font-mono text-[13px] text-muted-foreground">{row.domain}</span>}
        {fp.segment && <SegmentTag segment={fp.segment} />}
        <span className="inline-flex items-center gap-1.5 text-sm text-[#4A4F63]">
          <OmniRing status={fp.omni} />
          {fp.omni === "Likely" ? (
            OMNI_TEXT.Likely.full
          ) : fp.onList ? (
            fp.listSource ? (
              <a href={fp.listSource} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                On {sellerName}&rsquo;s public customer list
              </a>
            ) : (
              `On ${sellerName}'s public customer list`
            )
          ) : (
            `Not on ${sellerName}'s public customer list`
          )}
        </span>
      </div>
      <ul className="flex flex-wrap gap-2">
        <Pill k="motion" status="Inferred" ids={fp.motionSources} sources={sources}>
          {fp.motion} <span className="font-normal text-[#4A4F63]">({MOTION_LINE[fp.motion]})</span>
        </Pill>
        <Pill k="warehouse" status={fp.warehouse.length ? "Confirmed" : "Not found"} ids={toolIds(fp.warehouse)} sources={sources}>
          {fp.warehouse.length ? fp.warehouse.map((t) => t.name).join(", ") : "None confirmed"}
        </Pill>
        <Pill k="BI tools" status={fp.bi.length || fp.sellerTool ? "Confirmed" : "Not found"} ids={toolIds([...fp.bi, ...(fp.sellerTool ? [fp.sellerTool] : [])])} sources={sources}>
          {[...fp.bi, ...(fp.sellerTool ? [fp.sellerTool] : [])].map((t) => t.name).join(", ") || "None confirmed"}
        </Pill>
        {fp.movedOff.length > 0 && (
          <Pill k="moved off" status="Former" ids={toolIds(fp.movedOff)} sources={sources} struck>
            {fp.movedOff.map((t) => t.name).join(", ")}
          </Pill>
        )}
        <Pill k="trigger" ids={fp.trigger?.sources} sources={sources} status={fp.trigger ? undefined : "Not found"}>
          {fp.trigger ? `${TRIGGER_LABEL[fp.triggerKind]} · ${dayLabel(fp.trigger.date)}` : TRIGGER_LABEL.none}
        </Pill>
        <Pill k="embedded" status={fp.embedded ? "Confirmed" : "Not found"} ids={fp.embeddedSources} sources={sources}>
          {fp.embedded ? "Ships analytics to its customers" : "No signal found"}
        </Pill>
      </ul>
      {fp.sellerTool && (
        <p className="mt-3 text-[15px] text-[#4A4F63]">
          {sellerName} itself is in the stack; it never counts toward the BI story when scoring.
        </p>
      )}
    </section>
  );
}
