/**
 * Seller pages for the target-account lens (/for/:seller): UI words, the
 * territory of saved runs, and a theme. The facts the AI uses (what the seller
 * sells, its public customer list) live in supabase/functions/_shared/sellers/.
 * No seller logos or wordmarks; a theme is an accent color, never a brand kit.
 */
export interface SavedRun {
  company: string;
  /** idea_reports id, opened at /report/:id. */
  reportId: string;
}

/** One account in the territory: its latest saved run, and the one before it when there is one. */
export interface TerritoryAccount extends SavedRun {
  /** An earlier run of the same account; the radar diffs the two. */
  previousReportId?: string;
}

export interface Territory {
  /** "Southeast" */
  name: string;
  accounts: TerritoryAccount[];
}

/** A company on the seller's public customer list, used to find lookalikes. */
export interface CustomerSeed {
  name: string;
  /** Where the list names it. */
  source: string;
  /** A saved run of the customer itself, when there is one. */
  reportId?: string;
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
  /** Every account run for this seller, for the territory views. */
  territory?: Territory;
  /** Customers to start a lookalike search from. */
  seeds?: CustomerSeed[];
  /** Accent theme class for the seller's pages (see .theme-omni in index.css). */
  theme?: string;
  footer: string;
}

const SELLERS: Record<string, SellerConfig> = {
  omni: {
    id: "omni",
    name: "Omni",
    headline: "Know the account before the first call.",
    intro:
      "Type a company. VibeCo reads its own job posts and product pages, searches the web for its data stack and the last 12 months of news, then writes a first-call plan for an Omni seller: internal or embedded motion, with every claim linked to its source.",
    examples: ["Guitar Center", "Chime", "Ramp"],
    savedRuns: [
      { company: "Relay (relaypro.com)", reportId: "9c769b0b-8282-4c6d-91d7-c59b1bae8ca5" },
      { company: "AvidXchange (avidxchange.com)", reportId: "cf425cad-5b53-4401-b4e2-3bbf1bd4d9ef" },
      { company: "Bandwidth (bandwidth.com)", reportId: "0a08bed8-e339-45cc-8f60-4e9df60764f3" },
    ],
    territory: {
      name: "Southeast",
      accounts: [
        { company: "Relay (relaypro.com)", reportId: "9c769b0b-8282-4c6d-91d7-c59b1bae8ca5" },
        { company: "AvidXchange (avidxchange.com)", reportId: "cf425cad-5b53-4401-b4e2-3bbf1bd4d9ef" },
        { company: "Bandwidth (bandwidth.com)", reportId: "0a08bed8-e339-45cc-8f60-4e9df60764f3" },
      ],
    },
    seeds: [{ name: "Guitar Center", source: "https://omni.co/blog/case-study-guitar-center" }],
    theme: "theme-omni",
    footer: "Unofficial. Built from public sources. Not affiliated with Omni.",
  },
};

export function getSeller(id: string | null | undefined): SellerConfig | undefined {
  return id && Object.prototype.hasOwnProperty.call(SELLERS, id) ? SELLERS[id] : undefined;
}
