// Two whiteboards that open instantly, with no network: an illustrative,
// made-up retailer that shows the format, and a real company's riff saved
// from the live function (its sources are real pages).
import type { RiffResult } from "./model";

/** A made-up online tools retailer that sells to contractors. */
export const BLOB_DEPOT: RiffResult = {
  "example": true,
  "riff": {
    "company": "Blob Depot",
    "headline": "Turn the pro contractor portal into a paid Pro tier: spend by job, reorder history and project cost, powered by Omni.",
    "confidence": "low",
    "grounding": "illustrative",
    "embedded_fit": {
      "verdict": "strong",
      "why": "Contractors already buy by job. Spend, reorder and project-cost views are what a pro portal sells."
    },
    "situation": [
      {
        "claim": "Online tools retailer selling to contractors.",
        "basis": "known",
        "sources": []
      },
      {
        "claim": "Pros reorder per job site, so order history is the data asset.",
        "basis": "inferred",
        "sources": []
      },
      {
        "claim": "Size not public; treated here as a mid-market retailer.",
        "basis": "inferred",
        "sources": []
      }
    ],
    "embedded_opportunity": [
      {
        "surface": "Pro portal home",
        "end_customer_sees": "Spend by job and by crew this month, against the job budget.",
        "metrics": [
          "Spend by job",
          "Budget used",
          "Top SKUs"
        ]
      },
      {
        "surface": "Reorder center",
        "end_customer_sees": "What each crew reorders every month and what is running low.",
        "metrics": [
          "Reorder cadence",
          "Days since last order",
          "Running low"
        ]
      },
      {
        "surface": "Project closeout",
        "end_customer_sees": "Total materials cost per project, ready to attach to the client invoice.",
        "metrics": [
          "Project cost",
          "Cost per job type",
          "Returns"
        ]
      }
    ],
    "integration": {
      "stack": [],
      "incumbent": null,
      "omni_fit": "One semantic model for orders and spend, permissions per contractor account, and a white-labeled portal."
    },
    "gtm": {
      "pricing_shape": "platform_plus_per_customer",
      "monetization": [
        "A paid Pro tier with the dashboards",
        "A free spend summary as the upsell path"
      ],
      "assumptions": {
        "end_customers": [
          2000,
          8000
        ],
        "premium_adoption_pct": [
          10,
          25
        ],
        "premium_price_per_customer_month": [
          29,
          79
        ],
        "seats_per_customer": [
          2,
          5
        ],
        "omni_platform_fee_year": [
          25000,
          60000
        ],
        "omni_per_customer_year": [
          60,
          240
        ],
        "omni_per_seat_year": [
          60,
          180
        ]
      },
      "notes": {
        "end_customers": "Active contractor accounts. Placeholder: edit it.",
        "premium_adoption_pct": "Share of accounts that pay for Pro.",
        "premium_price_per_customer_month": "Below one saved hour of a crew lead's time.",
        "seats_per_customer": "Owner, office manager and crew leads.",
        "omni_platform_fee_year": "Placeholder, not Omni's price list. Edit it.",
        "omni_per_customer_year": "Placeholder, not Omni's price list. Edit it.",
        "omni_per_seat_year": "Placeholder, not Omni's price list. Edit it."
      }
    },
    "swot": {
      "strengths": [
        "Orders are already tied to an account and a job",
        "Pros buy every week, so dashboards stay fresh"
      ],
      "weaknesses": [
        "Job tags at checkout may be sparse",
        "A small data team to own a model"
      ],
      "opportunities": [
        "A Pro tier lifts retention against big-box pro programs",
        "Project-cost exports for client billing"
      ],
      "threats": [
        "Big-box pro programs bundle reporting for free",
        "Contractors may not pay for views alone"
      ]
    },
    "internal_play": "Merchandising could run margin by SKU and job type on the same model.",
    "next_move": {
      "who": "VP of Product or the head of the pro program",
      "first_question": "When a contractor asks what a job cost in materials, how do they get that answer today?"
    }
  },
  "sources": []
};

