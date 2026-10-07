// Memos: text that opens on a tap, so a view's first glance stays short (a
// title, a line) and the detail is one tap away. Nothing is cut: open, the
// full text is there. Height and opacity ease open and shut; under reduced
// motion they switch at once.
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cx } from "./style";

const EASE = [0.22, 1, 0.36, 1] as const;
const DURATION = 0.28;

/** Where a memo marked `defaultOpen="wide"` starts open. */
const WIDE = "(min-width: 1024px)";

function isWide() {
  try {
    return typeof window !== "undefined" && !!window.matchMedia?.(WIDE).matches;
  } catch {
    return false;
  }
}

/** Open state and an id for the region it controls. "wide": open from 1024px, folded on phones. */
function useOpen(initial: boolean | "wide" = false) {
  const [open, setOpen] = useState(() => (initial === "wide" ? isWide() : initial));
  const id = `fold-${useId().replace(/:/g, "")}`;
  return { open, setOpen, id };
}

/** A text button that reads as a link, with a chevron that turns as it opens; 44px tall. */
const MORE =
  "inline-flex min-h-11 items-center gap-1 rounded-[8px] text-[15px] font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const Chevron = ({ open, size = 16, className }: { open: boolean; size?: number; className?: string }) => (
  <ChevronDown size={size} aria-hidden className={cx("shrink-0 transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180", className)} />
);

/**
 * The region under a toggle: it fans out (height and opacity) when `open`,
 * and is gone from the page when shut. The `id` stays put for aria-controls.
 */
