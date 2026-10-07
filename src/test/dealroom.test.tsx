import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AccountBrief } from "@/components/account/AccountViews";
import type { SavedReport } from "@/components/account/explorer/savedRuns";

// The Supabase client: function calls and the shared-report RPC, recorded.
const invoke = vi.fn();
const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

import DealRoom from "@/pages/DealRoom";
import { DealRoomModule } from "@/components/territory/modules/DealRoomModule";
import { toRow } from "@/components/territory/model";
import { buildClaims, claimQuestions, planDiff, stackNoun, tally } from "@/components/territory/dealroom/claims";
import { getSeller } from "@/lib/sellers";

const brief: AccountBrief = {
  lens: "account",
  seller: "omni",
  company: "Acme Outfitters",
  research: {
    provider: "firecrawl",
    sources: [
      { id: 1, title: "Data Engineer at Acme Outfitters", url: "https://example.com/job", snippet: "", kind: "jobs", via: "greenhouse" },
      { id: 2, title: "Acme raises $20M", url: "https://example.com/news", snippet: "", kind: "news", date: "2026-09-02" },
      { id: 3, title: "Another Acme", url: "https://example.com/other", snippet: "", kind: "stack", off_topic: true },
      { id: 4, title: "Acme moves to Looker", url: "https://example.com/looker", snippet: "", kind: "stack" },
    ],
  },
  account_line: "Acme Outfitters is an outdoor retailer growing its data team [1].",
  revenue_model: [
    "2026-09: Raised $20M led by Example Ventures [2].",
    "2026-08: Hired Dana Whitfield as Chief Data Officer [1].",
    "2026-07: The company opened a distribution center [1, 3].",
    "2026-05: Launched a loyalty app [4].",
    "2026-03: Job post for an Analytics Engineer opened [1].",
    "Date not found: Opened a new store.",
  ].join("\n"),
  core_features: [
    { name: "Warehouse", tool: "Snowflake", status: "Confirmed", sources: [1], description: "" },
    { name: "Warehouse", tool: "Snowflake (Enterprise)", status: "Confirmed", sources: [4], description: "" },
    { name: "Transformation", tool: "dbt", status: "Inferred", sources: [3], description: "" },
    { name: "BI tools", tool: "Tableau", status: "Former", sources: [4], description: "Moved off it." },
    { name: "BI tools", tool: "Looker", status: "Confirmed", sources: [4], description: "" },
    { name: "AI", tool: "", status: "Not found", sources: [], description: "" },
    { name: "Embedded analytics", tool: "", status: "Inferred", sources: [], description: "" },
  ],
  people: [{ name: "Dana Whitfield", role: "Chief Data Officer", source: 1 }],
  start_with: { role: "Head of Data", why: "Owns the stack [1]." },
  discovery_questions: ["Who owns Looker today?"],
  migration_objection: { objection: "We just rolled out Looker.", honest_answer: "Migration takes work." },
  fit: { grade: "B", motion: "Internal", reason: "Hiring, no trigger." },
  motion: {
    label: "Internal",
    internal: { sources: [1, 3], evidence: [], clock: "", buyer: "", question: "Who renews Looker?" },
    embedded: { sources: [4], evidence: [], clock: "", buyer: "", question: "" },
  },
  customer_list: { on_list: false, sentence: "Acme Outfitters is not on Omni's public customer list." },
};

const reportFor = (id: string, b: AccountBrief = brief, autoAnalysis: SavedReport["auto_analysis"] = null): SavedReport => ({
  id,
  idea: "Acme Outfitters (acme.example)",
  brief: b,
  lovable_prompt: "FIRST-CALL PLAN: Acme\nWHO TO START WITH\nHead of Data",
  auto_analysis: autoAnalysis,
  created_at: "2026-10-06T09:00:00.000Z",
});

beforeEach(() => {
  invoke.mockReset();
  rpc.mockReset();
  window.localStorage.clear();
});

