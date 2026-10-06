import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { LENS_IDS, criticFor, distillLabel, featureTitle, getLens, LENSES, sectionLabel } from "@/lib/lenses";
import { getSeller } from "@/lib/sellers";
import { PlanCard, StackTable, type AccountBrief } from "@/components/account/AccountViews";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

describe("lens files stay in sync", () => {
  it("frontend and edge functions list the same lens ids", () => {
    const backend = read("supabase/functions/_shared/lens.ts").match(/LENS_IDS: Lens\[\] = \[([^\]]+)\]/)?.[1] ?? "";
    const types = read("supabase/functions/_shared/types.ts").match(/export type Lens =([^;]+);/)?.[1] ?? "";
    const ids = (s: string) => [...s.matchAll(/"([a-z]+)"/g)].map((m) => m[1]).sort();
    expect(ids(backend)).toEqual([...LENS_IDS].sort());
    expect(ids(types)).toEqual([...LENS_IDS].sort());
  });

  it("the account lens is unlisted but fully labeled", () => {
    expect(LENSES.map((l) => l.id)).not.toContain("account");
    expect(getLens("account").label).toBe("Target account");
    expect(sectionLabel("account", "core_features", "x")).toBe("Stack signals");
    expect(sectionLabel("account", "revenue_model", "x")).toBe("Why now");
    expect(criticFor("account", "champion")).toEqual({ name: "Head of Data", tagline: "Why I'd take the meeting" });
    expect(criticFor("account", "skeptic")?.name).toBe("CFO");
    expect(distillLabel("account", "one_revenue", "x")).toBe("The one question to open with");
  });

  it("seller ids match the edge function profiles", () => {
    const backend = read("supabase/functions/_shared/sellers/index.ts").match(/const SELLERS[^{]*\{([^}]+)\}/)?.[1] ?? "";
    expect(backend).toContain("omni");
    expect(getSeller("omni")?.footer).toBe("Unofficial. Built from public sources. Not affiliated with Omni.");
    expect(getSeller("toString")).toBeUndefined();
    expect(getSeller("acme")).toBeUndefined();
  });
});

const research = {
  provider: "firecrawl",
  fetched_at: "2026-10-06T00:00:00Z",
  sources: [
    { id: 1, title: "Data Engineer at Acme Outfitters", url: "https://example.com/job", snippet: "Snowflake and dbt", kind: "jobs" },
    { id: 2, title: "Acme Outfitters names a new CFO", url: "https://example.com/news", snippet: "", kind: "news", date: "2026-03-02" },
  ],
};

const brief: AccountBrief = {
  lens: "account",
  seller: "omni",
  research,
  core_features: [
    { name: "Warehouse", tool: "Snowflake", status: "Confirmed", sources: [1], description: "", evidence: "We use Snowflake and dbt" },
    { name: "BI tools", tool: "Tableau", status: "Inferred", sources: [], description: "Common in retail." },
    { name: "AI", tool: "", status: "Not found", sources: [], description: "" },
  ],
  fit: { grade: "B", reason: "No trigger yet." },
  customer_list: { on_list: false, sentence: "Acme Outfitters is not on Omni's public customer list." },
};

const plan = `FIRST-CALL PLAN: Acme Outfitters

ACCOUNT IN ONE LINE
Outdoor retailer hiring data engineers [1].

STACK READ
- Warehouse: Snowflake (Confirmed [1])
- BI tools: Tableau (Inferred). Common in retail.
- AI: Not found

WHY NOW
2026-03: New CFO announced [2]

SEVEN DISCOVERY QUESTIONS
1. Who owns the Tableau estate today?

FIT GRADE: B
No trigger yet.

CUSTOMER LIST
Acme Outfitters is not on Omni's public customer list.`;

describe("account views", () => {
  it("renders the plan with tags, linked citations and the customer-list badge", () => {
    render(<PlanCard company="Acme Outfitters" plan={plan} brief={brief} sellerName="Omni" />);
    expect(screen.getByRole("heading", { name: "Acme Outfitters" })).toBeInTheDocument();
    expect(screen.getByText("Not on Omni's public customer list")).toBeInTheDocument();
    expect(screen.getAllByText("Confirmed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inferred").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not found").length).toBeGreaterThan(0);
    // "2026-03: …" is content, not a heading.
    expect(screen.queryByRole("heading", { name: /2026-03/ })).toBeNull();
    const links = screen.getAllByRole("link", { name: "1" });
    expect(links[0]).toHaveAttribute("href", "https://example.com/job");
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute("href", "https://example.com/news");
    expect(document.body.textContent).not.toMatch(/not a customer/i);
  });

  it("shows evidence for Confirmed lines in the stack table", () => {
    render(<StackTable lines={brief.core_features} research={research} />);
    expect(screen.getByText("We use Snowflake and dbt")).toBeInTheDocument();
    expect(screen.getByText("Common in retail.")).toBeInTheDocument();
  });

  it("titles stack lines for the shell views", () => {
    expect(featureTitle({ name: "Warehouse", tool: "Snowflake", status: "Confirmed", description: "" })).toBe("Warehouse: Snowflake (Confirmed)");
    expect(featureTitle({ name: "AI", tool: "", status: "Not found", description: "" })).toBe("AI: Not found");
    expect(featureTitle({ name: "Onboarding", description: "x" })).toBe("Onboarding");
  });
});
