import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { cx, primaryButton, secondaryButton } from "../style";
import { pickTarget, revealFrom } from "./reveal";

type Box = { top: number; left: number; width: number; height: number };
type Size = { w: number; h: number };

const PAD = 6; // ring around the target
const GAP = 12; // ring to card
const MIN_GAP = 4; // ring to card when space is tight
const EDGE = 16; // card to viewport edge
const MARGIN = 8; // card to viewport edge when space is tight
const SETTLE_MS = 2500; // a view's late content can still push the target
const REVEAL_MS = 4000; // the step's folds open while the view loads
const CARD_W = 344;
const NONE: string[] = [];
const PHONE = 640;

const sameBox = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);

const viewport = () => ({ w: window.innerWidth, h: window.innerHeight });

/**
 * Find `[data-tour=target]` and follow it: views load their data after the
 * route changes, so the element is looked for until it shows up (opening the
 * folds the step names on the way, and settling for a fallback when it
 * doesn't come), scrolled into view once, then tracked through scrolls,
 * resizes and layout shifts. Null while nothing is on the page (the card then
 * sits centered).
 */
function useTarget(target: string | undefined, fallback: string[], reveal: string[], card: { current: Size }) {
  const reduce = useReducedMotion();
  const [box, setBox] = useState<Box | null>(null);
  const [vp, setVp] = useState(viewport);
  // The lists by value, so a re-render with a new array doesn't restart the step.
  const fallbackKey = fallback.join(" ");
  const revealKey = reveal.join(" ");

  useEffect(() => {
    setBox(null);
    if (!target) return;
    const fallbacks = fallbackKey ? fallbackKey.split(" ") : [];
    const reveals = revealKey ? revealKey.split(" ") : [];
    const start = Date.now();
    let revealed = 0;
    let el: Element | null = null;
    let frame = 0;
    // When the target was found and last scrolled to. While the view is still
    // settling (content above it loading), it may be scrolled to again, until
    // the person scrolls for themselves.
    let foundAt = 0;
    let scrolledAt = 0;
    let userScrolled = false;
    const measure = () => {
      frame = 0;
      setVp((v) => {
        const n = viewport();
        return v.w === n.w && v.h === n.h ? v : n;
      });
      const now = Date.now();
      // Open what hides the target, for a few seconds after the step opens.
      if (revealed < reveals.length && now - start < REVEAL_MS) revealed = revealFrom(reveals, revealed);
      const found = pickTarget(target, fallbacks, now - start);
      if (found !== el) {
        el = found;
        foundAt = scrolledAt = 0;
      }
      const r = el?.getBoundingClientRect();
      if (!el || !r || (!r.width && !r.height)) return setBox((b) => (b ? null : b));
      if (!foundAt) foundAt = now;
      const settling = !userScrolled && now - foundAt < SETTLE_MS && now - scrolledAt > 450;
      if (!scrolledAt || settling) {
        const top = scrollTarget(r, card.current);
        if (top !== null) {
          window.scrollTo?.({ top: Math.max(0, window.scrollY + r.top - top), behavior: reduce || scrolledAt ? "auto" : "smooth" });
          scrolledAt = now;
        } else if (!scrolledAt) scrolledAt = 1;
      }
      const next = { top: r.top, left: r.left, width: r.width, height: r.height };
      setBox((b) => (sameBox(b, next) ? b : next));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    const mine = () => {
      userScrolled = true;
    };
    measure();
    // Polling catches late renders and layout shifts that fire no event.
    const poll = window.setInterval(schedule, 200);
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("wheel", mine, { passive: true });
    window.addEventListener("touchmove", mine, { passive: true });
    window.addEventListener("keydown", mine);
    return () => {
      window.clearInterval(poll);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      window.removeEventListener("wheel", mine);
      window.removeEventListener("touchmove", mine);
      window.removeEventListener("keydown", mine);
    };
  }, [target, fallbackKey, revealKey, reduce, card]);

  return { box, vp };
}

/**
 * Where the target's top should sit, or null when it's fine where it is
 * (fully on screen with room for the card). Phones: at the top, since the
 * sheet covers the bottom. Desktop: near the top, lower when the card only
 * fits underneath it.
 */
function scrollTarget(r: Box, card: Size): number | null {
  const vp = viewport();
  const bottom = r.top + r.height;
  if (vp.w < PHONE) return r.top >= 8 && bottom <= vp.h * 0.55 ? null : 12;
  if (r.top >= EDGE && bottom <= vp.h - EDGE && place(r, card, vp).fits) return null;
  if (place({ ...r, top: 88 }, card, vp).fits && 88 + r.height <= vp.h - EDGE) return 88;
  return Math.max(12, Math.min(88, vp.h - (r.height + PAD + MIN_GAP + card.h + MARGIN)));
}

/** Desktop card position: below the target, else above, else beside it, else pinned bottom right over it (`fits` false). */
function place(box: Box, card: Size, vp: Size) {
  const clampX = (x: number) => Math.min(Math.max(EDGE, x), vp.w - card.w - EDGE);
  const clampY = (y: number) => Math.min(Math.max(EDGE, y), vp.h - card.h - EDGE);
  const top = box.top - PAD;
  const bottom = box.top + box.height + PAD;
  const left = box.left - PAD;
  const right = box.left + box.width + PAD;
  if (vp.h - bottom >= MIN_GAP + card.h + MARGIN) return { fits: true, top: Math.min(bottom + GAP, vp.h - card.h - MARGIN), left: clampX(left) };
  if (top >= MIN_GAP + card.h + MARGIN) return { fits: true, top: Math.max(top - GAP - card.h, MARGIN), left: clampX(left) };
  if (vp.w - right - GAP >= card.w + EDGE) return { fits: true, top: clampY(box.top), left: right + GAP };
  if (left - GAP >= card.w + EDGE) return { fits: true, top: clampY(box.top), left: left - GAP - card.w };
  return { fits: false, top: vp.h - card.h - EDGE, left: vp.w - card.w - EDGE };
}

export interface TourCardProps {
  /** The data-tour target; none for the finish card. */
  target?: string;
  /** Pointed at when the target doesn't show up. */
  fallback?: string[];
  /** Folds and choices to open first (see steps.ts). */
  reveal?: string[];
  /** "2 of 7"; none for the finish card. */
  count?: string;
  title: string;
  body: ReactNode;
  /** Buttons, the default (focused) one last. */
  actions: ReactNode;
  onEnd: () => void;
  /** Changes per step, so focus and the entrance replay. */
  stepKey: string;
}

/**
 * The tour overlay: a light scrim with the target cut out and ringed in pink,
 * and a small card beside it (a bottom sheet on phones). The page underneath
 * stays usable, so the step's button can be pressed for real. Esc ends the
 * tour; focus moves to the card's default button on every step.
 */
export function TourCard({ target, fallback = NONE, reveal = NONE, count, title, body, actions, onEnd, stepKey }: TourCardProps) {
  const card = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ w: CARD_W, h: 220 });
  // The scroll that brings the target in reads the card's latest size.
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const { box, vp } = useTarget(target, fallback, reveal, sizeRef);
  const phone = vp.w < PHONE;

  useLayoutEffect(() => {
    const el = card.current;
    if (!el) return;
    const measure = () => setSize((s) => (s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight }));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stepKey]);

  useEffect(() => {
    // The default button is the last one; focusing it must not scroll the page.
    const buttons = card.current?.querySelectorAll<HTMLButtonElement>("[data-tour-actions] button");
    buttons?.[buttons.length - 1]?.focus({ preventScroll: true });
  }, [stepKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEnd();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onEnd]);

  const at = box && place(box, size, vp);
  const pos = phone ? undefined : at ? { top: at.top, left: at.left } : { top: Math.max(EDGE, (vp.h - size.h) / 2), left: Math.max(EDGE, (vp.w - size.w) / 2) };

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {box ? (
        <div
          aria-hidden
          className="absolute rounded-[14px] border-[2.5px] border-primary shadow-[0_0_0_4px_rgba(255,95,162,0.35),0_0_0_200vmax_rgba(26,29,46,0.28)]"
          style={{ top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[#1A1D2E]/[0.28]" />
      )}

      <div
        ref={card}
        key={stepKey}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className={cx(
          "pointer-events-auto absolute border border-border bg-white text-foreground shadow-[0_18px_48px_-12px_rgba(26,29,46,0.4)] duration-200 animate-in fade-in-0 motion-reduce:animate-none",
          phone ? "inset-x-0 bottom-0 rounded-t-2xl px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 slide-in-from-bottom-4" : "w-[344px] rounded-xl p-4 zoom-in-[0.98]",
        )}
        style={pos}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {count && <p className="font-mono text-xs font-semibold uppercase tracking-[0.06em] text-primary">{count}</p>}
            <h2 id="tour-title" className="mt-1 font-display text-lg font-bold leading-snug tracking-[-0.01em]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onEnd}
            aria-label="End the tour"
            className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#4A4F63] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <p id="tour-body" className="mt-1.5 text-[15px] leading-relaxed text-[#4A4F63]">
          {body}
        </p>
        <div data-tour-actions className="mt-3.5 flex flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      </div>
    </div>
  );
}

export const TourButton = ({ kind, onClick, children }: { kind: "primary" | "secondary" | "quiet"; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={cx(
      kind === "primary" ? primaryButton : kind === "secondary" ? secondaryButton : "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 font-semibold text-[#4A4F63] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "text-[15px]",
    )}
  >
    {children}
  </button>
);
