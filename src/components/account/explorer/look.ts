// Class strings the account views share, on the command center's scale:
// 8px buttons, 12px cards, 6px field pills, hairline borders, mono eyebrows.
import { cx, primaryButton, secondaryButton } from "@/components/territory/style";

// rounded-lg follows --radius (12px under a seller theme); buttons sit at 8px.
export const primaryBtn = primaryButton.replace("rounded-lg", "rounded-[8px]");
export const secondaryBtn = secondaryButton.replace("rounded-lg", "rounded-[8px]");

/** A text button that reads as a link: readable pink, 44px tall. */
export const linkBtn =
  "inline-flex min-h-11 items-center gap-1.5 rounded-[8px] text-[15px] font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** A white sheet on the canvas. */
export const card = "rounded-xl border border-border bg-card";

/** Mono label over a block (smaller than an Eyebrow, for inside a card). */
export const label = "font-mono text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground";

/** Section title inside the account views. */
export const title = "font-display text-xl font-semibold tracking-[-0.01em] text-foreground sm:text-[22px]";

/** Pill toggle: selected is tinted with a readable-pink ring, the rest hairline. */
export const toggle = (on: boolean) =>
  cx(
    "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[15px] text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    on ? "border-2 border-primary bg-brand-tint font-bold" : "border border-[#9097A6] bg-card font-medium hover:border-foreground",
  );