export function Fold({ open, id, children, className }: { open: boolean; id: string; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div id={id} className={className}>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="fold"
            data-fold=""
            initial={reduce ? false : { height: 0, opacity: 0, overflow: "hidden" }}
            animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0, overflow: "hidden" }}
            transition={{ duration: DURATION, ease: EASE }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "Show 3 more ⌄": the toggle for a Fold somewhere nearby. */
export function FoldButton({ open, controls, onClick, children, className }: { open: boolean; controls: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" aria-expanded={open} aria-controls={controls} onClick={onClick} className={cx(MORE, className)}>
      {children}
      <Chevron open={open} />
    </button>
  );
}

/** A fold with its own toggle under the part that always shows. */
export function MoreFold({ children, more, less = "Show less", className, buttonClassName }: { children: ReactNode; more: ReactNode; less?: ReactNode; className?: string; buttonClassName?: string }) {
  const { open, setOpen, id } = useOpen();
  return (
    <>
      <Fold open={open} id={id} className={className}>
        {children}
      </Fold>
      <FoldButton open={open} controls={id} onClick={() => setOpen((v) => !v)} className={buttonClassName}>
        {open ? less : more}
      </FoldButton>
    </>
  );
}

/**
 * A titled memo: a white sheet whose header is one button (title, a count in
 * mono, a chevron), a line or two of preview while it's shut, and the full
 * text when it fans out.
 */
export function Memo({
  title,
  count,
  eyebrow,
  preview,
  children,
  defaultOpen = false,
  level = 2,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  /** After the title in mono: "13 dated sources". */
  count?: ReactNode;
  /** Mono label over the title. */
  eyebrow?: ReactNode;
  /** One or two lines under the title while it's shut. */
  preview?: ReactNode;
  children: ReactNode;
  /** "wide": open from 1024px, shut on phones. */
  defaultOpen?: boolean | "wide";
  level?: 2 | 3 | 4;
  className?: string;
  bodyClassName?: string;
}) {
  const { open, setOpen, id } = useOpen(defaultOpen);
  const reduce = useReducedMotion();
  const Heading = `h${level}` as "h2" | "h3" | "h4";
  const toggle = () => setOpen((v) => !v);
  return (
    <section aria-labelledby={`${id}-title`} className={cx("rounded-xl border border-border bg-white", className)}>
      <Heading id={`${id}-title`} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={toggle}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
        >
          <span className="min-w-0 flex-1">
            {eyebrow && <span className="mb-0.5 block font-mono text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">{eyebrow}</span>}
            <span className="font-display text-lg font-semibold leading-snug tracking-[-0.01em] text-foreground sm:text-xl">{title}</span>
            {count != null && (
              <span className="mt-0.5 block font-mono text-[13px] font-medium text-muted-foreground">
                <span className="sr-only">· </span>
                {count}
              </span>
            )}
          </span>
          <Chevron open={open} size={18} className="text-foreground" />
        </button>
      </Heading>
      <AnimatePresence initial={false}>
        {preview && !open && (
          // A tap on the preview opens the memo too; the header button is the keyboard way in.
          <motion.p
            key="preview"
            onClick={toggle}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
            transition={{ duration: DURATION, ease: EASE }}
            className="-mt-1.5 cursor-pointer overflow-hidden"
          >
            <span className="block px-4 pb-3.5 sm:px-5">
              <span className="line-clamp-2 text-[15px] leading-snug text-[#4A4F63]">{preview}</span>
            </span>
          </motion.p>
        )}
      </AnimatePresence>
      <Fold open={open} id={id}>
        <div className={cx("px-4 pb-4 sm:px-5 sm:pb-5", bodyClassName)}>{children}</div>
      </Fold>
    </section>
  );
}

const CLAMP = { 1: "line-clamp-1", 2: "line-clamp-2", 3: "line-clamp-3", 4: "line-clamp-4" } as const;

/**
 * The lighter memo inside a card: text clamped to a few lines with "Read
 * more" under it, and `more` (optional) folded below. The button shows only
 * when there's something to open: text past the clamp, or `more`.
 */
export function ReadMore({
  children,
  more,
  lines = 2,
  className,
  label = "Read more",
  buttonClassName,
  aside,
}: {
  children: ReactNode;
  /** Shown under the text once it's open. */
  more?: ReactNode;
  /** Beside the button and always shown (source chips). */
  aside?: ReactNode;
  lines?: keyof typeof CLAMP;
  /** Text styles for the clamped block. */
  className?: string;
  label?: ReactNode;
  buttonClassName?: string;
}) {
  const { open, setOpen, id } = useOpen();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // The clamped height once laid out, and whether the text fits in it.
  const [box, setBox] = useState<{ h: number; fits: boolean } | null>(null);
  // The clamp comes off as the text opens and goes back once it has shut.
  const [clamped, setClamped] = useState(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !clamped) return;
    const check = () => setBox(el.clientHeight > 0 ? { h: el.clientHeight, fits: el.scrollHeight <= el.clientHeight + 1 } : null);
    check();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [clamped]);

  const toggle = () => {
    if (!open) setClamped(false);
    // Unmeasured (or no motion): nothing to animate, so clamp straight away.
    else if (!box || box.fits || reduce) setClamped(true);
    setOpen(!open);
  };
  const animated = !!box && !box.fits;
  const showButton = !!more || !box || !box.fits;

  return (
    <div>
      <motion.div
        initial={false}
        animate={open || !animated ? { height: "auto", transitionEnd: { overflow: "visible" } } : { height: box!.h, overflow: "hidden" }}
        transition={{ duration: reduce ? 0 : DURATION, ease: EASE }}
        onAnimationComplete={() => {
          if (!open) setClamped(true);
        }}
      >
        <div ref={ref} id={`${id}-text`} className={cx(className, clamped && CLAMP[lines])}>
          {children}
        </div>
      </motion.div>
      {more && <Fold open={open} id={id}>{more}</Fold>}
      {(showButton || aside) && (
        <div className="flex flex-wrap items-center gap-x-3">
          {aside}
          {showButton && (
            <FoldButton open={open} controls={more ? `${id}-text ${id}` : `${id}-text`} onClick={toggle} className={buttonClassName}>
              {open ? "Show less" : label}
            </FoldButton>
          )}
        </div>
      )}
    </div>
  );
}
