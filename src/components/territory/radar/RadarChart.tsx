import { useReducedMotion } from "framer-motion";
import { cx } from "../style";
import { agoText } from "./evidence";
import { LABEL_SIDE, shortName } from "./labels";
import { useWidth } from "./useWidth";
import { C, EMPTY_NOTE, RING_LABELS, RINGS, emptyNoteAt, placeBlips, placeLabels, polar, reservedBoxes, sectors, wedge, type RadarAccount } from "./model";

const FIT_SIZE: Record<string, number> = { A: 22, B: 16, C: 12 };
const sizeOf = (fit?: string) => FIT_SIZE[(fit ?? "").trim().toUpperCase().slice(0, 1)] ?? 12;
const pct = (v: number) => `${(v / 4).toFixed(2)}%`;

const CORNER: Record<string, string> = {
  tl: "left-1.5 top-1.5",
  tr: "right-1.5 top-1.5 text-right",
  bl: "bottom-1.5 left-1.5",
  br: "bottom-1.5 right-1.5 text-right",
};

/**
 * The territory as a radar: distance from the centre is how fresh the
 * account's newest dated trigger is, the three sectors are the motions, blip
 * size is fit. Fresh or changed accounts pulse pink; the sweep runs once on
 * load. Each blip is a button that opens the account in focus.
 */
