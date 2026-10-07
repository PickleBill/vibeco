// Class helpers and evidence-age rules shared by the command-center views.

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ─── Evidence age: source chips fade with a 120-day half-life ───

export type Freshness = "fresh" | "aging" | "stale" | "undated";

/** Half-life 120 days: fresh under ~50 days, stale past ~160. */
export function freshness(days: number | null | undefined): Freshness {
  if (days == null) return "undated";
  const f = Math.pow(0.5, days / 120);
  return f >= 0.75 ? "fresh" : f >= 0.4 ? "aging" : "stale";
}

export function ageText(days: number | null | undefined): string {
  if (days == null) return "n/d";
  if (days === 0) return "today";
  if (days < 60) return `${days}d`;
  return `${Math.round(days / 30)}mo`;
}

// ─── Buttons ───

/** Pink fill, navy text (5.9:1); the one primary action in a view. */
export const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary bg-brand px-4 font-bold text-brand-foreground transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50";

export const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-foreground bg-white px-4 font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50";
