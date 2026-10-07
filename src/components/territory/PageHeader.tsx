import type { ReactNode } from "react";
import { cx } from "./style";
import { Eyebrow } from "./ui";

const HEADLINE = "font-display text-[2.1rem] font-bold leading-[1.08] tracking-[-0.02em] text-foreground [text-wrap:balance] sm:text-[2.75rem]";

/**
 * The top of every view, at one size and rhythm: an eyebrow naming the view,
 * the headline (balanced, so no word sits alone on the last line) and one
 * plain line about what the view does. A view about one account can put its
 * logo before the headline.
 */
export function PageHeader({ eyebrow, title, logo, children, className }: { eyebrow: ReactNode; title: ReactNode; logo?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Eyebrow className="[text-wrap:balance]">{eyebrow}</Eyebrow>
      {logo ? (
        <div className="mt-2 flex items-start gap-3">
          {/* Level with the first line of the headline. */}
          <span className="flex shrink-0 sm:mt-1">{logo}</span>
          <h1 className={cx("min-w-0", HEADLINE)}>{title}</h1>
        </div>
      ) : (
        <h1 className={cx("mt-2", HEADLINE)}>{title}</h1>
      )}
      {children && <p className="mt-3 max-w-[720px] text-base leading-relaxed text-[#4A4F63] [text-wrap:pretty] sm:text-[17px]">{children}</p>}
    </div>
  );
}
