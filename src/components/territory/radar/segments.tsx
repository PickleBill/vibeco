// Segments (Strategic, Enterprise) and Omni-at-the-account marks, shared by
// the radar, lookalikes and the account switcher. The Omni mark is a ring
// (solid on the list, dashed when named in a stack line): navy, never an
// evidence color and never the accent, so it reads as a note, not a signal.
import { useId } from "react";
import type { Segment, TerritorySegment } from "@/lib/sellers";
import { OMNI_TEXT, type OmniStatus } from "../model";
import { cx } from "../style";

/**
 * The ring glyph: solid for Confirmed, dashed for Likely; nothing otherwise.
 * `around` draws it that many pixels outside its (relative) parent instead.
 */
export function OmniRing({ status, around, className }: { status: OmniStatus; around?: number; className?: string }) {
  if (status === "None found") return null;
  return (
    <span
      aria-hidden
      style={around !== undefined ? { inset: -around } : undefined}
      className={cx("shrink-0 rounded-full border-[1.5px] border-foreground", around !== undefined ? "absolute" : "inline-block h-3 w-3", status === "Likely" && "border-dashed", className)}
    />
  );
}

/**
 * "◯ On the list": the short form, the full sentence in its title and for
 * screen readers. `quiet` drops the box (table cells, where it may wrap).
 */
export function OmniTag({ status, quiet, className }: { status: OmniStatus; quiet?: boolean; className?: string }) {
  const t = OMNI_TEXT[status];
  const none = status === "None found";
  return (
    <span
      title={t.full}
      className={cx(
        "inline-flex min-h-[26px] max-w-full items-center gap-1.5 text-[13px] leading-tight",
        !quiet && "rounded-md border border-[#D9D4C7] bg-white px-2 py-0.5",
        none ? (quiet ? "text-muted-foreground" : "font-medium text-[#4A4F63]") : "font-semibold text-foreground",
        className,
      )}
    >
      <OmniRing status={status} />
      <span aria-hidden>{t.chip}</span>
      <span className="sr-only">{t.full}</span>
    </span>
  );
}

/** "Strategic" as a small mono tag; the note ("5,000+ employees") in its title. */
export function SegmentTag({ segment, note, className }: { segment: Segment; note?: string; className?: string }) {
  return (
    <span
      title={note ? `${segment} · ${note}` : segment}
      className={cx("inline-flex h-[26px] shrink-0 items-center rounded-md border border-[#D9D4C7] bg-background px-2 font-mono text-xs font-semibold uppercase tracking-[0.04em] text-[#4A4F63]", className)}
    >
      {segment}
    </span>
  );
}

/**
 * All · Strategic · Enterprise, with counts, as a radio group (arrow keys
 * move the choice, as in a native radio group). `value` undefined is All.
 */
export function SegmentFilter({
  segments,
  counts,
  total,
  value,
  onChange,
  className,
}: {
  segments: TerritorySegment[];
  counts: Partial<Record<Segment, number>>;
  total: number;
  value?: Segment;
  onChange: (segment?: Segment) => void;
  className?: string;
}) {
  const options: { id?: Segment; label: string; note?: string; count: number }[] = [
    { label: "All", count: total },
    ...segments.map((s) => ({ id: s.id, label: s.label, note: s.note, count: counts[s.id] ?? 0 })),
  ];
  const labelId = useId();
  const at = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  );
  return (
    <div className={cx("flex flex-wrap items-center gap-x-2.5 gap-y-1.5", className)}>
      <span id={labelId} className="font-mono text-xs font-semibold uppercase tracking-[0.06em] text-[#4A4F63]">
        Segment
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="inline-flex flex-wrap gap-1 rounded-[10px] border border-border bg-white p-1"
        onKeyDown={(e) => {
          const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
          const jump = { Home: 0, End: options.length - 1 }[e.key];
          if (step === undefined && jump === undefined) return;
          e.preventDefault();
          const next = jump ?? (at + step! + options.length) % options.length;
          onChange(options[next].id);
          (e.currentTarget.querySelectorAll<HTMLElement>("[role=radio]")[next] ?? null)?.focus();
        }}
      >
        {options.map((o, i) => {
          const on = i === at;
          return (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              title={o.note ? `${o.label}: ${o.note}` : undefined}
              onClick={() => onChange(o.id)}
              className={cx(
                "inline-flex min-h-11 items-baseline gap-1.5 rounded-lg border px-3 py-2 text-[15px] leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on ? "border-primary bg-brand-tint font-bold text-foreground" : "border-transparent font-medium text-[#4A4F63] hover:text-foreground",
              )}
            >
              {o.label}
              <span className="font-mono text-xs font-semibold text-[#4A4F63]">{o.count}</span>
              {o.note && <span className="hidden text-[13px] font-normal text-muted-foreground md:inline">{o.note}</span>}
              {o.note && <span className="sr-only md:hidden">, {o.note}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
