import type { ResearchSource } from "@/components/simulator/SourcesList";
import type { CriticResult } from "@/components/account/explorer/model";
import { criticFor } from "@/lib/lenses";
import { ReadMore } from "../Memo";
import { SEAT_IDS, stanceWord, type CommitteeResult, type SeatId, type Stance } from "./model";
import { CitedLine, Delta, SeatToken } from "./parts";

/**
 * Before (or without) a meeting: who's at the table, each with their critic's
 * saved headline, so the room is never empty.
 */
export function SavedTakes({ critics, sources }: { critics: Partial<Record<SeatId, CriticResult>>; sources: ResearchSource[] }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-bold text-foreground">At the table</h3>
        <span className="font-mono text-xs text-muted-foreground">the critics’ saved takes · synthetic</span>
      </div>
      <ul className="mt-2 divide-y divide-[#ECE8DE]">
        {SEAT_IDS.map((id) => {
          const meta = criticFor("account", id);
          const headline = critics[id]?.headline;
          return (
            <li key={id} className="flex gap-3 py-3">
              <SeatToken seat={id} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight text-foreground">
                  {meta?.name} <span className="font-normal text-muted-foreground">· {meta?.tagline}</span>
                </p>
                <p className="mt-1 text-[15px] leading-snug text-foreground">{headline ? <CitedLine text={headline} sources={sources} /> : <span className="text-muted-foreground">No saved take for this seat.</span>}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The five seats once there's a meeting: who sits where, how much they weigh,
 * and what worries them.
 */
export function SeatCards({
  committee,
  stances,
  deltas,
  critics,
  sources,
}: {
  committee: CommitteeResult;
  stances: Partial<Record<SeatId, Stance>>;
  deltas?: Partial<Record<SeatId, number>>;
  /** A seat's saved headline stands in when the meeting gives no concern. */
  critics: Partial<Record<SeatId, CriticResult>>;
  sources: ResearchSource[];
}) {
  return (
    <section aria-labelledby="committee-seats">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="committee-seats" className="font-display text-[22px] font-semibold tracking-[-0.01em] text-foreground">
          The five seats
        </h2>
        <span className="font-mono text-xs text-muted-foreground">top concerns · synthetic</span>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 min-[1360px]:grid-cols-5">
        {SEAT_IDS.map((id) => {
          const seat = committee.seats.find((s) => s.seat === id);
          const meta = criticFor("account", id);
          const stance = seat ? stances[id] ?? seat.stance_end : undefined;
          const headline = critics[id]?.headline;
          const line = seat?.top_concern || headline || "";
          return (
            <li key={id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-white p-4">
              <div className="flex items-center gap-3">
                <SeatToken seat={id} stance={stance} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold leading-tight text-foreground">{seat?.role ?? meta?.name}</p>
                  <p className="text-[13px] leading-snug text-muted-foreground">{meta?.tagline}</p>
                </div>
              </div>
              {seat && stance !== undefined && (
                <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    {stanceWord(stance)}
                    {!!deltas?.[id] && <Delta by={deltas[id]!} />}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    <span className="font-mono text-[15px] font-semibold text-foreground">×{seat.influence}</span> influence
                  </span>
                </p>
              )}
              <div className="border-t border-[#ECE8DE] pt-2.5">
                <p className="text-xs font-bold uppercase tracking-[0.04em] text-muted-foreground">{seat?.top_concern ? "Top concern" : "Saved take"}</p>
                {line ? (
                  <ReadMore className="mt-1 text-[15px] leading-snug text-foreground">
                    <CitedLine text={line} sources={sources} />
                  </ReadMore>
                ) : (
                  <p className="mt-1 text-[15px] leading-snug text-foreground">No saved take for this seat.</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
