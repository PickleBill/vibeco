import { cx } from "../style";
import { fitLabels, LABEL_SIDE, shortName, textBox, type Box } from "../radar/labels";
import { useWidth } from "../radar/useWidth";
import type { Fingerprint, Lookalike } from "./model";

const FIT_SIZE: Record<string, number> = { A: 28, B: 23, C: 19 };
const sizeOf = (fit?: string) => FIT_SIZE[(fit ?? "").trim().toUpperCase().slice(0, 1)] ?? 19;
/** Score 100 sits at the seed's edge, 0 at the rim. */
const radiusFor = (score: number) => 44 + ((100 - score) / 100) * 140;
const RINGS = [75, 50, 25];
const ringText = (s: number) => (s === 25 ? "25 similarity" : String(s));
const pct = (v: number) => `${(v / 4).toFixed(2)}%`;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/**
 * The seed in the centre, every other account around it: closer means more
 * alike, size is fit. Each star carries its rank in the list; names go
 * beside the stars where they fit, and on hover and focus where they don't.
 * Stars are buttons; picking one highlights it in the list.
 */
export function Constellation({ seed, items, selected, onPick }: { seed: Fingerprint; items: Lookalike[]; selected?: string | null; onPick: (id: string) => void }) {
  const [ref, width] = useWidth<HTMLDivElement>(440);
  // Golden-angle steps by rank: the closest matches spread around the seed instead
  // of bunching on one side; the top axis stays clear for the ring labels.
  const stars = items.map((it, i) => {
    let deg = (((-60 + i * 137.5) % 360) + 360) % 360;
    if (Math.abs(deg - 270) < 16) deg = deg < 270 ? 254 : 286;
    const r = radiusFor(it.score);
    return { it, rank: i + 1, x: 200 + r * Math.cos((deg * Math.PI) / 180), y: 200 + r * Math.sin((deg * Math.PI) / 180) };
  });
  const s = 400 / Math.max(200, width);
  const reserved: Box[] = [
    { x0: 200 - 34 * s, x1: 200 + 34 * s, y0: 200 - 34 * s, y1: 200 + 34 * s },
    textBox(200, 200 + 42 * s, seed.name, s, 7.6),
    ...RINGS.map((r) => textBox(200, 200 - radiusFor(r), ringText(r), s)),
  ];
  const order = [...stars].sort((a, b) => Number(b.it.fp.id === selected) - Number(a.it.fp.id === selected) || b.it.score - a.it.score);
  const labels = fitLabels(
    order.map((x) => ({ id: x.it.fp.id, text: `${shortName(x.it.fp.name)} ${x.it.score}`, x: x.x, y: x.y })),
    s,
    reserved,
  );

  return (
    <div ref={ref} className="relative aspect-square w-full rounded-2xl border border-border bg-white">
      <svg viewBox="0 0 400 400" aria-hidden className="absolute inset-0 block h-full w-full">
        {RINGS.map((r) => (
          <circle key={r} cx={200} cy={200} r={radiusFor(r)} fill="none" stroke="#E4E0D6" />
        ))}
        <circle cx={200} cy={200} r={radiusFor(0)} fill="none" stroke="#ECE8DE" strokeDasharray="2 5" />
        {stars.map((x) => (
          <line key={x.it.fp.id} x1={200} y1={200} x2={x.x} y2={x.y} stroke={x.it.fp.id === selected ? "#CE075F" : "#ECE8DE"} strokeWidth={x.it.fp.id === selected ? 1.5 : 1} />
        ))}
      </svg>
      {RINGS.map((r) => (
        <span key={r} aria-hidden style={{ top: pct(200 - radiusFor(r)) }} className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1 font-mono text-xs text-muted-foreground">
          {ringText(r)}
        </span>
      ))}
      <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-[29px] flex-col items-center gap-1 text-center">
        <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-foreground font-display text-[15px] font-bold text-white">{initials(seed.name)}</span>
        <span className="whitespace-nowrap rounded bg-white px-1.5 text-[13px] font-bold">{seed.name}</span>
      </div>
      {stars.map(({ it, rank, x, y }) => {
        const on = selected === it.fp.id;
        const size = sizeOf(it.fp.fit);
        const named = labels.some((l) => l.id === it.fp.id);
        return (
          <button
            key={it.fp.id}
            type="button"
            onClick={() => onPick(it.fp.id)}
            aria-pressed={on}
            aria-label={`${rank}. ${it.fp.name}, similarity ${it.score} of 100, fit ${it.fp.fit ?? "unknown"}`}
            style={{ left: pct(x), top: pct(y) }}
            className="group absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full hover:z-30 focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {!named && (
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-full left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-[5px] border border-foreground bg-white px-1.5 text-[13px] font-semibold group-hover:block group-focus-visible:block"
              >
                {it.fp.name} <span className="font-mono text-xs text-[#4A4F63]">{it.score}</span>
              </span>
            )}
            <span
              aria-hidden
              className="flex items-center justify-center rounded-full border-2 border-foreground bg-foreground font-mono text-[11px] font-semibold leading-none text-white"
              style={{ width: size, height: size, ...(on ? { boxShadow: "0 0 0 3px #FFFFFF, 0 0 0 6px hsl(var(--primary))" } : {}) }}
            >
              {rank}
            </span>
          </button>
        );
      })}
      {labels.map((l) => {
        const star = stars.find((x) => x.it.fp.id === l.id)!;
        return (
          <span
            key={l.id}
            aria-hidden
            style={{ left: pct(star.x), top: pct(star.y) }}
            className={cx(
              "pointer-events-none absolute z-20 whitespace-nowrap rounded-[5px] bg-white px-1.5 text-[13px] font-semibold",
              LABEL_SIDE[l.side],
              selected === l.id ? "border-2 border-primary" : "border border-border",
            )}
          >
            {shortName(star.it.fp.name)} <span className="font-mono text-xs text-[#4A4F63]">{star.it.score}</span>
          </span>
        );
      })}
    </div>
  );
}
