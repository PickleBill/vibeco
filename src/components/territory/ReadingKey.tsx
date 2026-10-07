import { cx } from "./style";

/**
 * How to read the page, in one line per kind of mark: square tags describe,
 * rounded pills and buttons act, numbers open a source. The samples are
 * pictures of the marks, not controls.
 */
export function ReadingKey({ className }: { className?: string }) {
  return (
    <ul aria-label="How to read the page" className={cx("space-y-2 text-[15px] leading-snug text-[#4A4F63]", className)}>
      <li className="flex items-center gap-2.5">
        <span aria-hidden className="inline-flex h-6 w-14 shrink-0 items-center justify-center rounded-[4px] border border-[#D9D4C7] bg-white text-xs font-semibold text-foreground">
          Tag
        </span>
        Square tags describe. Not clickable.
      </li>
      <li className="flex items-center gap-2.5">
        <span aria-hidden className="inline-flex h-6 w-14 shrink-0 items-center justify-center rounded-full border border-[#9097A6] bg-white text-xs font-semibold text-foreground">
          Pill
        </span>
        Rounded pills and buttons do something.
      </li>
      <li className="flex items-center gap-2.5">
        <span aria-hidden className="inline-flex w-14 shrink-0 justify-center">
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-foreground bg-foreground px-1 font-mono text-xs font-semibold text-white">1</span>
        </span>
        Numbers open the source.
      </li>
    </ul>
  );
}
