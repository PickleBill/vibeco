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

/** How a territory splits its accounts by size. */
export type Segment = "Strategic" | "Enterprise";

/** One account in the territory: its latest saved run, and the one before it when there is one. */
export interface TerritoryAccount extends SavedRun {
  /** An earlier run of the same account; the radar diffs the two. */
  previousReportId?: string;
  /** Which segment the account belongs to (by employee count). */
  segment?: Segment;
}

export interface TerritorySegment {
  id: Segment;
  /** "Strategic" */
  label: string;
  /** "5,000+ employees" */
  note: string;
}

export interface Territory {
  /** "Southeast" */
  name: string;
  /** The segments, largest accounts first; the radar filters by them. */
  segments?: TerritorySegment[];
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
      { company: "Equifax (equifax.com)", reportId: "e71ea1b4-c34b-4dc4-8124-428a16264a93" },
    ],
    territory: {
      name: "Southeast",
      segments: [
        { id: "Strategic", label: "Strategic", note: "5,000+ employees" },
        { id: "Enterprise", label: "Enterprise", note: "Under 5,000" },
      ],
      accounts: [
        { company: "Relay (relaypro.com)", reportId: "9c769b0b-8282-4c6d-91d7-c59b1bae8ca5", segment: "Enterprise" },
        { company: "AvidXchange (avidxchange.com)", reportId: "cf425cad-5b53-4401-b4e2-3bbf1bd4d9ef", segment: "Enterprise" },
        { company: "Bandwidth (bandwidth.com)", reportId: "0a08bed8-e339-45cc-8f60-4e9df60764f3", segment: "Enterprise" },
        { company: "Red Ventures (redventures.com)", reportId: "45fe7c89-fce0-450f-9a1c-ca91838cb64e", segment: "Enterprise" },
        { company: "LendingTree (lendingtree.com)", reportId: "1061f011-9edc-494d-806b-e3d8877d689d", segment: "Enterprise" },
        { company: "Perry Ellis International (perryellis.com)", reportId: "e7a4b6ea-d199-48bf-b8f8-9919cd6ec25e", segment: "Enterprise" },
        { company: "OneTrust (onetrust.com)", reportId: "ef273638-6aa0-4f11-9efa-b55a0eceb16a", segment: "Enterprise" },
        { company: "Kaseya (kaseya.com)", reportId: "1809479a-9c21-4633-9701-304064837aa2", segment: "Strategic" },
        { company: "CallRail (callrail.com)", reportId: "d837a7fb-87bb-4607-8bcb-21a5615518f5", segment: "Enterprise" },
        { company: "nCino (ncino.com)", reportId: "9539bd3c-295a-43ed-a351-a0d66be50205", segment: "Enterprise" },
        { company: "Calendly (calendly.com)", reportId: "11ea8bb1-954c-4338-92ac-7cdb328818d8", segment: "Enterprise" },
        { company: "Salesloft (salesloft.com)", reportId: "36b13077-1ff3-466e-9788-acab46433d33", segment: "Enterprise" },
        { company: "Fleetio (fleetio.com)", reportId: "af51c894-dfd0-4496-88fa-4480373ebeaa", segment: "Enterprise" },
        { company: "Agilysys (agilysys.com)", reportId: "faa8b6c5-c166-44ae-b224-8e5284980e2b", segment: "Enterprise" },
        { company: "Built (getbuilt.com)", reportId: "ea0c06b8-2817-463e-bc69-b07a305b4290", segment: "Enterprise" },
        { company: "M3 (m3as.com)", reportId: "3aeed73e-6f36-4153-8442-d686d475eaba", segment: "Enterprise" },
        { company: "Teamworks (teamworks.com)", reportId: "1c37a8c0-0942-46b8-96bb-bf3d9202e63d", segment: "Enterprise" },
        // Software companies that ship analytics to their own customers (the embedded motion).
        { company: "Cardlytics (cardlytics.com)", reportId: "be488ecd-bd75-48cb-b6a2-7326dfde6fdb", segment: "Enterprise" },
        { company: "ConnectWise (connectwise.com)", reportId: "215a23ef-66f4-4542-bd63-e875ffe2ef48", segment: "Enterprise" },
        { company: "Blackbaud (blackbaud.com)", reportId: "424e0e4a-d8dc-4079-a87f-28b097b42721", segment: "Enterprise" },
        { company: "Spreedly (spreedly.com)", reportId: "16abd51e-f0f5-40ae-8eff-7304cdaafcc3", segment: "Enterprise" },
        { company: "Daxko (daxko.com)", reportId: "82722926-9624-472d-ae70-00d53d391442", segment: "Enterprise" },
        { company: "KnowBe4 (knowbe4.com)", reportId: "21613a68-3578-4e4f-bc77-f5958208eb1f", segment: "Enterprise" },
        { company: "Greenway Health (greenwayhealth.com)", reportId: "9e39e1bd-c174-465d-99af-a442ac949421", segment: "Enterprise" },
        { company: "Florence Healthcare (florencehc.com)", reportId: "b360bf35-d1cd-49a3-b0f3-94483844d499", segment: "Enterprise" },
        { company: "Greenlight (greenlight.com)", reportId: "7ec6bf33-0899-436d-ba6d-432198322b16", segment: "Enterprise" },
        { company: "Equifax (equifax.com)", reportId: "e71ea1b4-c34b-4dc4-8124-428a16264a93", segment: "Strategic" },
        { company: "Labcorp (labcorp.com)", reportId: "1cdb80a1-5f0e-4a10-a1fb-60ca498d2fbd", segment: "Strategic" },
        { company: "The Home Depot (homedepot.com)", reportId: "749f739d-aff4-4dcb-894f-93fae967d567", segment: "Strategic" },
        { company: "Raymond James (raymondjames.com)", reportId: "0679f042-b5bc-40b2-8bf1-a13f9f7e5a38", segment: "Strategic" },
        { company: "Bank of America (bankofamerica.com)", reportId: "328c7236-879f-414f-a8da-6413a5352d60", segment: "Strategic" },
        { company: "CarMax (carmax.com)", reportId: "479418fe-f8f8-4f30-9c2f-61d69c579493", segment: "Strategic" },
        { company: "Truist (truist.com)", reportId: "e13065d7-2804-4067-ac6b-fccda0ca23e2", segment: "Strategic" },
        { company: "Chewy (chewy.com)", reportId: "1a952990-0c89-4c44-adb1-88156b7d7a0b", segment: "Strategic" },
        { company: "IQVIA (iqvia.com)", reportId: "47aad048-7e0c-474a-90f9-81d68dc25243", segment: "Strategic" },
        { company: "Advance Auto Parts (advanceautoparts.com)", reportId: "818442eb-e616-446f-87c2-69ee006ee027", segment: "Strategic" },
        { company: "Global Payments (globalpayments.com)", reportId: "917665cf-03c9-4ad5-b154-9043cd174fc2", segment: "Strategic" },
        { company: "FIS (fisglobal.com)", reportId: "a4cb99e7-6747-45ee-81de-9a269af0e91a", segment: "Strategic" },
        { company: "Cox Enterprises (coxenterprises.com)", reportId: "3eabb63b-e898-4bdd-bdf9-71cf20d9a079", segment: "Strategic" },
        { company: "TD SYNNEX (tdsynnex.com)", reportId: "51ee8688-34d2-4483-94f5-5b25d4a42ffb", segment: "Strategic" },
        { company: "Ryder (ryder.com)", reportId: "583228fc-0b6b-4818-bc03-4c27c5c0b9aa", segment: "Strategic" },
        { company: "Leidos (leidos.com)", reportId: "c385c21a-b0c1-4491-ae45-ef6f0ae0bcb9", segment: "Strategic" },
        { company: "Cvent (cvent.com)", reportId: "3d2376a3-5db4-47cf-a67d-6a96c11c3bd2", segment: "Strategic" },
        { company: "NCR Voyix (ncrvoyix.com)", reportId: "107da82a-2d19-4701-ad62-55a332f1df52", segment: "Strategic" },
        { company: "Inspire Brands (inspirebrands.com)", reportId: "2c7edfb4-5ee6-4f96-9a98-3578ea63880c", segment: "Strategic" },
        { company: "Lowe's (lowes.com)", reportId: "4125ba94-dabf-4b73-af32-dcdc0b14a9f2", segment: "Strategic" },
        { company: "Freddie Mac (freddiemac.com)", reportId: "dd82305e-a436-42cc-abe3-6d58290dccc6", segment: "Strategic" },
        { company: "The Coca-Cola Company (coca-colacompany.com)", reportId: "7ba7a12d-ad15-4891-876b-6d5f1fc8ebe8", segment: "Strategic" },
        { company: "Floor & Decor (flooranddecor.com)", reportId: "48f63de5-f91e-473c-af37-48bc62f32a2b", segment: "Strategic" },
        { company: "Pendo (pendo.io)", reportId: "1b3fedfa-bfff-4f42-87a1-cf8ee0b2a20d", segment: "Enterprise" },
        { company: "Red Hat (redhat.com)", reportId: "2e0d1460-ccec-4b8b-b361-6f6ea4e1bebe", segment: "Strategic" },
      ],
    },
    seeds: [{ name: "Guitar Center", source: "https://omni.co/blog/case-study-guitar-center", reportId: "a9aefb7a-f59f-4324-8d2f-f628d2aa05df" }],
    theme: "theme-omni",
    footer: "Unofficial. Built from public sources. Not affiliated with Omni.",
  },
};

export function getSeller(id: string | null | undefined): SellerConfig | undefined {
  return id && Object.prototype.hasOwnProperty.call(SELLERS, id) ? SELLERS[id] : undefined;
}
