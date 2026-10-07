import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { LENS_IDS, criticFor, distillLabel, featureTitle, getLens, LENSES, sectionLabel } from "@/lib/lenses";
import { getSeller } from "@/lib/sellers";
import { MotionPanel, PlanCard, ScanCard, StackTable, type AccountBrief, type MotionRead } from "@/components/account/AccountViews";

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

describe("job-board scan card", () => {
  it("separates plainly named tools from options and links the board", () => {
    render(
      <ScanCard
        company="Acme"
        scan={{
          found: true,
          ats: "greenhouse",
          board_url: "https://example.com/board",
          company_name: "Acme Outfitters",
          total_jobs: 48,
          scanned_jobs: 48,
          tools: [
            { tool: "Snowflake", category: "Warehouse", posts: 6, firm: 4 },
            { tool: "BigQuery", category: "Warehouse", posts: 2, firm: 0 },
          ],
          ms: 640,
        }}
      />,
    );
    expect(screen.getByText(/Job-board scan · Greenhouse/)).toBeInTheDocument();
    expect(screen.getByText("Snowflake")).toBeInTheDocument();
    expect(screen.getByText(/Only listed as options:/).parentElement?.textContent).toMatch(/BigQuery/);
    expect(screen.getByRole("link", { name: /Board/ })).toHaveAttribute("href", "https://example.com/board");
  });

  it("says so when there's no public board", () => {
    render(<ScanCard company="Guitar Center" scan={{ found: false, total_jobs: 0, scanned_jobs: 0, tools: [], ms: 120 }} />);
    expect(screen.getByText(/No public Greenhouse, Lever, Ashby or known Workday board found/)).toBeInTheDocument();
  });
});

const motion: MotionRead = {
  label: "Both",
  internal: {
    sources: [1],
    evidence: [{ source: 1, signal: "Snowflake", quote: "Warehouse: Snowflake" }],
    clock: "Ask when the Tableau contract renews [1]",
    buyer: "Head of Data [1]",
    question: "Who owns the Tableau renewal?",
  },
  embedded: {
    sources: [2],
    evidence: [{ source: 2, signal: "customer-facing dashboards", quote: "Build customer-facing dashboards in React." }],
    clock: "Ask when the next customer reporting release ships [2]",
    buyer: "CTO [2]",
    question: "Which customer dashboards are on the roadmap?",
  },
};

describe("motion", () => {
  it("shows the badge, each live motion's signal, clock and buyer, graded motion first", () => {
    render(<MotionPanel motion={motion} fit={{ grade: "A", motion: "Embedded" }} research={research} />);
    expect(screen.getByText("Both")).toBeInTheDocument();
    const names = screen.getAllByText(/^(Internal|Embedded)$/).map((n) => n.textContent);
    expect(names).toEqual(["Embedded", "Internal"]);
    expect(screen.getByText("Build customer-facing dashboards in React.")).toBeInTheDocument();
    expect(screen.getAllByText("Clock to test")).toHaveLength(2);
    expect(screen.getAllByText("Buyer to start with")).toHaveLength(2);
  });

  it("Unclear lists both motions to test, with nothing claimed", () => {
    const unclear: MotionRead = {
      label: "Unclear",
      internal: { ...motion.internal, sources: [], evidence: [], clock: "Usually a renewal with the current BI vendor, 6 to 9 months out.", buyer: "VP or Head of Data, or CTO" },
      embedded: { ...motion.embedded, sources: [], evidence: [], clock: "Usually a customer-facing launch date.", buyer: "CTO" },
    };
    render(<MotionPanel motion={unclear} research={research} />);
    expect(screen.getByText("Unclear")).toBeInTheDocument();
    expect(screen.getByText(/No source shows either motion yet/)).toBeInTheDocument();
    expect(screen.getAllByText("Nothing in the sources yet.")).toHaveLength(2);
  });

  it("the plan card draws the motion once, above the stack read, and names the graded motion", () => {
    const withMotion = `FIRST-CALL PLAN: Acme Outfitters

MOTION: Both
- Embedded: customer-facing dashboards [2]
  Clock to test: Ask when the next customer reporting release ships [2]
  Buyer to start with: CTO [2]

${plan.split("\n").slice(2).join("\n").replace("FIT GRADE: B", "FIT GRADE: A (Embedded motion)")}`;
    render(<PlanCard company="Acme Outfitters" plan={withMotion} brief={{ ...brief, motion, fit: { grade: "A", motion: "Embedded", reason: "x" } }} sellerName="Omni" />);
    expect(screen.queryByText(/^MOTION$/)).toBeNull();
    expect(screen.getAllByText("Both")).toHaveLength(1);
    expect(screen.getByText("Embedded motion")).toBeInTheDocument();
    const panel = screen.getByRole("region", { name: "Motion" });
    const stack = screen.getByText("STACK READ");
    expect(panel.compareDocumentPosition(stack) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