describe("Deal Room claims", () => {
  const claims = buildClaims(brief);

  it("builds stable ids: stack lines, the motion, dated why-now items", () => {
    expect(claims.map((c) => c.id)).toEqual([
      "stack:warehouse:snowflake",
      "stack:transformation:dbt",
      "stack:bi-tools:tableau",
      "stack:bi-tools:looker",
      "motion",
      "why:2026-09:0",
      "why:2026-07:2",
      "why:2026-05:3",
    ]);
    expect(buildClaims(brief).map((c) => c.id)).toEqual(claims.map((c) => c.id));
    expect(claims.map((c) => c.num)).toEqual(["01", "02", "03", "04", "05", "06", "07", "08"]);
  });

  it("phrases stack lines as '<Tool> as your <category>'", () => {
    expect(claims.slice(0, 4).map((c) => c.text)).toEqual([
      "Snowflake as your warehouse",
      "dbt as your transformation tool",
      "Tableau as your former BI tool",
      "Looker as your BI tool",
    ]);
    expect(claims[0].status).toBe("Confirmed");
    // Two lines for one product merge; off-topic sources are never cited.
    expect(claims[0].sources).toEqual([1, 4]);
    expect(claims[1].sources).toEqual([]);
    expect(["Warehouse", "Transformation", "BI tools", "AI", "Embedded analytics"].map(stackNoun)).toEqual([
      "warehouse",
      "transformation tool",
      "BI tool",
      "AI tooling",
      "embedded analytics",
    ]);
  });

  it("reads the motion, and skips it when Unclear", () => {
    const motion = claims.find((c) => c.id === "motion")!;
    expect(motion.text).toBe("Your data team builds analytics for your own teams");
    expect(motion.sources).toEqual([1]);
    const both = buildClaims({ ...brief, motion: { ...brief.motion!, label: "Both" } }).find((c) => c.id === "motion")!;
    expect(both.text).toBe("Your data team builds analytics for your own teams and inside your product for your customers");
    expect(both.sources).toEqual([1, 4]);
    expect(buildClaims({ ...brief, motion: { ...brief.motion!, label: "Unclear" }, fit: { grade: "C", motion: "Unclear" } }).some((c) => c.kind === "motion")).toBe(false);
  });

  it("keeps at most three dated why-now items, none naming a person", () => {
    const why = claims.filter((c) => c.kind === "why");
    expect(why).toHaveLength(3);
    expect(why[0].text).toBe("We read that Acme Outfitters raised $20M led by Example Ventures");
    expect(why[0].sources).toEqual([2]);
    expect(why[1].text).toBe("We read that the company opened a distribution center");
    expect(why[1].sources).toEqual([1]);
    expect(why.every((c) => c.date)).toBe(true);
    // The fourth dated item is past the cap; its phrasing still reads as a sentence.
    const all = buildClaims({ ...brief, people: [], revenue_model: "2026-03: Job post for an Analytics Engineer opened [1]." });
    expect(all.find((c) => c.kind === "why")?.text).toBe("We read that a job post for an Analytics Engineer opened");
  });

  it("never carries the fit grade, critics, objections, the plan, questions, people or the customer list", () => {
    const all = JSON.stringify(claims);
    for (const internal of ["Hiring, no trigger", "We just rolled out Looker", "Who owns Looker today", "Who renews Looker", "Head of Data", "Dana Whitfield", "Whitfield", "customer list", "FIRST-CALL"]) {
      expect(all).not.toContain(internal);
    }
    expect(claims.every((c) => /^(stack:|why:|motion$)/.test(c.id) && c.id.length <= 120)).toBe(true);
  });

  it("turns answers into a plan diff and answered questions", () => {
    const responses = {
      "stack:transformation:dbt": { answer: "right" as const, at: "2026-10-07T10:00:00.000Z" },
      "stack:warehouse:snowflake": { answer: "fix" as const, text: "BigQuery since June", at: "2026-10-07T10:01:00.000Z" },
      motion: { answer: "unsure" as const, at: "2026-10-07T10:02:00.000Z" },
    };
    expect(tally(claims, responses)).toEqual({ total: 8, answered: 3, right: 1, fix: 1, unsure: 1 });
    expect(planDiff(claims, responses)).toEqual([
      expect.objectContaining({ id: "stack:warehouse:snowflake", before: "Snowflake · Confirmed from a public source", after: 'Corrected: "BigQuery since June"', corrected: true }),
      expect.objectContaining({ id: "stack:transformation:dbt", before: "dbt · Inferred", after: "dbt · Confirmed by the account", corrected: false }),
    ]);
    const q = claimQuestions(claims, responses);
    expect(q.answered.map((x) => x.question)).toEqual(["Is Snowflake their warehouse?", "Is dbt their transformation tool?"]);
    expect(q.open.map((x) => x.question)).toEqual(["Who do they build analytics for?"]);
  });
});

