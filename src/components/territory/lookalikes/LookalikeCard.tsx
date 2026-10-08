import { forwardRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CompanyName } from "../company/CompanyName";
import { Fold } from "../Memo";
import type { TerritoryRow } from "../model";
import { cx } from "../style";
import { FieldPill, FitBadge, HqLine } from "../ui";
import { SegmentTag } from "../radar/segments";
import { TRAIT_LABEL, WEIGHTS, type Lookalike, type TraitScore } from "./model";

const MARK: Record<TraitScore["match"], string> = { full: "✓", partial: "½", none: "–", unknown: "?" };
const MATCH_WORD: Record<TraitScore["match"], string> = { full: "matches", partial: "partly matches", none: "doesn't match", unknown: "can't be compared" };

/** "✓ Warehouse · Snowflake +20": one trait, how it matched, the points it adds. */
export function SimilarityPill({ t }: { t: TraitScore }) {
  return (
    <li
      title={`${TRAIT_LABEL[t.id]} ${MATCH_WORD[t.match]}: ${t.detail} (${t.points} of ${WEIGHTS[t.id]} points)`}
      className={cx(
        "inline-flex min-h-[30px] max-w-full items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[13px]",
        t.match === "full" && "border-[1.5px] border-foreground bg-white font-semibold text-foreground",
        t.match === "partial" && "border-[1.5px] border-dashed border-[#4A4F63] bg-white text-foreground",
        (t.match === "none" || t.match === "unknown") && "border border-dotted border-[#9097A6] text-[#4A4F63]",
      )}
    >
      <span aria-hidden className="font-mono font-semibold">
        {MARK[t.match]}
      </span>
      <span className="sr-only">{MATCH_WORD[t.match]}: </span>
      <span className="min-w-0">
        {TRAIT_LABEL[t.id]}
        <span className="font-normal text-[#4A4F63]"> · {t.detail}</span>
      </span>
      <span className="font-mono text-xs text-[#4A4F63]">{t.points ? `+${t.points}` : "0"}</span>
    </li>
  );
}

/**
 * A ranked lookalike: rank, name, motion, fit, segment, score and the story
 * to tell. The score opens the trait-by-trait breakdown; the name opens the
 * company brief (and from there the account and its committee).
 */
export const LookalikeCard = forwardRef<HTMLElement, { item: Lookalike; rank: number; seller: string; row?: TerritoryRow; selected: boolean; onPick: () => void }>(function LookalikeCard(
  { item, rank, seller, row, selected, onPick },
  ref,
) {
  const { fp } = item;
  const [open, setOpen] = useState(false);
  const id = `look-why-${fp.id}`;
  const matched = item.traits.filter((t) => t.match === "full" || t.match === "partial").length;
  return (
    <article ref={ref} aria-labelledby={`look-${fp.id}`} className={cx("rounded-xl bg-white px-4 py-3", selected ? "border-2 border-primary" : "border border-border")}>
      <div className="flex items-start gap-3">
        <span className="pt-3.5 font-mono text-[13px] font-semibold text-muted-foreground">{String(rank).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 id={`look-${fp.id}`} className="mr-0.5 font-display text-[19px] font-semibold">
              {/* The name opens the brief and lights the account's star. */}
              {row ? (
                <CompanyName row={row} seller={seller} logo={28} onOpen={onPick} />
              ) : (
                <button type="button" onClick={onPick} className="min-h-11 text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {fp.name}
                </button>
              )}
            </h3>
            <HqLine hq={row?.hq} />
            <FieldPill>{fp.motion}</FieldPill>
            <FitBadge grade={fp.fit} />
            {fp.segment && <SegmentTag segment={fp.segment} />}
          </div>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-story ${id}`}
          aria-label={`${item.score} similarity: how it matches, ${matched} of ${item.traits.length} traits`}
          title="How it matches"
          onClick={() => setOpen((v) => !v)}
          className="-mr-1.5 flex min-h-11 shrink-0 flex-col items-end rounded-lg border border-transparent px-1.5 py-1 text-right transition-colors hover:border-[#D9D4C7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="font-mono text-[26px] font-semibold leading-none">{item.score}</span>
          <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            similarity
            <ChevronDown size={14} aria-hidden className={cx("transition-transform motion-reduce:transition-none", open && "rotate-180")} />
          </span>
        </button>
      </div>
      {/* Under the name from 640px; the full width on a phone. */}
      <p id={`${id}-story`} className={cx("mt-1 text-[15px] leading-snug sm:pl-7", !open && "line-clamp-2")}>
        {item.story}
      </p>
      <Fold open={open} id={id}>
        <ul aria-label="How it matches" className="flex flex-wrap gap-1.5 pb-1 pt-2.5 sm:pl-7">
          {item.traits.map((t) => (
            <SimilarityPill key={t.id} t={t} />
          ))}
        </ul>
      </Fold>
    </article>
  );
});
