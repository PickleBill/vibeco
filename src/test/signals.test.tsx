import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AccountBrief } from "@/components/account/AccountViews";
import { AccountHero } from "@/components/account/explorer/AccountHero";
import { clip, fitSignals, isDataRole, roleOf } from "@/components/account/explorer/signals";
import relay from "./fixtures/relay-run.json";

const relayBrief = relay.brief as unknown as AccountBrief;

// Equifax as its saved run has it: four Workday job posts, a confirmed stack, dated triggers.
const post = (id: number, title: string) => ({
  id,
  title: `${title} at Equifax (Workday job post)`,
  url: `https://equifax.wd5.myworkdayjobs.com/External/job/${id}`,
  snippet: "",
  kind: "jobs",
  via: "workday",
});
const equifax: AccountBrief = {
  lens: "account",
  fit: {
    grade: "A",
    motion: "Internal",
    reason: "Equifax has a complex multi-cloud stack (BigQuery, Snowflake, Databricks) and is actively hiring for dbt and GenAI roles [2, 3, 4].",
  },
  core_features: [
    { name: "Warehouse", description: "", tool: "BigQuery", status: "Confirmed", sources: [1, 2, 3] },
    { name: "Warehouse", description: "", tool: "Snowflake", status: "Confirmed", sources: [3] },
    { name: "Warehouse", description: "", tool: "Databricks", status: "Inferred", sources: [2] },
    { name: "Transformation", description: "", tool: "Airflow", status: "Confirmed", sources: [2] },
    { name: "BI tools", description: "", tool: "Tableau", status: "Confirmed", sources: [1] },
    { name: "BI tools", description: "", tool: "Power BI", status: "Confirmed", sources: [1] },
    { name: "BI tools", description: "", tool: "Looker", status: "Confirmed", sources: [1] },
    { name: "AI", description: "", tool: "Vertex AI", status: "Confirmed", sources: [4] },
    { name: "Embedded analytics", description: "", tool: "", status: "Not found", sources: [] },
  ],
  revenue_model:
    "2025-11: Acquired Vault Verify to enhance employment and income verification data [10].\n2026-07: Signed definitive agreement to acquire Círculo de Crédito in Mexico for $750M [6].\nDate not found: Expanding Snowflake Marketplace presence with identity data products [7].",
  research: {
    provider: "firecrawl",
    sources: [
      post(1, "Analytics Consultant"),
      post(2, "Data Engineer"),
      post(3, "Senior Director, Data Operations Center (DOC)"),
      post(4, "Generative AI Engineer / QA Engineer"),
      { id: 6, title: "Equifax Announces Definitive Agreement to Acquire Círculo de Crédito in Mexico", url: "https://investor.equifax.com/x", snippet: "", kind: "news", date: "3 months ago" },
    ],
  },
};

const byId = (brief: AccountBrief) => Object.fromEntries(fitSignals(brief).map((s) => [s.id, s]));

