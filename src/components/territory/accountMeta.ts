import type { TerritoryRow } from "./model";

/** "Both · Fit A": the muted line under an account's name in a saved card or the account picker. */
export const accountMeta = (r: Pick<TerritoryRow, "motion" | "fit">) => [r.motion, r.fit?.trim() ? `Fit ${r.fit.trim()}` : ""].filter(Boolean).join(" · ");