/** Dreamship (dreamship.com), saved from the live function. */
export const DREAMSHIP: RiffResult = {
  "riff": {
    "company": "Dreamship",
    "headline": "Give Dreamship's print-on-demand sellers branded, tiered analytics on orders, production and store performance instead of static reports.",
    "confidence": "low",
    "grounding": "sources",
    "embedded_fit": {
      "verdict": "possible",
      "why": "Dreamship already gates data reports by tier, so replacing basic exports with an embedded Omni layer fits its existing pricing logic."
    },
    "situation": [
      {
        "claim": "Dreamship is an enterprise print-on-demand provider with global supply and production partners.",
        "basis": "known",
        "sources": [
          1
        ]
      },
      {
        "claim": "It employs about 26 people, a small team for building analytics in house.",
        "basis": "known",
        "sources": [
          1
        ]
      },
      {
        "claim": "Its tiers already differentiate by data reports: Basic, Plus, and Full data reporting.",
        "basis": "known",
        "sources": [
          2
        ]
      },
      {
        "claim": "Its current stack lists Tableau, suggesting reporting today is internal or manually built rather than embedded in the seller app.",
        "basis": "known",
        "sources": [
          1
        ]
      }
    ],
    "embedded_opportunity": [
      {
        "surface": "Dreamship seller dashboard, Orders section",
        "end_customer_sees": "Order status breakdowns, fulfillment timelines, and error/cancellation trends across connected stores.",
        "metrics": [
          "order volume",
          "cancellation rate",
          "fulfillment time",
          "error rate"
        ]
      },
      {
        "surface": "Store performance reports (replacing 'Standard/Plus/Full data reports' tiers)",
        "end_customer_sees": "Per-store sales, margin, and reorder trends across Shopify, Etsy, Amazon, Walmart, etc.",
        "metrics": [
          "revenue per store",
          "margin",
          "reorder rate",
          "top products"
        ]
      },
      {
        "surface": "Account manager / Enterprise tier insights panel",
        "end_customer_sees": "Production facility performance and shipping time benchmarks tied to their own SKUs.",
        "metrics": [
          "production time",
          "shipping time",
          "facility performance",
          "defect rate"
        ]
      }
    ],
    "integration": {
      "stack": [
        {
          "tool": "Tableau",
          "status": "Inferred",
          "sources": [
            1
          ]
        }
      ],
      "incumbent": {
        "name": "Tableau",
        "status": "Inferred",
        "sources": [
          1
        ]
      },
      "omni_fit": "Omni's governed semantic model lets Dreamship define order and production metrics once and expose white-labeled, per-store permissioned views across tiers."
    },
    "gtm": {
      "pricing_shape": "platform_plus_per_customer",
      "monetization": [
        "Paid analytics tier upsell replacing current 'Full data reports' Enterprise feature",
        "Usage-based add-on for advanced reporting on Basic/Plus plans"
      ],
      "assumptions": {
        "end_customers": [
          100,
          2000
        ],
        "premium_adoption_pct": [
          5,
          15
        ],
        "premium_price_per_customer_month": [
          20,
          75
        ],
        "seats_per_customer": [
          1,
          20
        ],
        "omni_platform_fee_year": [
          25000,
          60000
        ],
        "omni_per_customer_year": [
          60,
          240
        ],
        "omni_per_seat_year": [
          60,
          180
        ]
      },
      "notes": {
        "end_customers": "placeholder, no customer count disclosed; Dreamship is small (26 employees) so seller base is likely modest",
        "premium_adoption_pct": "placeholder, typical embedded analytics upsell adoption for SMB tools",
        "premium_price_per_customer_month": "placeholder, in line with small POD seller willingness to pay for reporting add-ons",
        "seats_per_customer": "from staff account limits in pricing tiers: 5, 20, unlimited",
        "omni_platform_fee_year": "Placeholder, not Omni's price list. Edit it.",
        "omni_per_customer_year": "Placeholder, not Omni's price list. Edit it.",
        "omni_per_seat_year": "Placeholder, not Omni's price list. Edit it."
      }
    },
    "swot": {
      "strengths": [
        "Existing tiered data-report feature gives a natural upsell slot for embedded analytics.",
        "Multi-channel order data (Shopify, Etsy, Amazon, etc.) is a rich base for per-store metrics."
      ],
      "weaknesses": [
        "Very small team (26 people) may lack bandwidth to own a new analytics build.",
        "Currently reliant on Tableau, suggesting reporting is internal, not customer-facing yet."
      ],
      "opportunities": [
        "Differentiate Enterprise tier with branded, self-serve analytics instead of generic exports.",
        "Use production and shipping metrics to prove value across its 30+ facility network."
      ],
      "threats": [
        "Low-margin POD market may limit willingness to pay extra for analytics.",
        "Competing POD platforms could bundle similar reporting without an added fee."
      ]
    },
    "internal_play": "Replace ad hoc Tableau reporting with Omni internally first, to prove the semantic model before offering it to sellers.",
    "next_move": {
      "who": "VP of Product",
      "first_question": "Which tier upgrades most often cite data reports as the reason, and what do sellers wish those reports showed?"
    }
  },
  "sources": [
    {
      "id": 1,
      "title": "Dreamship: company profile",
      "url": "https://dreamship.com/",
      "kind": "company",
      "snippet": "Dreamship is a Software Development company. Dreamship is an enterprise print-on-demand solutions provider that offers a global reach, local presence, and shipping capabilities. They bring products closer to customers and have a global reac"
    },
    {
      "id": 2,
      "title": "Print on Demand Pricing and Plans - Dreamship",
      "url": "https://dreamship.com/pricing",
      "kind": "site",
      "snippet": "Spreadsheet upload & ... - Everything in Basic - Up to 30% off product prices - Priority customer support - Standard data reports - Connect 12 stores - 20 staff accounts - Access to Dreamship's exclusive partner program ... - Everything in "
    },
    {
      "id": 3,
      "title": "Manage orders with Dreamship orders filters",
      "url": "https://help.dreamship.com/manage-orders-with-dreamship-orders-filters",
      "kind": "site",
      "snippet": "To help Dreamship's sellers manage and track orders more easily, Dreamship app has been updated with the Filter feature in the Order category. This will help you quickly find orders with the wrong address, design errors, etc. and process th"
    }
  ],
  "savedAt": "2026-10-08T12:38:00Z",
  "domain": "dreamship.com"
};

export const EXAMPLES: { id: string; label: string; note: string; result: RiffResult }[] = [
  { id: "blob-depot", label: "Blob Depot", note: "Illustrative example", result: BLOB_DEPOT },
  { id: "dreamship", label: "Dreamship", note: "Saved riff", result: DREAMSHIP },
];
