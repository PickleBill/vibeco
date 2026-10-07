// Small pieces the committee view repeats, after the design's component sheet:
// the seat token (ring = stance, badge = influence, pink glow = speaking),
// the stance meter (role="meter"), a what-if delta, and lines whose [n]
// citations become source chips.
import { Fragment } from "react";
import { ArrowDown, ArrowUp, Equal } from "lucide-react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { stripMarks } from "@/components/account/explorer/model";
import { cx } from "../style";
import { SourceChip } from "../ui";
import { SEAT_INITIALS, STANCE_RING, signed, stancePercent, stanceWord, type SeatId, type Stance } from "./model";

// ─── Citations ───

// A run of citations ("[1] [2, 3]") and the punctuation right after it, kept on one line.
const CITES = /((?:\s*\[\d+(?:\s*,\s*\d+)*\])+[.,;:!?)]*)/g;

/** A line with its [n] citations as numbered source chips (unknown numbers dropped). */
export function CitedLine({ text, sources }: { text: string; sources: ResearchSource[] }) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const parts = stripMarks(text).split(CITES);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const ids = [...new Set((part.match(/\d+/g) ?? []).map(Number))].filter((id) => byId.has(id));
        const tail = /[.,;:!?)]*$/.exec(part)?.[0] ?? "";
        return (
          <span key={i} className="whitespace-nowrap">
            {ids.length > 0 && (
              <span className="ml-1 inline-flex gap-1 align-middle">
                {ids.map((id) => (
                  <SourceChip key={id} n={id} source={byId.get(id)} />
                ))}
              </span>
            )}
            {tail}
          </span>
        );
      })}
    </>
  );
}

// ─── Seat token ───

const TOKEN_SIZE = {
  lg: "h-12 w-12 text-[13px] sm:h-14 sm:w-14 sm:text-[15px] min-[1360px]:h-[68px] min-[1360px]:w-[68px] min-[1360px]:text-base",
  md: "h-11 w-11 text-[13px]",
  sm: "h-10 w-10 text-[13px]",
};

/** The pink ring around a seat that's speaking (a fill, never text). */
export const SPEAKING_GLOW = "shadow-[0_0_0_4px_#fff,0_0_0_8px_hsl(var(--brand))]";

/**
 * A seat at the table: initials in a ring whose style is the stance (no
 * stance yet: a plain hairline), an influence badge, a pink glow while it
 * speaks. Decorative: callers say the same thing in words.
 */
export function SeatToken({
  seat,
  stance,
  influence,
  size = "lg",
  speaking,
  waiting,
}: {
  seat: SeatId;
  stance?: Stance;
  influence?: 1 | 2 | 3;
  size?: keyof typeof TOKEN_SIZE;
  speaking?: boolean;
  /** Reading the evidence (loading): a static dashed outline. */
  waiting?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center rounded-full bg-white font-display font-bold text-foreground transition-shadow duration-300 motion-reduce:transition-none",
        TOKEN_SIZE[size],
        stance === undefined ? "border-2 border-[#D9D4C7]" : STANCE_RING[stance],
        speaking && SPEAKING_GLOW,
        waiting && "outline-dashed outline-2 outline-offset-4 outline-brand",
      )}
    >
      {SEAT_INITIALS[seat]}
      {influence && (
        <span className="absolute -right-2.5 -top-1.5 rounded bg-foreground px-1 font-mono text-xs font-semibold leading-[18px] text-white">×{influence}</span>
      )}
    </span>
  );
}

// ─── What-if delta ───

/** "▲ +1" toward yes, "▼ -1" toward no, "= 0" holds. */
export function Delta({ by, className }: { by: number; className?: string }) {
  const Icon = by > 0 ? ArrowUp : by < 0 ? ArrowDown : Equal;
  return (
    <span
      className={cx(
        "inline-flex h-[22px] shrink-0 items-center gap-0.5 rounded-[4px] border px-1.5 font-mono text-xs font-semibold",
        by === 0 ? "border-dotted border-[#9097A6] text-[#4A4F63]" : "border-foreground bg-white text-foreground",
        className,
      )}
      title={by > 0 ? "Moved toward yes in the what-if" : by < 0 ? "Moved toward no in the what-if" : "Same as the saved meeting"}
    >
      <Icon size={12} strokeWidth={2.5} aria-hidden />
      {by === 0 ? "same" : signed(by)}
    </span>
  );
}

// ─── Stance meter ───

const EASE = "transition-[left,width] duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none";

/**
 * Blocks (-2) to sponsors (+2). The marker turns pink when the stance moved
 * this round; a dashed ring marks the saved meeting's stance under a what-if.
 */
export function StanceMeter({ value, label, moved, baseline }: { value: Stance; label: string; moved?: boolean; baseline?: Stance }) {
  const pos = stancePercent(value);
  return (
    <div
      role="meter"
      aria-label={`${label} stance`}
      aria-valuemin={-2}
      aria-valuemax={2}
      aria-valuenow={value}
      aria-valuetext={`${stanceWord(value)}${baseline !== undefined && baseline !== value ? `, was ${stanceWord(baseline)}` : ""}`}
      className="relative h-3 rounded-md border border-border bg-muted"
    >
      <div className="absolute inset-y-0 left-2.5 right-2.5">
        <span aria-hidden className="absolute -bottom-1 -top-1 left-1/2 w-0.5 -translate-x-1/2 bg-[#9097A6]" />
        {[0, 25, 75, 100].map((t) => (
          <span key={t} aria-hidden className="absolute bottom-0.5 top-0.5 w-px -translate-x-1/2 bg-[#D9D4C7]" style={{ left: `${t}%` }} />
        ))}
        <span aria-hidden className={cx("absolute bottom-[2px] top-[2px] rounded bg-foreground/85", EASE)} style={{ left: `${Math.min(50, pos)}%`, width: `${Math.abs(pos - 50)}%` }} />
        {baseline !== undefined && baseline !== value && (
          <span aria-hidden className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-[#4A4F63] bg-transparent" style={{ left: `${stancePercent(baseline)}%` }} />
        )}
        <span
          aria-hidden
          className={cx("absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground", moved ? "bg-brand" : "bg-white", EASE)}
          style={{ left: `${pos}%` }}
        />
      </div>
    </div>
  );
}