export function RadarChart({
  accounts,
  focusId,
  onFocus,
}: {
  accounts: RadarAccount[];
  focusId?: string | null;
  onFocus: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const [box, width] = useWidth<HTMLDivElement>(420);
  const blips = placeBlips(accounts);
  const secs = sectors(accounts.some((a) => a.row.motion === "Unclear"));
  const empty = secs.filter((s) => !accounts.some((a) => a.row.motion === s.motion));
  const scale = 400 / Math.max(200, width);
  const labels = placeLabels(
    blips,
    focusId,
    scale,
    reservedBoxes(
      secs,
      empty.map((s) => s.motion),
      scale,
    ),
  );

  return (
    <section aria-label="Territory radar" className="mx-auto w-full max-w-[420px]">
      <div ref={box} className="relative aspect-square w-full">
        <svg viewBox="0 0 400 400" aria-hidden className="absolute inset-0 block h-full w-full">
          <circle cx={C} cy={C} r={RINGS.rim} fill="#FAF8F2" stroke="#E4E0D6" />
          <circle cx={C} cy={C} r={RINGS.none} fill="none" stroke="#C9C4B6" strokeDasharray="2 5" />
          <circle cx={C} cy={C} r={RINGS.year} fill="none" stroke="#E4E0D6" />
          <circle cx={C} cy={C} r={RINGS.d90} fill="none" stroke="#E4E0D6" />
          <circle cx={C} cy={C} r={RINGS.d30} fill="none" stroke="#E4E0D6" />
          {secs.map((s) => {
            const p = polar(RINGS.rim, s.start);
            return <line key={s.motion} x1={C} y1={C} x2={p.x} y2={p.y} stroke="#D9D4C7" />;
          })}
          <circle cx={C} cy={C} r={RINGS.today} fill="#FFFFFF" stroke="#E4E0D6" />
          <circle cx={C} cy={C} r={3} fill="#1A1D2E" />

          {!reduce && (
            <g opacity="1">
              <path d={wedge(192, -90, -40)} style={{ fill: "hsl(var(--brand))" }} fillOpacity={0.16} />
              <animateTransform attributeName="transform" type="rotate" from={`0 ${C} ${C}`} to={`360 ${C} ${C}`} dur="2.8s" repeatCount="1" fill="freeze" />
              <animate attributeName="opacity" from="1" to="0" begin="2.8s" dur="0.6s" fill="freeze" />
            </g>
          )}

          {blips
            .filter((b) => b.account.pulse)
            .map((b) =>
              reduce ? (
                <circle key={b.account.row.id} cx={b.x} cy={b.y} r={19} fill="none" style={{ stroke: "hsl(var(--brand))" }} strokeWidth={2} strokeDasharray="3 4" />
              ) : (
                <circle key={b.account.row.id} cx={b.x} cy={b.y} r={10} fill="none" style={{ stroke: "hsl(var(--brand))" }} strokeWidth={2.5}>
                  <animate attributeName="r" values="10;34" dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.85;0" dur="2.2s" repeatCount="indefinite" />
                </circle>
              ),
            )}
        </svg>

        {secs.map((s) => (
          <span key={s.motion} aria-hidden className={cx("pointer-events-none absolute font-mono text-xs font-semibold uppercase tracking-[0.06em] text-[#4A4F63]", CORNER[s.corner])}>
            {s.motion}
          </span>
        ))}
        {empty.map((s) => {
          const p = emptyNoteAt(s);
          return (
            <span
              key={s.motion}
              style={{ left: pct(p.x), top: pct(p.y) }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-xs italic text-muted-foreground"
            >
              {EMPTY_NOTE}
              <span className="sr-only"> in {s.motion}</span>
            </span>
          );
        })}
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[12px] bg-white px-1 font-mono text-xs text-muted-foreground">
          today
        </span>
        {RING_LABELS.map((l) => (
          <span
            key={l.text}
            aria-hidden
            style={{ top: pct(C - l.r) }}
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-background px-1 font-mono text-xs leading-tight text-muted-foreground"
          >
            {l.text}
          </span>
        ))}

        {blips.map((b) => {
          const { row, trigger, changes, pulse } = b.account;
          const size = sizeOf(row.fit);
          const on = focusId === row.id;
          const age = trigger ? `trigger ${agoText(trigger.days)}` : "no dated trigger";
          const label = [row.name, row.motion, `Fit ${row.fit ?? "unknown"}`, age, changes.length ? "changed since the last run" : ""].filter(Boolean).join(" · ");
          const named = labels.some((l) => l.id === row.id);
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onFocus(row.id)}
              aria-label={label}
              aria-pressed={on}
              style={{ left: pct(b.x), top: pct(b.y) }}
              className="group absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full hover:z-30 focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {!named && (
                // No room for a standing label: the name shows on hover and keyboard focus.
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-full left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-foreground bg-white px-2 py-0.5 text-[13px] font-bold leading-tight group-hover:block group-focus-visible:block"
                >
                  {row.name}
                </span>
              )}
              <span
                className={cx("block rounded-full", pulse ? "bg-brand shadow-[0_0_0_2px_hsl(var(--foreground))]" : "bg-foreground")}
                style={{ width: size, height: size, ...(on ? { boxShadow: "0 0 0 3px #FFFFFF, 0 0 0 5px hsl(var(--primary))" } : {}) }}
              />
            </button>
          );
        })}
        {labels.map((l) => {
          const b = blips.find((x) => x.account.row.id === l.id)!;
          return (
            <span
              key={l.id}
              aria-hidden
              style={{ left: pct(b.x), top: pct(b.y) }}
              className={cx(
                "pointer-events-none absolute z-20 whitespace-nowrap rounded-md border bg-white px-2 py-0.5 text-[13px] font-bold leading-tight",
                LABEL_SIDE[l.side],
                b.account.pulse ? "border-brand" : "border-foreground/70",
                l.id === focusId && "border-primary shadow-[0_0_0_1px_hsl(var(--primary))]",
              )}
            >
              {shortName(b.account.row.name)}
            </span>
          );
        })}
      </div>
      <div className="mt-3.5 flex flex-wrap gap-x-[18px] gap-y-2 text-sm text-[#4A4F63]">
        <span>Distance from center = trigger freshness</span>
        <span>Outer band = no dated trigger</span>
        <span className="inline-flex items-center gap-1.5">
          Size = fit
          {(["A", "B", "C"] as const).map((g) => (
            <span key={g} className="inline-flex items-center gap-1">
              <span aria-hidden className="inline-block rounded-full bg-foreground" style={{ width: FIT_SIZE[g], height: FIT_SIZE[g] }} />
              {g}
            </span>
          ))}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full bg-brand shadow-[0_0_0_2px_hsl(var(--foreground))]" />
          Trigger in the last 30 days{accounts.some((a) => a.changes.length) ? " or changed" : ""}
        </span>
      </div>
    </section>
  );
}
