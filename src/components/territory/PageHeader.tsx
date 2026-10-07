import type { ReactNode } from "react";
import { Eyebrow } from "./ui";

/**
 * The top of every view, at one size and rhythm: an eyebrow naming the view,
 * the headline (balanced, so no word sits alone on the last line) and one
 * plain line about what the view does.
 */
export function PageHeader({ eyebrow, title, children, className }: { eyebrow: ReactNode; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Eyebrow className="[text-wrap:balance]">{eyebrow}</Eyebrow>
      <h1 className="mt-2 font-display text-[2.1rem] font-bold leading-[1.08] tracking-[-0.02em] text-foreground [text-wrap:balance] sm:text-[2.75rem]">{title}</h1>
      {children && <p className="mt-3 max-w-[720px] text-base leading-relaxed text-[#4A4F63] [text-wrap:pretty] sm:text-[17px]">{children}</p>}
    </div>
  );
}
