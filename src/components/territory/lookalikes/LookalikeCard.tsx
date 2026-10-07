import { forwardRef, useState } from "react";
import { Link } from "react-router-dom";
import { CompanyName } from "../company/CompanyName";
import { Fold, FoldButton } from "../Memo";
import type { TerritoryRow } from "../model";
import { moduleHref } from "../nav";
import { cx, secondaryButton } from "../style";
import { FieldPill, FitBadge } from "../ui";
import { OmniTag, SegmentTag } from "../radar/segments";
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

/** A ranked lookalike: score, the trait pills, the story to tell, where to go next. */
export const LookalikeCard = forwardRef<HTMLElement, { item: Lookalike; rank: number; seller: string; row?: TerritoryRow; selected: boolean; onPick: () => void }>(function LookalikeCard(
  { item, rank, seller, row, selected, onPick },
  ref,
) {
  const { fp } = item;
  // Shut, a card is its name, score and a two-line story; the trait-by-trait
  // breakdown and the rest of the story open together.
  const [open, setOpen] = useState(false);
  const id = `look-why-${fp.id}`;
  const matched = item.traits.filter((t) => t.match === "full" || t.match === "partial").length;
  return (
    <article ref={ref} aria-labelledby={`look-${fp.id}`} className={cx("rounded-xl bg-white p-4 transition-colors", selected ? "border-2 border-primary" : "border border-border")}>
      <div className="flex items-start gap-3.5">
        <span className="pt-1 font-mono text-[13px] font-semibold text-muted-foreground">{String(rank).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h3 id={`look-${fp.id}`} className="font-display text-[19px] font-semibold">
              {/* The name opens the brief and lights the account's star. */}
              {row ? (
                <CompanyName row={row} seller={seller} logo={28} onOpen={onPick} />
              ) : (
                <button type="button" onClick={onPick} className="min-h-11 text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {fp.name}
                </button>
              )}
            </h3>
            {row?.domain && <span className="font-mono text-xs text-muted-foreground">{row.domain}</span>}
            <FieldPill>{fp.motion}</FieldPill>
            <FitBadge grade={fp.fit} />
            {fp.segment && <SegmentTag segment={fp.segment} />}
            {fp.omni !== "None found" && <OmniTag status={fp.omni} />}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[28px] font-semibold leading-none">{item.score}</div>
          <div className="text-xs text-muted-foreground">similarity</div>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2.5">
        <p className="text-xs font-bold uppercase tracking-[0.04em] text-muted-foreground">The story they&rsquo;ll relate to</p>
        <p id={`${id}-story`} className={cx("mt-0.5 text-[15px]", !open && "line-clamp-2")}>
          {item.story}
        </p>
      </div>
      <Fold open={open} id={id}>
        <ul aria-label="How it matches" className="flex flex-wrap gap-1.5 pt-3">
          {item.traits.map((t) => (
            <SimilarityPill key={t.id} t={t} />
          ))}
        </ul>
      </Fold>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <FoldButton open={open} controls={`${id}-story ${id}`} onClick={() => setOpen((v) => !v)} className="basis-full sm:mr-auto sm:basis-auto">
          How it matches
          <span className="font-mono text-xs font-medium text-muted-foreground">
            {matched} of {item.traits.length}
          </span>
        </FoldButton>
        <Link to={moduleHref(seller, "account", fp.id)} className={cx(secondaryButton, "text-[15px]")}>
          Open account
        </Link>
        <Link to={moduleHref(seller, "committee", fp.id)} className={cx(secondaryButton, "text-[15px]")}>
          Committee
        </Link>
      </div>
    </article>
  );
});
