import { ageDays } from "../model";
import { cx, freshness } from "../style";
import { SourceChip } from "../ui";
import { dayLabel, startOfDay } from "./evidence";
import type { RadarAccount } from "./model";
import { SectionTitle } from "./pieces";

/** Past this, a source asks to be re-checked before anyone repeats it on a call. */
const RECHECK_DAYS = 180;

const BOX = {
  fresh: "border border-foreground",
  aging: "border border-[#C9C4B6]",
  stale: "border border-dashed border-[#C9C4B6] bg-background",
  undated: "border border-dotted border-[#9097A6]",
};
const TEXT = {
  fresh: "font-bold text-foreground",
  aging: "font-medium text-foreground",
  stale: "text-[#4A4F63]",
  undated: "text-[#4A4F63]",
};
const BAR = { fresh: "opacity-100", aging: "opacity-60", stale: "opacity-35", undated: "opacity-35" };

/**
 * Evidence half-life: every dated source in the territory, freshest first,
 * fading as it ages (120-day half-life). Only sources with a publish date are
 * here; job posts and product pages rarely carry one.
 */
export function HalfLife({ accounts }: { accounts: RadarAccount[] }) {
  const now = startOfDay();
  const all = accounts.flatMap((a) => a.sources.map((s) => ({ a, s })));
  const dated = all
    .map((x) => ({ ...x, days: x.s.date ? ageDays(x.s.date, now) : null }))
    .filter((x): x is typeof x & { days: number } => x.days !== null)
    .sort((p, q) => p.days - q.days);

  return (
    <section aria-labelledby="halflife-title" className="mt-8 border-t border-[#ECE8DE] pt-6">
      <SectionTitle id="halflife-title" aside="half-life 120d · re-check past 6mo">
        Evidence half-life
      </SectionTitle>
      <p className="mb-4 max-w-[760px] text-base text-[#4A4F63]">
        Claims fade as their source ages. Fresh sources read bold; anything past six months asks to be re-checked before it goes on a call.{" "}
        {dated.length} of {all.length} sources carry a publish date; job posts and product pages rarely do.
      </p>
      {dated.length ? (
        <ul className="flex flex-wrap gap-2.5">
          {dated.map(({ a, s, days }) => {
            const tier = freshness(days);
            const stale = days > RECHECK_DAYS;
            const pct = Math.max(4, Math.round(Math.pow(0.5, days / 120) * 100));
            return (
              <li key={`${a.row.id}-${s.id}`} className="min-w-0 flex-[1_1_300px] sm:max-w-[420px]">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${a.row.name}: ${s.title}, published ${dayLabel(s.date!)}${stale ? ", stale: re-check before a call" : ""}`}
                  className={cx("flex h-full flex-col gap-2 rounded-[10px] bg-white px-3.5 py-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", BOX[tier])}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-bold">{a.row.name}</span>
                    <SourceChip n={s.id} source={s} now={now} />
                    <span className="font-mono text-xs text-[#4A4F63]">{dayLabel(s.date!)}</span>
                    {stale && <span className="rounded border border-dashed border-[#9097A6] px-1.5 py-0.5 text-xs font-semibold text-[#4A4F63]">re-check before a call</span>}
                  </span>
                  <span className={cx("text-[15px] leading-snug", TEXT[tier])}>{s.title}</span>
                  <span aria-hidden className="block h-1 overflow-hidden rounded-sm bg-[#ECE8DE]">
                    <span className={cx("block h-1 bg-foreground", BAR[tier])} style={{ width: `${pct}%` }} />
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dotted border-[#9097A6] px-4 py-3 text-[15px] text-[#4A4F63]">No source in this territory carries a publish date yet.</p>
      )}
    </section>
  );
}
