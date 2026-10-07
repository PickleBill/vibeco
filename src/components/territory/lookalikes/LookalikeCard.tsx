import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { moduleHref } from "../nav";
import { cx, secondaryButton } from "../style";
import { FieldPill, FitBadge } from "../ui";
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
export const LookalikeCard = forwardRef<HTMLElement, { item: Lookalike; rank: number; seller: string; domain?: string; selected: boolean; onPick: () => void }>(function LookalikeCard(
  { item, rank, seller, domain, selected, onPick },
  ref,
) {
  const { fp } = item;
  return (
    <article ref={ref} aria-labelledby={`look-${fp.id}`} className={cx("rounded-xl bg-white p-4 transition-colors", selected ? "border-2 border-primary" : "border border-border")}>
      <div className="flex items-start gap-3.5">
        <span className="pt-1 font-mono text-[13px] font-semibold text-muted-foreground">{String(rank).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h3 id={`look-${fp.id}`}>
              <button type="button" onClick={onPick} className="min-h-8 text-left font-display text-[19px] font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {fp.name}
              </button>
            </h3>
            {domain && <span className="font-mono text-xs text-muted-foreground">{domain}</span>}
            <FieldPill>{fp.motion}</FieldPill>
            <FitBadge grade={fp.fit} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[28px] font-semibold leading-none">{item.score}</div>
          <div className="text-xs text-muted-foreground">similarity</div>
        </div>
      </div>
      <ul aria-label="How it matches" className="mt-3 flex flex-wrap gap-1.5">
        {item.traits.map((t) => (
          <SimilarityPill key={t.id} t={t} />
        ))}
      </ul>
      <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2.5">
        <p className="text-xs font-bold uppercase tracking-[0.04em] text-muted-foreground">The story they&rsquo;ll relate to</p>
        <p className="mt-0.5 text-[15px]">{item.story}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
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
