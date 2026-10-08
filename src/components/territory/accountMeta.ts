import type { TerritoryRow } from "./model";

/** "Both · Fit A": the muted line beside an account's name in the account picker. */
export const accountMeta = (r: Pick<TerritoryRow, "motion" | "fit">) => [r.motion, r.fit?.trim() ? `Fit ${r.fit.trim()}` : ""].filter(Boolean).join(" · ");

/** "Fit A": the line under a saved card's name on the front door. */
export const fitMeta = (r: Pick<TerritoryRow, "fit">) => (r.fit?.trim() ? `Fit ${r.fit.trim()}` : "");