describe("fitSignals", () => {
  it("reads Relay: Metabase named in its own job post, no data roles, a Sep 2026 trigger, no intent", () => {
    const s = byId(relayBrief);
    expect(s.stack).toMatchObject({ reached: true, line: "Metabase, named in its own job post [1]" });
    // Its one job post is a customer success role; Claude is only Inferred.
    expect(s.investing).toMatchObject({ reached: false, line: "No open data roles found" });
    expect(s.trigger).toMatchObject({ reached: true, line: "Sep 2026: Relay raised $36 million led by International Paper [3]" });
    expect(s.intent).toMatchObject({ reached: false, line: "Not from public research. That's what discovery is for." });
  });

  it("reads Equifax: a confirmed stack, data roles on its board, the freshest dated trigger", () => {
    const s = byId(equifax);
    expect(s.stack).toMatchObject({ reached: true, line: "BigQuery + 6 more, named in its own job posts [1]" });
    expect(s.investing).toMatchObject({ reached: true, line: "Analytics Consultant + 3 more data roles, posted on its own job board [1]" });
    expect(s.trigger).toMatchObject({ reached: true, line: "Jul 2026: Signed definitive agreement to acquire Círculo de Crédito in Mexico for $750M [6]" });
    expect(s.intent.reached).toBe(false);
  });

  it("keeps the order and reaches nothing on an empty brief", () => {
    const signals = fitSignals({});
    expect(signals.map((s) => s.label)).toEqual(["Stack named", "Investing in data", "Dated trigger", "Stated intent"]);
    expect(signals.every((s) => !s.reached)).toBe(true);
    expect(signals[0].line).toBe("No data tool confirmed in a source");
    expect(signals[2].line).toBe("No dated trigger in the sources");
  });

  it("counts only Confirmed tools, and a role the motion read checked", () => {
    const brief: AccountBrief = {
      core_features: [
        { name: "BI tools", description: "", tool: "Looker", status: "Inferred", sources: [2] },
        { name: "Warehouse", description: "", tool: "Redshift", status: "Former", sources: [2] },
      ],
      research: { provider: "firecrawl", sources: [{ id: 2, title: "Principal Data Engineer at Acme — Charlotte, NC", url: "https://example.com/j", snippet: "", kind: "jobs" }] },
      motion: {
        label: "Internal",
        internal: { sources: [2], evidence: [{ source: 2, signal: "Principal Data Engineer role", quote: "Principal Data Engineer" }], clock: "", buyer: "", question: "" },
        embedded: { sources: [], evidence: [], clock: "", buyer: "", question: "" },
      },
    };
    const s = byId(brief);
    expect(s.stack.reached).toBe(false);
    expect(s.investing).toMatchObject({ reached: true, line: "Principal Data Engineer, in its job posts [2]" });
  });

  it("tells data roles from other roles", () => {
    expect(roleOf("Senior Director, Data Operations Center (DOC) at Equifax (Workday job post)")).toBe("Senior Director, Data Operations Center");
    for (const r of ["Data Engineer", "Analytics Consultant", "Head of Data", "Senior Director, Data Operations Center", "Generative AI Engineer"]) expect(isDataRole(r)).toBe(true);
    for (const r of ["Director, Customer Success Enablement", "Manager of Revenue Operations", "Account Executive"]) expect(isDataRole(r)).toBe(false);
  });

  it("clips a long why-now line at its first clause, never inside brackets", () => {
    expect(clip("7 Cedars Resort Properties expanded its Agilysys footprint (PMS, POS, gaming) citing integration and reduced manual work as drivers")).toBe(
      "7 Cedars Resort Properties expanded its Agilysys footprint (PMS, POS, gaming) citing…",
    );
    expect(clip("Short line.")).toBe("Short line");
  });
});

describe("Why Fit popover", () => {
  it("opens from the grade, shows the reason and the ladder, and closes on Escape", async () => {
    const sources = relayBrief.research?.sources ?? [];
    render(<AccountHero company="Relay" domain="relaypro.com" brief={relayBrief} sources={sources} sellerName="Omni" whys={{}} />);
    const trigger = screen.getByRole("button", { name: /fit for the embedded motion/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Why Fit C?" });
    expect(within(dialog).getByText(/Relay clearly ships customer-facing analytics/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/\[2\]/)).not.toBeInTheDocument();
    for (const label of ["Stack named", "Investing in data", "Dated trigger", "Stated intent"]) expect(within(dialog).getByText(label)).toBeInTheDocument();
    expect(within(dialog).getAllByText("Reached")).toHaveLength(2);
    expect(within(dialog).getAllByText("Not reached")).toHaveLength(2);
    // The citation is the numbered source chip, linking out.
    expect(within(dialog).getByRole("link", { name: "1" })).toHaveAttribute("href", sources.find((s) => s.id === 1)?.url);
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