function renderPage(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/deal/${id}`]}>
      <Routes>
        <Route path="/deal/:id" element={<DealRoom />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Deal Room prospect page", () => {
  it("shows the claims, and saves an answer through the deal-room function", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    rpc.mockResolvedValue({ data: reportFor(id), error: null });
    invoke.mockResolvedValue({ data: { ok: true, deal_room: {} }, error: null });
    renderPage(id);

    expect(await screen.findByRole("heading", { name: /Here's what we think we know about Acme Outfitters/ })).toBeInTheDocument();
    expect(screen.getAllByText("Unofficial. Built from public sources. Not affiliated with Omni.").length).toBeGreaterThan(0);
    expect(screen.getByText("checked", { exact: false })).toHaveTextContent("0 of 8 checked");
    // The boundary: nothing internal reaches the page.
    expect(document.body).not.toHaveTextContent("Hiring, no trigger");
    expect(document.body).not.toHaveTextContent("We just rolled out Looker");
    expect(document.body).not.toHaveTextContent("Dana Whitfield");

    const first = screen.getByRole("group", { name: "Is claim 1 right?" });
    fireEvent.click(within(first).getByRole("button", { name: /Right/ }));
    expect(within(first).getByRole("button", { name: /Right/ })).toHaveAttribute("aria-pressed", "true");
    expect(invoke).toHaveBeenCalledWith(
      "deal-room",
      expect.objectContaining({ body: { report_id: id, claim_id: "stack:warehouse:snowflake", answer: "right" } }),
    );
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("checked", { exact: false })).toHaveTextContent("1 of 8 checked");

    // Fix: an inline editor, then the corrected text and an optional note.
    const second = screen.getByRole("group", { name: "Is claim 2 right?" });
    fireEvent.click(within(second).getByRole("button", { name: /Fix/ }));
    fireEvent.change(screen.getByLabelText("What should it say?"), { target: { value: "dbt Cloud, since spring" } });
    fireEvent.change(screen.getByLabelText(/Note/), { target: { value: "Ask our analytics lead" } });
    fireEvent.click(screen.getByRole("button", { name: "Save fix" }));
    expect(invoke).toHaveBeenLastCalledWith(
      "deal-room",
      expect.objectContaining({ body: { report_id: id, claim_id: "stack:transformation:dbt", answer: "fix", text: "dbt Cloud, since spring", note: "Ask our analytics lead" } }),
    );
    expect(screen.getByText("dbt Cloud, since spring")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("Saved")).toHaveLength(2));
  });

  it("keeps the answer on this device when the function can't be reached", async () => {
    const id = "22222222-2222-4222-8222-222222222222";
    rpc.mockResolvedValue({ data: reportFor(id), error: null });
    invoke.mockResolvedValue({ data: null, error: new Error("Failed to send a request to the Edge Function") });
    renderPage(id);

    const group = await screen.findByRole("group", { name: "Is claim 5 right?" });
    fireEvent.click(within(group).getByRole("button", { name: /Not sure/ }));
    expect(await screen.findByText("Saved on this device")).toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(`vibeco.deal.${id}`) ?? "{}")).toEqual({ motion: expect.objectContaining({ answer: "unsure" }) });
  });

  it("says the brief isn't available for a run that isn't an account brief", async () => {
    const id = "33333333-3333-4333-8333-333333333333";
    rpc.mockResolvedValue({ data: reportFor(id, { ...brief, lens: "idea" }), error: null });
    renderPage(id);
    expect(await screen.findByRole("heading", { name: "This brief isn't available" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /Is claim/ })).not.toBeInTheDocument();
  });
});

describe("Deal Room seller view", () => {
  const id = "44444444-4444-4444-8444-444444444444";
  const seller = getSeller("omni")!;
  const report = reportFor(id, brief, {
    perspectives: [{ persona: "skeptic", headline: "Not this budget cycle", perspective: "" }],
  });
  const row = toRow({ company: "Acme Outfitters (acme.example)", reportId: id }, report);
  const dealRoom = {
    responses: {
      "stack:warehouse:snowflake": { answer: "right", at: "2026-10-07T10:00:00.000Z" },
      "stack:bi-tools:looker": { answer: "fix", text: "Looker is being replaced this quarter", note: "Ask about the rollout", at: "2026-10-07T10:01:00.000Z" },
      motion: { answer: "unsure", at: "2026-10-07T10:02:00.000Z" },
    },
    updated_at: "2026-10-07T10:02:00.000Z",
  };

  function renderModule(search = "") {
    rpc.mockResolvedValue({ data: report, error: null });
    invoke.mockResolvedValue({ data: { deal_room: dealRoom }, error: null });
    return render(
      <MemoryRouter initialEntries={[`/for/omni/deal/${id}${search}`]}>
        <DealRoomModule seller={seller} territory={{ rows: [row], loading: false, missing: [] }} reportId={id} />
      </MemoryRouter>,
    );
  }

  it("renders the answers as discovery notes and the plan diff", async () => {
    renderModule("?view=seller");
    expect(await screen.findByText("Corrected: Looker is being replaced this quarter")).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith("deal-room", expect.objectContaining({ body: { report_id: id, read: true } }));
    expect(screen.getByText(/of 8 answered/)).toHaveTextContent("3 of 8 answered · 1 correction");
    expect(screen.getAllByText("Confirmed by the account").length).toBeGreaterThan(0);
    expect(screen.getByText("Note: Ask about the rollout")).toBeInTheDocument();
    expect(screen.getByText("Ask on the call.")).toBeInTheDocument();

    const diff = screen.getByRole("heading", { name: "The plan, before and after" }).closest("section")!;
    expect(within(diff).getByText("Snowflake · Confirmed from a public source")).toBeInTheDocument();
    expect(within(diff).getByText("Snowflake · Confirmed by the account")).toBeInTheDocument();
    expect(within(diff).getByText('Corrected: "Looker is being replaced this quarter"')).toBeInTheDocument();

    const answered = screen.getByRole("heading", { name: "Questions now answered" }).closest("section")!;
    expect(within(answered).getByText("Is Snowflake their warehouse?")).toBeInTheDocument();
    expect(within(answered).getByText("Who do they build analytics for?")).toBeInTheDocument();

    const boundary = screen.getByRole("heading", { name: "The prospect never sees" }).closest("section")!;
    expect(boundary).toHaveTextContent("Fit grade");
    expect(boundary).toHaveTextContent("Not this budget cycle");
    expect(boundary).toHaveTextContent("synthetic");
  });

  it("previews exactly what the prospect sees, read-only", async () => {
    renderModule();
    const preview = await screen.findByRole("region", { name: "Preview of the page Acme Outfitters sees" });
    expect(within(preview).getByRole("heading", { name: /Here's what we think we know about Acme Outfitters/ })).toBeInTheDocument();
    await waitFor(() => expect(within(preview).getByText("checked", { exact: false })).toHaveTextContent("3 of 8 checked"));
    for (const b of within(preview).getAllByRole("button")) expect(b).toBeDisabled();
    expect(preview).not.toHaveTextContent("Not this budget cycle");
    expect(screen.getByText(`${window.location.origin}/deal/${id}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Seller view" }));
    expect(await screen.findByRole("heading", { name: "The plan, before and after" })).toBeInTheDocument();
  });
});
