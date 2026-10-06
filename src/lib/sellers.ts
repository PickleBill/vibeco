/**
 * Seller pages for the target-account lens (/for/:seller): UI words only.
 * The facts the AI uses (what the seller sells, its public customer list)
 * live in supabase/functions/_shared/sellers/. No seller logos or brand colors.
 */
export interface SavedRun {
  company: string;
  /** idea_reports id, opened at /report/:id. */
  reportId: string;
}

export interface SellerConfig {
  id: string;
  name: string;
  headline: string;
  intro: string;
  /** One-click example companies. */
  examples: string[];
  /** Finished runs linked from the page. */
  savedRuns: SavedRun[];
  footer: string;
}

const SELLERS: Record<string, SellerConfig> = {
  omni: {
    id: "omni",
    name: "Omni",
    headline: "Know the account before the first call.",
    intro:
      "Type a company. VibeCo searches the web for its data stack, data hiring and the last 12 months of news, then writes a first-call plan for an Omni seller. Every stack line is tagged Confirmed, Inferred or Not found, and every claim links to its source.",
    examples: ["Guitar Center", "Warby Parker", "Chime"],
    savedRuns: [],
    footer: "Unofficial. Built from public sources. Not affiliated with Omni.",
  },
};

export function getSeller(id: string | null | undefined): SellerConfig | undefined {
  return id && Object.prototype.hasOwnProperty.call(SELLERS, id) ? SELLERS[id] : undefined;
}
