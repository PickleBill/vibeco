import { useState } from "react";
import { cx } from "../style";
import { initialsOf, logoUrl, PLACEHOLDER_WIDTH } from "./model";

export type LogoSize = 20 | 28 | 40;

const BOX: Record<LogoSize, string> = {
  20: "h-5 w-5 p-[2px]",
  28: "h-7 w-7 p-[3px]",
  40: "h-10 w-10 p-[5px]",
};
const INITIALS: Record<LogoSize, string> = { 20: "text-[10px]", 28: "text-[11px]", 40: "text-sm" };

/**
 * The company's icon in a small white tile, from its domain. With no domain,
 * or when the icon doesn't load (or the service sends its placeholder
 * globe), a muted initials tile instead; the initials also hold the tile
 * while the icon loads, so it's never empty or a broken image. Decorative:
 * the name always sits beside it.
 */
export function CompanyLogo({ domain, name, size = 20, className }: { domain?: string; name: string; size?: LogoSize; className?: string }) {
  // Keyed to the domain, so a new domain gets a fresh try.
  const [state, setState] = useState<{ domain: string; ok: boolean } | null>(null);
  const settled = state?.domain === domain ? state : null;
  const tile = cx("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-[#D9D4C7]", BOX[size], className);
  const initials = initialsOf(name, size === 20 ? 1 : 2);
  // Drawn as generated content, so the initials never join the name's text.
  const letters = cx("font-mono font-semibold leading-none text-muted-foreground before:content-[attr(data-initials)]", INITIALS[size]);
  if (!domain || settled?.ok === false) {
    return <span aria-hidden data-logo="initials" data-initials={initials} className={cx(tile, "bg-muted", letters)} />;
  }
  return (
    <span data-logo="icon" className={cx(tile, settled ? "bg-white" : "bg-muted")}>
      {!settled && <span aria-hidden data-initials={initials} className={cx("absolute inset-0 flex items-center justify-center", letters)} />}
      <img
        src={logoUrl(domain)}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cx("relative h-full w-full object-contain", !settled && "opacity-0")}
        onError={() => setState({ domain, ok: false })}
        onLoad={(e) => setState({ domain, ok: e.currentTarget.naturalWidth > PLACEHOLDER_WIDTH })}
      />
    </span>
  );
}
