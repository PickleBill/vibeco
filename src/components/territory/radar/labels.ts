// Fitting name labels around dots in a 400×400 chart (the radar, the
// lookalike constellation) so that none overlap.

export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export type LabelSide = "left" | "right" | "above" | "below";

export interface LabelItem {
  id: string;
  /** The label's text, for its width. */
  text: string;
  x: number;
  y: number;
}

export interface PlacedLabel {
  id: string;
  side: LabelSide;
}

/** Tailwind classes that put a label on each side of its dot (14px off). */
export const LABEL_SIDE: Record<LabelSide, string> = {
  left: "-translate-x-[calc(100%+14px)] -translate-y-1/2",
  right: "translate-x-3.5 -translate-y-1/2",
  above: "-translate-x-1/2 -translate-y-[calc(100%+14px)]",
  below: "-translate-x-1/2 translate-y-3.5",
};

export const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/**
 * Greedy, in the order given (most important first): each label tries the
 * side away from the centre, the other side, then above and below, and takes
 * the first spot that stays in the chart and clears every placed label, every
 * other dot and the `reserved` boxes. A label with no room is left off. `s` is
 * chart units per pixel (400 / rendered width), so a phone fits fewer.
 */
export function fitLabels(items: LabelItem[], s = 1, reserved: Box[] = []): PlacedLabel[] {
  const H = 22 * s;
  const GAP = 14 * s;
  const DOT = 9 * s;
  const boxes = [...reserved];
  const out: PlacedLabel[] = [];
  for (const it of items) {
    const w = (it.text.length * 7.6 + 18) * s;
    const outward: LabelSide = it.x > 320 ? "left" : it.x < 80 ? "right" : it.x < 200 ? "left" : "right";
    const vertical: LabelSide = it.y < 200 ? "above" : "below";
    const sides: LabelSide[] = [outward, outward === "left" ? "right" : "left", vertical, vertical === "above" ? "below" : "above"];
    for (const side of sides) {
      const box: Box =
        side === "left"
          ? { x0: it.x - GAP - w, x1: it.x - GAP, y0: it.y - H / 2, y1: it.y + H / 2 }
          : side === "right"
            ? { x0: it.x + GAP, x1: it.x + GAP + w, y0: it.y - H / 2, y1: it.y + H / 2 }
            : side === "above"
              ? { x0: it.x - w / 2, x1: it.x + w / 2, y0: it.y - GAP - H, y1: it.y - GAP }
              : { x0: it.x - w / 2, x1: it.x + w / 2, y0: it.y + GAP, y1: it.y + GAP + H };
      if (box.x0 < 0 || box.x1 > 400 || box.y0 < 0 || box.y1 > 400) continue;
      if (boxes.some((o) => overlaps(box, o))) continue;
      if (items.some((o) => o !== it && overlaps(box, { x0: o.x - DOT, x1: o.x + DOT, y0: o.y - DOT, y1: o.y + DOT }))) continue;
      boxes.push(box);
      out.push({ id: it.id, side });
      break;
    }
  }
  return out;
}

/** A chart label's name: long names keep their first words ("Perry Ellis International" -> "Perry Ellis"). */
export function shortName(name: string, max = 16): string {
  if (name.length <= max) return name;
  const words = name.split(/\s+/);
  let out = words[0];
  for (const w of words.slice(1)) {
    if (`${out} ${w}`.length > max) break;
    out = `${out} ${w}`;
  }
  return out;
}

/** A centred text box (a ring label, a note) in chart units. */
export const textBox = (x: number, y: number, text: string, s: number, charPx = 7.3): Box => {
  const w = (text.length * charPx + 8) * s;
  return { x0: x - w / 2, x1: x + w / 2, y0: y - 9 * s, y1: y + 9 * s };
};
