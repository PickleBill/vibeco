import { cx } from "../style";
import { stanceWord, type SeatId, type Stance } from "./model";
import { Delta, SeatToken } from "./parts";

export interface TableSeat {
  seat: SeatId;
  role: string;
  influence?: 1 | 2 | 3;
  /** Unknown until the meeting has run. */
  stance?: Stance;
  /** Against the saved meeting, under a what-if. */
  delta?: number;
}

// The room in SVG units: a 400 x 424 box (a little taller than wide, so the
// labels under the bottom seats fit), the table and the ring of seats centered
// a little above the middle. The table stays clear of the side seats' labels
// at phone width.
const W = 400;
const H = 424;
const CX = 200;
const CY = 196;
const SEAT_R = 148;
const TABLE_R = 82;

/** Seat i's token center, clockwise from the top, as fractions of the box. */
const at = (i: number) => {
  const a = ((-90 + i * 72) * Math.PI) / 180;
  return { x: (CX + SEAT_R * Math.cos(a)) / W, y: (CY + SEAT_R * Math.sin(a)) / H, a };
};

/** An arc of the table's rim facing a seat. */
function rimArc(a: number, r = TABLE_R, half = 0.36) {
  const p = (t: number) => `${(CX + r * Math.cos(t)).toFixed(1)} ${(CY + r * Math.sin(t)).toFixed(1)}`;
  return `M ${p(a - half)} A ${r} ${r} 0 0 1 ${p(a + half)}`;
}

/**
 * The buying room from above: five seat tokens around a table, the round in
 * the middle. The pink rim arc and glow follow the seat that's speaking.
 * Screen readers get the same seats as a list.
 */
export function RoundTable({
  seats,
  speaking,
  lit,
  waiting,
  eyebrow,
  title,
}: {
  seats: TableSeat[];
  speaking?: SeatId;
  /** Loading: the seat whose glow is passing round the table. */
  lit?: SeatId;
  /** Loading under reduced motion: every seat gets a static dashed outline. */
  waiting?: boolean;
  eyebrow: string;
  title: string;
}) {
  const speaker = seats.findIndex((s) => s.seat === (speaking ?? lit));
  return (
    <div className="relative mx-auto aspect-[400/424] w-full max-w-[520px] rounded-2xl border border-border bg-white">
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden className="absolute inset-0 block h-full w-full">
        <circle cx={CX} cy={CY} r={TABLE_R} fill="#F2EFE7" stroke="#D9D4C7" strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r={TABLE_R - 12} fill="none" stroke="#E4E0D6" strokeDasharray="2 4" />
        {speaker >= 0 && <path d={rimArc(at(speaker).a)} fill="none" stroke="hsl(var(--brand))" strokeWidth="5" strokeLinecap="round" />}
      </svg>

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 w-[36%] -translate-x-1/2 -translate-y-1/2 text-center"
        style={{ top: `${(CY / H) * 100}%` }}
      >
        <p className="font-mono text-xs tracking-[0.04em] text-muted-foreground">{eyebrow}</p>
        <p className="mt-1 font-display text-[15px] font-semibold leading-tight text-foreground sm:text-[17px]">{title}</p>
        <p className="mt-1.5 font-mono text-xs text-muted-foreground">synthetic</p>
      </div>

      {seats.map((s, i) => {
        // The token (48, 56 or 68px) centers on the seat; its label hangs below.
        const { x, y } = at(i);
        return (
          <div
            key={s.seat}
            aria-hidden
            className="absolute flex w-[104px] -translate-x-1/2 -translate-y-6 flex-col items-center gap-1.5 sm:-translate-y-7 min-[1360px]:-translate-y-[34px]"
            style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          >
            <SeatToken seat={s.seat} stance={s.stance} influence={s.influence} speaking={s.seat === speaking || s.seat === lit} waiting={waiting} />
            <span className="rounded-md bg-white/95 px-1.5 py-0.5 text-center text-[13px] font-bold leading-tight text-foreground">
              {s.role}
              <span className={cx("mt-0.5 flex items-center justify-center gap-1 font-medium", s.stance === undefined ? "text-muted-foreground" : "text-[#4A4F63]")}>
                {s.stance === undefined ? "—" : stanceWord(s.stance)}
                {/* On phones the stance list right below carries the deltas. */}
                {!!s.delta && <Delta by={s.delta} className="hidden sm:inline-flex" />}
              </span>
            </span>
          </div>
        );
      })}

      <ul className="sr-only" aria-label="Seats at the table">
        {seats.map((s) => (
          <li key={s.seat}>
            {s.role}
            {s.stance !== undefined ? `: ${stanceWord(s.stance)}` : ""}
            {s.influence ? `, influence ${s.influence} of 3` : ""}
            {s.delta ? `, ${s.delta > 0 ? "up" : "down"} ${Math.abs(s.delta)} in the what-if` : ""}
            {s.seat === speaking ? ", speaking" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
